import logging
import os
import re
import io
import uuid as uuid_pkg
from datetime import datetime, date
from uuid import UUID
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Header, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, text, func

from app.database import get_db
from app.models.user import User
from app.models.company import Company
from app.models.engineer import Engineer
from app.models.skill import Skill
from app.models.schedule import Schedule
from app.models.visa import Visa
from app.models.travel import Travel
from app.models.performance import Performance
from app.models.leave import Leave
from app.services.auth_service import get_current_user, enforce_company_isolation, enforce_write_permission
from app.services.audit_service import log_audit
from app.services import bulk_upload_service
from app.schemas.bulk_upload import BulkUploadResponse
import openpyxl

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/upload", tags=["upload"], dependencies=[Depends(get_current_user)])

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
TEMP_REPORTS_DIR = "backend/app/temp_reports"

def parse_date(v):
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    if not v:
        return None
    v_str = str(v).strip()
    if not v_str:
        return None
    # If it has time component, strip it
    if " " in v_str:
        v_str = v_str.split(" ")[0]
    # Try multiple common formats
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(v_str, fmt).date()
        except ValueError:
            continue
    raise ValueError("Invalid date format")

def parse_experience(v):
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    v_str = str(v).strip()
    if not v_str:
        return None
    # Strip trailing + or whitespace or dots
    v_clean = v_str.rstrip("+").rstrip(".").strip()
    # Check if ends with "years", "year", "yrs", "yr" (case-insensitive)
    match = re.match(r"^([\d.]+)\s*(?:years?|yrs?\.?)$", v_clean, re.IGNORECASE)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            pass
    # Otherwise check if it can be directly cast to float
    try:
        return float(v_clean)
    except ValueError:
        raise ValueError("Must be a valid numeric experience value")

def clean_val(v):
    if v is None:
        return None
    if isinstance(v, str):
        v_stripped = v.strip()
        return v_stripped if v_stripped != "" else None
    return v

# Normalize names (strip, lowercase, replace punctuation/spaces/underscores)
def normalize_header(name):
    if name is None:
        return ""
    return str(name).strip().lower().replace(" ", "").replace("_", "").replace("-", "").replace(".", "").replace("(", "").replace(")", "").replace("/", "").replace("#", "")

def norm_str(v):
    if v is None:
        return ""
    return str(v).strip().lower()

def norm_date(v):
    if v is None:
        return ""
    if isinstance(v, datetime):
        return v.date().strftime("%Y-%m-%d")
    if isinstance(v, date):
        return v.strftime("%Y-%m-%d")
    if isinstance(v, str):
        try:
            return parse_date(v).strftime("%Y-%m-%d")
        except Exception:
            return v.strip().lower()
    return str(v).strip().lower()

def norm_uuid(v):
    if v is None:
        return ""
    return str(v).strip().lower()

HEADER_MAP = {
    "engineername": "engineer_name",
    "name": "engineer_name",
    "engineer": "engineer_name",
    "goesby": "goes_by",
    "preferredname": "goes_by",
    "lamid": "employee_id",
    "employeeid": "employee_id",
    "empid": "employee_id",
    "orbitid": "orbit_id",
    "orbit": "orbit_id",
    "level": "level",
    "engineerlevel": "level",
    "dateofjoining": "date_of_joining",
    "joiningdate": "date_of_joining",
    "doj": "date_of_joining",
    "primarytooltype": "primary_tool",
    "primarytool": "primary_tool",
    "tooltype": "primary_tool",
    "tool": "primary_tool",
    "lamexperience": "customer_experience",
    "customerexperience": "customer_experience",
    "industryexperience": "industry_experience",
    "status": "status",
    "engineerstatus": "status",
    "email": "email",
    "emailaddress": "email",
    "phonenumber": "phone_number",
    "phone": "phone_number",
    "mobile": "phone_number",
    "contact": "phone_number",
    "contactnumber": "phone_number"
}

def map_engineer_header(raw_header: str) -> Optional[str]:
    if not raw_header:
        return None
    norm = normalize_header(raw_header)
    
    if norm in HEADER_MAP:
        return HEADER_MAP[norm]
        
    # Pattern matching for experience columns
    if ("customer" in norm or "lam" in norm or "cust" in norm) and ("exp" in norm or "experience" in norm):
        return "customer_experience"
        
    if ("industry" in norm or "ind" in norm) and ("exp" in norm or "experience" in norm):
        return "industry_experience"
        
    if "date" in norm and ("join" in norm or "doj" in norm):
        return "date_of_joining"
        
    if "orbit" in norm:
        return "orbit_id"
        
    if "email" in norm:
        return "email"
        
    if "phone" in norm or "mobile" in norm or "contact" in norm:
        return "phone_number"
        
    if "level" in norm:
        return "level"
        
    if "status" in norm:
        return "status"
        
    if "tool" in norm:
        return "primary_tool"
        
    if ("employee" in norm or "emp" in norm or "lam" in norm) and ("id" in norm or "num" in norm):
        return "employee_id"
        
    if "name" in norm and "engineer" in norm:
        return "engineer_name"
        
    return None

def parse_boolean(v):
    if v is None:
        return None
    if isinstance(v, bool):
        return v
    if isinstance(v, (int, float)):
        if int(v) == 1:
            return True
        if int(v) == 0:
            return False
        raise ValueError("Invalid boolean integer value")
    v_str = str(v).strip().lower()
    if not v_str:
        return None
    if v_str in ("yes", "y", "true", "t", "1"):
        return True
    if v_str in ("no", "n", "false", "f", "0"):
        return False
    raise ValueError("Invalid boolean representation")

SKILL_HEADER_MAP = {
    "orbitid": "orbit_id",
    "country": "country",
    "fab": "fab",
    "wafersize": "wafer_size",
    "tooltype": "tool_type",
    "startdate": "start_date",
    "enddate": "end_date",
    "#oftools": "number_of_tools",
    "numberoftools": "number_of_tools",
    "numoftools": "number_of_tools",
    "oftools": "number_of_tools",
    "role": "role",
    "previousprocessstartupexperience": "previous_process_startup",
    "previousprocessstartup": "previous_process_startup",
    "previouscmpmexperience": "previous_cm_pm",
    "previouscmpm": "previous_cm_pm",
    "previouscm/pmexperience": "previous_cm_pm",
    "previouscm/pm": "previous_cm_pm",
    "readyforprimaryrole": "ready_for_primary_role",
    "comments": "comments"
}

SCHEDULE_HEADER_MAP = {
    "orbitid": "orbit_id",
    "supporttype": "support_type",
    "country": "country",
    "fabcity": "fab_city",
    "fabsite": "fab_site",
    "startdate": "start_date",
    "enddate": "end_date",
    "schedulestatus": "schedule_status",
    "remarks": "remarks"
}

VISA_HEADER_MAP = {
    "orbitid": "orbit_id",
    "country": "country",
    "visatype": "visa_type",
    "type": "visa_type",
    "appliedon": "applied_on",
    "applieddate": "applied_on",
    "startdate": "visa_start_date",
    "visastartdate": "visa_start_date",
    "issuedate": "visa_start_date",
    "enddate": "visa_end_date",
    "visaenddate": "visa_end_date",
    "expirydate": "visa_end_date",
    "expirationdate": "visa_end_date",
    "comments": "comments",
    "remarks": "comments",
    "owner": "owner",
    "owneremail": "owner",
    "ownername": "owner"
}

TRAVEL_HEADER_MAP = {
    "orbitid": "orbit_id",
    "engineername": "engineer_name",
    "bookingdate": "booking_date",
    "traveldate": "travel_date",
    "departuredate": "travel_date",
    "flightdate": "travel_date",
    "purpose": "purpose",
    "travelpurpose": "purpose",
    "comments": "comments",
    "remarks": "comments",
    "notes": "comments",
    "supporttype": "support_type",
    "country": "country",
    "fabcity": "fab_city",
    "fabsite": "fab_site",
    "scheduleid": "schedule_id"
}

PERFORMANCE_HEADER_MAP = {
    "orbitid": "orbit_id",
    "engineername": "engineer_name",
    "actualstartdate": "actual_start_date",
    "startdate": "actual_start_date",
    "actualenddate": "actual_end_date",
    "enddate": "actual_end_date",
    "escalation": "escalation",
    "escalated": "escalation",
    "escalationreason": "escalation_reason",
    "reason": "escalation_reason",
    "feedback": "feedback",
    "notes": "feedback",
    "comments": "feedback",
    "score": "score",
    "rating": "score",
    "attachment": "attachment",
    "supporttype": "support_type",
    "country": "country",
    "fabcity": "fab_city",
    "fabsite": "fab_site",
    "scheduleid": "schedule_id"
}

LEAVE_HEADER_MAP = {
    "orbitid": "orbit_id",
    "engineername": "engineer_name",
    "leavetype": "leave_type",
    "type": "leave_type",
    "category": "leave_type",
    "requesteddate": "requested_date",
    "absencedate": "requested_date",
    "startdate": "requested_date",
    "leavedate": "requested_date",
    "requestedon": "requested_on",
    "submissiondate": "requested_on",
    "submittedon": "requested_on",
    "approvalstatus": "approval_status",
    "status": "approval_status"
}

@router.post("")
async def bulk_upload(
    file: UploadFile = File(...),
    module_id: str = Form(...),
    x_company_id: Optional[str] = Header(None, alias="X-Company-ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Process Excel/CSV file bulk upload.
    Validate rows against requirements, insert valid rows into the database,
    and generate an invalidation report file.
    """
    enforce_write_permission(current_user)

    # 1. Derive target company_id
    target_company_id = None
    if x_company_id:
        try:
            target_company_id = UUID(x_company_id)
        except ValueError:
            # Look up company by code or name
            comp = db.scalars(
                select(Company).where(
                    (Company.company_code == x_company_id) | 
                    (Company.company_name.ilike(x_company_id))
                )
            ).first()
            if comp:
                target_company_id = comp.company_id

    # Non-global admins can only upload into their own company
    if current_user.role != 'Global Admin':
        target_company_id = current_user.company_id
    elif target_company_id is None:
        # Global Admin fallback
        comp = db.scalars(select(Company)).first()
        if comp:
            target_company_id = comp.company_id

    # Verify company exists
    company = db.get(Company, target_company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target company tenant not found."
        )

    # Verify company isolation
    enforce_company_isolation(db, current_user, target_company_id)

    upload_type = "engineers"
    if module_id == "up-skills":
        upload_type = "skills"
    elif module_id == "up-schedule":
        upload_type = "schedules"
    elif module_id == "up-visa":
        upload_type = "visas"
    elif module_id == "up-travel":
        upload_type = "travel"
    elif module_id == "up-performance":
        upload_type = "performance"
    elif module_id == "up-leave":
        upload_type = "leaves"
    elif module_id != "up-engineers":
        upload_type = module_id

    # Create BulkUpload audit record
    db_upload = bulk_upload_service.create_bulk_upload(
        db,
        company_id=target_company_id,
        uploaded_by=current_user.user_id,
        file_name=file.filename,
        upload_type=upload_type
    )
    upload_id = db_upload.upload_id

    log_audit(
        db=db,
        user_id=current_user.user_id,
        company_id=target_company_id,
        action="BULK_UPLOAD",
        entity_type="BulkUpload",
        entity_id=upload_id,
        description=f"Bulk upload performed for {upload_type}: {file.filename}"
    )

    try:
        # If it is not engineers roster, and not up-skills, up-schedule, up-visa, up-travel, up-performance, or up-leave, return default message
        if module_id != "up-engineers" and module_id != "up-skills" and module_id != "up-schedule" and module_id != "up-visa" and module_id != "up-travel" and module_id != "up-performance" and module_id != "up-leave":
            bulk_upload_service.update_bulk_upload(
                db,
                upload_id=upload_id,
                status="COMPLETED",
                total_rows=0,
                valid_rows=0,
                error_rows=0
            )
            return {
                "success": True,
                "rowsProcessed": 0,
                "errorsCount": 0,
                "message": f"Upload validation succeeded. Module {module_id} is currently in read-only validation state."
            }

        if module_id == "up-skills":
            import time
            start_time = time.perf_counter()

            try:
                contents = await file.read()
                wb = openpyxl.load_workbook(io.BytesIO(contents))
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to parse Excel file. Please ensure it is a valid .xlsx file."
                )

            # Case-insensitive detection of the "Skill Matrix" sheet
            skill_sheet_name = None
            for name in wb.sheetnames:
                if name.strip().lower() == "skill matrix":
                    skill_sheet_name = name
                    break

            if not skill_sheet_name:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Excel workbook must contain a Skill Matrix sheet."
                )

            sheet = wb[skill_sheet_name]
            
            # Map headers
            first_row = [sheet.cell(row=1, column=c).value for c in range(1, sheet.max_column + 1)]
            col_indices = {}
            for idx, val in enumerate(first_row):
                if val is not None:
                    norm = normalize_header(val)
                    mapped_field = SKILL_HEADER_MAP.get(norm)
                    if mapped_field:
                        col_indices[mapped_field] = idx + 1

            # Check required columns: orbit_id
            if "orbit_id" not in col_indices:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Required header 'Orbit ID' is missing from the Excel sheet."
                )

            # Gather all non-blank rows
            raw_rows = []
            for r in range(2, sheet.max_row + 1):
                # Check if blank
                is_blank = True
                for c in range(1, sheet.max_column + 1):
                    val = sheet.cell(row=r, column=c).value
                    if val is not None and str(val).strip() != "":
                        is_blank = False
                        break
                if is_blank:
                    continue

                row_dict = {"excel_row": r}
                
                # Retrieve original engineer name
                original_engineer_name = None
                for idx, val in enumerate(first_row):
                    if val is not None:
                        norm = normalize_header(val)
                        if norm == "engineername":
                            original_engineer_name = clean_val(sheet.cell(row=r, column=idx + 1).value)
                            break
                row_dict["original_engineer_name"] = original_engineer_name

                # Load fields from mapped headers
                for field, col_idx in col_indices.items():
                    row_dict[field] = clean_val(sheet.cell(row=r, column=col_idx).value)

                # Fill missing columns
                for field in SKILL_HEADER_MAP.values():
                    if field not in row_dict:
                        row_dict[field] = None

                raw_rows.append(row_dict)

            if not raw_rows:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="The Skill Matrix sheet is empty or contains no rows."
                )

            first_row_num = raw_rows[0]["excel_row"]
            last_row_num = raw_rows[-1]["excel_row"]
            logger.info(
                "Skill Matrix Parsing Details - Sheet Name: %s, Header Count: %d, Total Physical Rows: %d, Total Non-Empty Rows: %d, First Non-Empty Row: %d, Last Non-Empty Row: %d",
                skill_sheet_name,
                len(col_indices),
                sheet.max_row,
                len(raw_rows),
                first_row_num,
                last_row_num
            )
            t_excel = time.perf_counter()

            # Bulk Engineer Resolution
            unique_orbit_ids = {
                norm_str(row.get("orbit_id"))
                for row in raw_rows
                if row.get("orbit_id") and norm_str(row.get("orbit_id")) != ""
            }

            db_engineers = []
            if unique_orbit_ids:
                db_engineers = db.scalars(
                    select(Engineer).where(
                        func.lower(Engineer.orbit_id).in_(list(unique_orbit_ids)),
                        Engineer.company_id == target_company_id
                    )
                ).all()

            orbit_to_engineer = {
                norm_str(eng.orbit_id): (eng.engineer_id, eng.engineer_name)
                for eng in db_engineers
            }
            t_engineer = time.perf_counter()

            # Bulk Existing Skill Check
            resolved_engineer_ids = {
                val[0] for val in orbit_to_engineer.values()
            }

            db_skills = []
            if resolved_engineer_ids:
                db_skills = db.scalars(
                    select(Skill).where(
                        Skill.engineer_id.in_(list(resolved_engineer_ids))
                    )
                ).all()

            existing_skill_map = {}
            for s in db_skills:
                existing_key = (
                    norm_uuid(s.engineer_id),
                    norm_str(s.country),
                    norm_str(s.fab),
                    norm_str(s.wafer_size),
                    norm_str(s.tool_type),
                    norm_date(s.start_date),
                    norm_date(s.end_date)
                )
                existing_skill_map[existing_key] = s
            t_existing_lookup = time.perf_counter()

            errors_list = []
            duplicates_list = []
            existing_list = []
            unchanged_list = []
            valid_rows_to_insert = []
            seen_keys = set()

            total_rows = len(raw_rows)

            for row_dict in raw_rows:
                row_errors = []
                
                # 1. Validate required fields: orbit_id
                orbit_id = row_dict.get("orbit_id")
                if not orbit_id:
                    row_errors.append({
                        "field": "Orbit ID",
                        "value": "",
                        "error": "Orbit ID is required."
                    })
                    row_dict["errors"] = row_errors
                    errors_list.append(row_dict)
                    continue

                # 2. Resolve engineer using bulk lookup
                eng_info = orbit_to_engineer.get(norm_str(orbit_id))
                if not eng_info:
                    row_errors.append({
                        "field": "Orbit ID",
                        "value": str(orbit_id),
                        "error": f"Engineer with Orbit ID '{orbit_id}' does not exist in the selected company."
                    })
                    row_dict["errors"] = row_errors
                    errors_list.append(row_dict)
                    continue

                engineer_id, resolved_engineer_name = eng_info
                row_dict["engineer_id"] = engineer_id
                row_dict["resolved_engineer_name"] = resolved_engineer_name

                # 3. Parse and validate dates
                start_date = None
                start_date_val = row_dict.get("start_date")
                if start_date_val is not None:
                    try:
                        start_date = parse_date(start_date_val)
                    except ValueError:
                        row_errors.append({
                            "field": "Start Date",
                            "value": str(start_date_val),
                            "error": "Invalid start date format."
                        })

                end_date = None
                end_date_val = row_dict.get("end_date")
                if end_date_val is not None:
                    try:
                        end_date = parse_date(end_date_val)
                    except ValueError:
                        row_errors.append({
                            "field": "End Date",
                            "value": str(end_date_val),
                            "error": "Invalid end date format."
                        })

                if start_date and end_date and end_date < start_date:
                    row_errors.append({
                        "field": "End Date",
                        "value": str(end_date_val),
                        "error": "End date should not be earlier than start_date"
                    })

                # 4. Parse and validate number_of_tools
                number_of_tools = None
                number_of_tools_val = row_dict.get("number_of_tools")
                if number_of_tools_val is not None:
                    try:
                        num_val = float(number_of_tools_val)
                        if not num_val.is_integer() or num_val < 0:
                            raise ValueError()
                        number_of_tools = int(num_val)
                    except (ValueError, TypeError):
                        row_errors.append({
                            "field": "# of Tools",
                            "value": str(number_of_tools_val),
                            "error": "Number of Tools must be a non-negative integer."
                        })

                # 5. Parse booleans
                previous_process_startup = None
                val_startup = row_dict.get("previous_process_startup")
                if val_startup is not None:
                    try:
                        previous_process_startup = parse_boolean(val_startup)
                    except ValueError:
                        row_errors.append({
                            "field": "Previous Process Startup Experience",
                            "value": str(val_startup),
                            "error": "Invalid boolean value representation."
                        })

                previous_cm_pm = None
                val_cmpm = row_dict.get("previous_cm_pm")
                if val_cmpm is not None:
                    try:
                        previous_cm_pm = parse_boolean(val_cmpm)
                    except ValueError:
                        row_errors.append({
                            "field": "Previous CM/PM Experience",
                            "value": str(val_cmpm),
                            "error": "Invalid boolean value representation."
                        })

                ready_for_primary_role = None
                val_primary = row_dict.get("ready_for_primary_role")
                if val_primary is not None:
                    try:
                        ready_for_primary_role = parse_boolean(val_primary)
                    except ValueError:
                        row_errors.append({
                            "field": "Ready for Primary Role",
                            "value": str(val_primary),
                            "error": "Invalid boolean value representation."
                        })

                if row_errors:
                    row_dict["errors"] = row_errors
                    errors_list.append(row_dict)
                    continue

                row_dict["start_date"] = start_date
                row_dict["end_date"] = end_date
                row_dict["number_of_tools"] = number_of_tools
                row_dict["previous_process_startup"] = previous_process_startup
                row_dict["previous_cm_pm"] = previous_cm_pm
                row_dict["ready_for_primary_role"] = ready_for_primary_role

                # 6. Duplicate row detection in Excel sheet
                country = row_dict.get("country")
                fab = row_dict.get("fab")
                wafer_size = row_dict.get("wafer_size")
                tool_type = row_dict.get("tool_type")

                row_key = (
                    norm_uuid(engineer_id),
                    norm_str(country),
                    norm_str(fab),
                    norm_str(wafer_size),
                    norm_str(tool_type),
                    norm_date(start_date),
                    norm_date(end_date)
                )

                if row_key in seen_keys:
                    row_dict["duplicate_key"] = f"EngineerID: {engineer_id}, Tool: {tool_type}, Fab: {fab}"
                    duplicates_list.append(row_dict)
                    continue
                seen_keys.add(row_key)

                # 7. Check if already exists in DB for Row-Level Upsert & Change Detection
                if row_key in existing_skill_map:
                    db_skill = existing_skill_map[row_key]
                    row_dict["existing_skill"] = db_skill
                    changes = []

                    if "number_of_tools" in col_indices and row_dict.get("number_of_tools") != db_skill.number_of_tools:
                        changes.append(f"Number of Tools: '{db_skill.number_of_tools}' -> '{row_dict.get('number_of_tools')}'")
                        db_skill.number_of_tools = row_dict.get("number_of_tools")

                    if "role" in col_indices and row_dict.get("role") != db_skill.role:
                        changes.append(f"Role: '{db_skill.role}' -> '{row_dict.get('role')}'")
                        db_skill.role = row_dict.get("role")

                    if "previous_process_startup" in col_indices and row_dict.get("previous_process_startup") != db_skill.previous_process_startup:
                        changes.append(f"Previous Process Startup: '{db_skill.previous_process_startup}' -> '{row_dict.get('previous_process_startup')}'")
                        db_skill.previous_process_startup = row_dict.get("previous_process_startup")

                    if "previous_cm_pm" in col_indices and row_dict.get("previous_cm_pm") != db_skill.previous_cm_pm:
                        changes.append(f"Previous CM/PM: '{db_skill.previous_cm_pm}' -> '{row_dict.get('previous_cm_pm')}'")
                        db_skill.previous_cm_pm = row_dict.get("previous_cm_pm")

                    if "ready_for_primary_role" in col_indices and row_dict.get("ready_for_primary_role") != db_skill.ready_for_primary_role:
                        changes.append(f"Ready for Primary Role: '{db_skill.ready_for_primary_role}' -> '{row_dict.get('ready_for_primary_role')}'")
                        db_skill.ready_for_primary_role = row_dict.get("ready_for_primary_role")

                    if "comments" in col_indices and row_dict.get("comments") != db_skill.comments:
                        changes.append(f"Comments: '{db_skill.comments}' -> '{row_dict.get('comments')}'")
                        db_skill.comments = row_dict.get("comments")

                    if changes:
                        db_skill.updated_at = datetime.utcnow()
                        row_dict["update_status"] = "UPDATED"
                        row_dict["changed_fields"] = "; ".join(changes)
                        existing_list.append(row_dict)
                    else:
                        row_dict["update_status"] = "UNCHANGED"
                        row_dict["changed_fields"] = "No fields modified"
                        unchanged_list.append(row_dict)
                else:
                    valid_rows_to_insert.append(row_dict)

            t_validation = time.perf_counter()

            # Update BulkUpload stats
            bulk_upload_service.update_bulk_upload(
                db,
                upload_id=upload_id,
                total_rows=total_rows,
                valid_rows=len(valid_rows_to_insert),
                error_rows=len(errors_list),
                duplicate_rows=len(duplicates_list),
                existing_rows=len(existing_list),
                warning_rows=0,
                status="READY"
            )

            # Transition to IMPORTING
            bulk_upload_service.update_bulk_upload(
                db,
                upload_id=upload_id,
                status="IMPORTING"
            )

            imported_count = 0
            failed_count = 0
            try:
                skills_to_add = []
                for item in valid_rows_to_insert:
                    db_skill = Skill(
                        skill_id=uuid_pkg.uuid4(),
                        engineer_id=item["engineer_id"],
                        country=item["country"],
                        fab=item["fab"],
                        wafer_size=item["wafer_size"],
                        tool_type=item["tool_type"],
                        start_date=item["start_date"],
                        end_date=item["end_date"],
                        number_of_tools=item["number_of_tools"],
                        role=item["role"],
                        previous_process_startup=item["previous_process_startup"],
                        previous_cm_pm=item["previous_cm_pm"],
                        ready_for_primary_role=item["ready_for_primary_role"],
                        comments=item["comments"],
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    skills_to_add.append(db_skill)
                if skills_to_add:
                    db.add_all(skills_to_add)
                db.commit()
                imported_count = len(valid_rows_to_insert) + len(existing_list)
            except Exception as insert_err:
                db.rollback()
                failed_count = len(valid_rows_to_insert) + len(existing_list)
                bulk_upload_service.update_bulk_upload(
                    db,
                    upload_id=upload_id,
                    status="FAILED",
                    failed_rows=failed_count
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Database insertion failed: {str(insert_err)}"
                )
            t_insert = time.perf_counter()

            # 8. Generate report workbook
            report_wb = openpyxl.Workbook()
            ws_summary = report_wb.active
            ws_summary.title = "Summary"
            ws_summary.append(["ORMP Skill Matrix Bulk Ingestion Report"])
            ws_summary.append([])
            ws_summary.append(["File Name", file.filename])
            ws_summary.append(["Uploaded By", current_user.full_name])
            ws_summary.append(["Upload Date", datetime.now().strftime("%Y-%m-%d %H:%M:%S")])
            ws_summary.append(["Target Company", company.company_name])
            ws_summary.append(["Company UUID", str(company.company_id)])
            ws_summary.append([])
            ws_summary.append(["Metric", "Count"])
            ws_summary.append(["Total Rows", total_rows])
            ws_summary.append(["Inserted Records", len(valid_rows_to_insert)])
            ws_summary.append(["Updated Records", len(existing_list)])
            ws_summary.append(["Unchanged Records", len(unchanged_list)])
            ws_summary.append(["Error Rows", len(errors_list)])
            ws_summary.append(["Duplicate Rows", len(duplicates_list)])
            ws_summary.append(["Warning Rows", 0])
            
            for col in ws_summary.columns:
                max_len = max(len(str(cell.value or '')) for cell in col)
                ws_summary.column_dimensions[col[0].column_letter].width = max(max_len + 3, 12)

            headers_valid = [
                "Excel Row", "Orbit ID", "Engineer Name", "Country", "Fab", "Wafer Size", 
                "Tool Type", "Start Date", "End Date", "Number of Tools", "Role", 
                "Previous Process Startup", "Previous CM/PM", "Ready for Primary Role", "Comments", "Status"
            ]

            # Valid Records Sheet
            ws_valid = report_wb.create_sheet(title="Valid Records")
            ws_valid.append(headers_valid)
            for r in valid_rows_to_insert:
                ws_valid.append([
                    r["excel_row"],
                    r.get("orbit_id"),
                    r.get("resolved_engineer_name"),
                    r.get("country"),
                    r.get("fab"),
                    r.get("wafer_size"),
                    r.get("tool_type"),
                    str(r.get("start_date")) if r.get("start_date") else "",
                    str(r.get("end_date")) if r.get("end_date") else "",
                    r.get("number_of_tools"),
                    r.get("role"),
                    "Yes" if r.get("previous_process_startup") else ("No" if r.get("previous_process_startup") is False else ""),
                    "Yes" if r.get("previous_cm_pm") else ("No" if r.get("previous_cm_pm") is False else ""),
                    "Yes" if r.get("ready_for_primary_role") else ("No" if r.get("ready_for_primary_role") is False else ""),
                    r.get("comments"),
                    "INSERTED"
                ])

            # Updated Records Sheet
            ws_updated = report_wb.create_sheet(title="Updated Records")
            ws_updated.append(["Excel Row", "Orbit ID", "Engineer Name", "Action Status", "Changed Columns", "Country", "Fab", "Tool Type", "Role", "Comments"])
            for r in existing_list:
                ws_updated.append([
                    r["excel_row"],
                    r.get("orbit_id") or "",
                    r.get("resolved_engineer_name") or "",
                    "UPDATED",
                    r.get("changed_fields") or "",
                    r.get("country"),
                    r.get("fab"),
                    r.get("tool_type"),
                    r.get("role"),
                    r.get("comments")
                ])

            # Unchanged Records Sheet
            ws_unchanged = report_wb.create_sheet(title="Unchanged Records")
            ws_unchanged.append(["Excel Row", "Orbit ID", "Engineer Name", "Action Status", "Details", "Country", "Fab", "Tool Type", "Role", "Comments"])
            for r in unchanged_list:
                ws_unchanged.append([
                    r["excel_row"],
                    r.get("orbit_id") or "",
                    r.get("resolved_engineer_name") or "",
                    "UNCHANGED",
                    "All supplied values match database",
                    r.get("country"),
                    r.get("fab"),
                    r.get("tool_type"),
                    r.get("role"),
                    r.get("comments")
                ])

            # Errors Sheet
            ws_errors = report_wb.create_sheet(title="Errors")
            ws_errors.append(["Excel Row", "Orbit ID", "Field", "Value", "Error"])
            for r in errors_list:
                for err in r.get("errors", []):
                    ws_errors.append([
                        r["excel_row"],
                        r.get("orbit_id") or "",
                        err.get("field") or "",
                        err.get("value") or "",
                        err.get("error") or ""
                    ])

            # Duplicates Sheet
            ws_dups = report_wb.create_sheet(title="Duplicates")
            ws_dups.append(["Excel Row", "Orbit ID", "Duplicate Key", "Duplicate Rows", "Reason"])
            for r in duplicates_list:
                ws_dups.append([
                    r["excel_row"],
                    r.get("orbit_id") or "",
                    r.get("duplicate_key") or "",
                    "",
                    "Duplicate Skill row in Excel sheet"
                ])

            # Warnings Sheet
            ws_warn = report_wb.create_sheet(title="Warnings")
            ws_warn.append(["Excel Row", "Orbit ID", "Field", "Value", "Warning"])

            for sheet_obj in (ws_valid, ws_updated, ws_unchanged, ws_errors, ws_dups, ws_warn):
                for col in sheet_obj.columns:
                    max_len = max(len(str(cell.value or '')) for cell in col)
                    sheet_obj.column_dimensions[col[0].column_letter].width = max(max_len + 3, 12)

            os.makedirs(TEMP_REPORTS_DIR, exist_ok=True)
            report_filename = f"validation_report_{uuid_pkg.uuid4()}.xlsx"
            report_path = os.path.join(TEMP_REPORTS_DIR, report_filename)
            report_wb.save(report_path)
            t_report = time.perf_counter()

            final_status = "COMPLETED"
            if len(errors_list) > 0 or len(duplicates_list) > 0:
                final_status = "COMPLETED_WITH_ERRORS"

            bulk_upload_service.update_bulk_upload(
                db,
                upload_id=upload_id,
                status=final_status,
                report_file=report_filename,
                imported_rows=imported_count,
                failed_rows=failed_count
            )

            ingested_msg = f"Ingested {len(valid_rows_to_insert)} new skill records. Updated {len(existing_list)} existing skill records. {len(unchanged_list)} records were unchanged."
            if errors_list or duplicates_list:
                ingested_msg += " Some rows had validation errors or duplicates. See the validation report for details."

            return {
                "success": True,
                "rowsProcessed": total_rows,
                "errorsCount": len(errors_list),
                "inserted": len(valid_rows_to_insert),
                "updated": len(existing_list),
                "unchanged": len(unchanged_list),
                "message": ingested_msg,
                "report_url": f"/api/upload/download-report/{report_filename}"
            }

        if module_id == "up-schedule":
            import time
            start_time = time.perf_counter()

            try:
                contents = await file.read()
                wb = openpyxl.load_workbook(io.BytesIO(contents))
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to parse Excel file. Please ensure it is a valid .xlsx file."
                )

            # Case-insensitive detection of the "Schedule" sheet
            schedule_sheet_name = None
            for name in wb.sheetnames:
                if name.strip().lower() == "schedule":
                    schedule_sheet_name = name
                    break

            if not schedule_sheet_name:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Excel workbook must contain a Schedule sheet."
                )

            sheet = wb[schedule_sheet_name]
            
            # Map headers
            first_row = [sheet.cell(row=1, column=c).value for c in range(1, sheet.max_column + 1)]
            col_indices = {}
            for idx, val in enumerate(first_row):
                if val is not None:
                    norm = normalize_header(val)
                    mapped_field = SCHEDULE_HEADER_MAP.get(norm)
                    if mapped_field:
                        col_indices[mapped_field] = idx + 1

            # Check required columns: orbit_id
            if "orbit_id" not in col_indices:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Required header 'Orbit ID' is missing from the Excel sheet."
                )

            # Gather all non-blank rows
            raw_rows = []
            for r in range(2, sheet.max_row + 1):
                # Check if blank
                is_blank = True
                for c in range(1, sheet.max_column + 1):
                    val = sheet.cell(row=r, column=c).value
                    if val is not None and str(val).strip() != "":
                        is_blank = False
                        break
                if is_blank:
                    continue

                row_dict = {"excel_row": r}
                
                # Retrieve original engineer name
                original_engineer_name = None
                for idx, val in enumerate(first_row):
                    if val is not None:
                        norm = normalize_header(val)
                        if norm == "engineername":
                            original_engineer_name = clean_val(sheet.cell(row=r, column=idx + 1).value)
                            break
                row_dict["original_engineer_name"] = original_engineer_name

                # Load fields from mapped headers
                for field, col_idx in col_indices.items():
                    row_dict[field] = clean_val(sheet.cell(row=r, column=col_idx).value)

                # Fill missing columns
                for field in SCHEDULE_HEADER_MAP.values():
                    if field not in row_dict:
                        row_dict[field] = None

                raw_rows.append(row_dict)

            if not raw_rows:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="The Schedule sheet is empty or contains no rows."
                )

            first_row_num = raw_rows[0]["excel_row"]
            last_row_num = raw_rows[-1]["excel_row"]
            logger.info(
                "Schedule Parsing Details - Sheet Name: %s, Header Count: %d, Total Physical Rows: %d, Total Non-Empty Rows: %d, First Non-Empty Row: %d, Last Non-Empty Row: %d",
                schedule_sheet_name,
                len(col_indices),
                sheet.max_row,
                len(raw_rows),
                first_row_num,
                last_row_num
            )
            t_excel = time.perf_counter()

            # Bulk Engineer Resolution
            unique_orbit_ids = {
                norm_str(row.get("orbit_id"))
                for row in raw_rows
                if row.get("orbit_id") and norm_str(row.get("orbit_id")) != ""
            }

            db_engineers = []
            if unique_orbit_ids:
                db_engineers = db.scalars(
                    select(Engineer).where(
                        func.lower(Engineer.orbit_id).in_(list(unique_orbit_ids)),
                        Engineer.company_id == target_company_id
                    )
                ).all()

            orbit_to_engineer = {
                norm_str(eng.orbit_id): (eng.engineer_id, eng.engineer_name)
                for eng in db_engineers
            }
            t_engineer = time.perf_counter()

            # Bulk Existing Schedule Check
            resolved_engineer_ids = {
                val[0] for val in orbit_to_engineer.values()
            }

            db_schedules = []
            if resolved_engineer_ids:
                db_schedules = db.scalars(
                    select(Schedule).where(
                        Schedule.engineer_id.in_(list(resolved_engineer_ids))
                    )
                ).all()

            existing_schedule_map = {}
            for s in db_schedules:
                existing_key = (
                    norm_uuid(s.engineer_id),
                    norm_str(s.support_type),
                    norm_str(s.country),
                    norm_str(s.fab_city),
                    norm_str(s.fab_site),
                    norm_date(s.start_date),
                    norm_date(s.end_date)
                )
                existing_schedule_map[existing_key] = s
            t_existing_lookup = time.perf_counter()

            errors_list = []
            duplicates_list = []
            existing_list = []
            unchanged_list = []
            valid_rows_to_insert = []
            seen_keys = set()

            total_rows = len(raw_rows)

            for row_dict in raw_rows:
                row_errors = []
                
                # 1. Validate required fields: orbit_id
                orbit_id = row_dict.get("orbit_id")
                if not orbit_id:
                    row_errors.append({
                        "field": "Orbit ID",
                        "value": "",
                        "error": "Orbit ID is required."
                    })
                    row_dict["errors"] = row_errors
                    errors_list.append(row_dict)
                    continue

                # 2. Resolve engineer using bulk lookup
                eng_info = orbit_to_engineer.get(norm_str(orbit_id))
                if not eng_info:
                    row_errors.append({
                        "field": "Orbit ID",
                        "value": str(orbit_id),
                        "error": f"Engineer with Orbit ID '{orbit_id}' does not exist in the selected company."
                    })
                    row_dict["errors"] = row_errors
                    errors_list.append(row_dict)
                    continue

                engineer_id, resolved_engineer_name = eng_info
                row_dict["engineer_id"] = engineer_id
                row_dict["resolved_engineer_name"] = resolved_engineer_name

                # 3. Validate required fields: support_type, country, start_date
                support_type = row_dict.get("support_type")
                if not support_type:
                    row_errors.append({
                        "field": "Support Type",
                        "value": "",
                        "error": "Support Type is required."
                    })
                
                country = row_dict.get("country")
                if not country:
                    row_errors.append({
                        "field": "Country",
                        "value": "",
                        "error": "Country is required."
                    })

                # 4. Parse and validate dates
                start_date = None
                start_date_val = row_dict.get("start_date")
                if start_date_val is None:
                    row_errors.append({
                        "field": "Start Date",
                        "value": "",
                        "error": "Start Date is required."
                    })
                else:
                    try:
                        start_date = parse_date(start_date_val)
                    except ValueError:
                        row_errors.append({
                            "field": "Start Date",
                            "value": str(start_date_val),
                            "error": "Invalid start date format."
                        })

                end_date = None
                end_date_val = row_dict.get("end_date")
                if end_date_val is not None:
                    try:
                        end_date = parse_date(end_date_val)
                    except ValueError:
                        row_errors.append({
                            "field": "End Date",
                            "value": str(end_date_val),
                            "error": "Invalid end date format."
                        })

                if start_date and end_date and end_date < start_date:
                    row_errors.append({
                        "field": "End Date",
                        "value": str(end_date_val),
                        "error": "End date should not be earlier than start_date"
                    })

                if row_errors:
                    row_dict["errors"] = row_errors
                    errors_list.append(row_dict)
                    continue

                row_dict["start_date"] = start_date
                row_dict["end_date"] = end_date
                
                # Default status if empty
                schedule_status = row_dict.get("schedule_status") or "Upcoming"
                row_dict["schedule_status"] = schedule_status

                # 6. Duplicate row detection in Excel sheet
                fab_city = row_dict.get("fab_city")
                fab_site = row_dict.get("fab_site")

                row_key = (
                    norm_uuid(engineer_id),
                    norm_str(support_type),
                    norm_str(country),
                    norm_str(fab_city),
                    norm_str(fab_site),
                    norm_date(start_date),
                    norm_date(end_date)
                )

                if row_key in seen_keys:
                    row_dict["duplicate_key"] = f"EngineerID: {engineer_id}, Type: {support_type}, Location: {country}/{fab_city}/{fab_site}"
                    duplicates_list.append(row_dict)
                    continue
                seen_keys.add(row_key)

                # 7. Check if already exists in DB for Row-Level Upsert & Change Detection
                if row_key in existing_schedule_map:
                    db_sched = existing_schedule_map[row_key]
                    row_dict["existing_schedule"] = db_sched
                    changes = []

                    if "schedule_status" in col_indices and row_dict.get("schedule_status") != db_sched.schedule_status:
                        changes.append(f"Status: '{db_sched.schedule_status}' -> '{row_dict.get('schedule_status')}'")
                        db_sched.schedule_status = row_dict.get("schedule_status")

                    if "remarks" in col_indices and row_dict.get("remarks") != db_sched.remarks:
                        changes.append(f"Remarks: '{db_sched.remarks}' -> '{row_dict.get('remarks')}'")
                        db_sched.remarks = row_dict.get("remarks")

                    if changes:
                        db_sched.updated_at = datetime.utcnow()
                        row_dict["update_status"] = "UPDATED"
                        row_dict["changed_fields"] = "; ".join(changes)
                        existing_list.append(row_dict)
                    else:
                        row_dict["update_status"] = "UNCHANGED"
                        row_dict["changed_fields"] = "No fields modified"
                        unchanged_list.append(row_dict)
                else:
                    valid_rows_to_insert.append(row_dict)

            t_validation = time.perf_counter()

            # Update BulkUpload stats
            bulk_upload_service.update_bulk_upload(
                db,
                upload_id=upload_id,
                total_rows=total_rows,
                valid_rows=len(valid_rows_to_insert),
                error_rows=len(errors_list),
                duplicate_rows=len(duplicates_list),
                existing_rows=len(existing_list),
                warning_rows=0,
                status="READY"
            )

            # Transition to IMPORTING
            bulk_upload_service.update_bulk_upload(
                db,
                upload_id=upload_id,
                status="IMPORTING"
            )

            imported_count = 0
            failed_count = 0
            try:
                schedules_to_add = []
                for item in valid_rows_to_insert:
                    db_sched = Schedule(
                        schedule_id=uuid_pkg.uuid4(),
                        engineer_id=item["engineer_id"],
                        support_type=item["support_type"],
                        country=item["country"],
                        fab_city=item["fab_city"],
                        fab_site=item["fab_site"],
                        start_date=item["start_date"],
                        end_date=item["end_date"],
                        schedule_status=item["schedule_status"],
                        remarks=item["remarks"],
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    schedules_to_add.append(db_sched)
                if schedules_to_add:
                    db.add_all(schedules_to_add)
                db.commit()
                imported_count = len(valid_rows_to_insert) + len(existing_list)
            except Exception as insert_err:
                db.rollback()
                failed_count = len(valid_rows_to_insert) + len(existing_list)
                bulk_upload_service.update_bulk_upload(
                    db,
                    upload_id=upload_id,
                    status="FAILED",
                    failed_rows=failed_count
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Database insertion failed: {str(insert_err)}"
                )
            t_insert = time.perf_counter()

            # 8. Generate report workbook
            report_wb = openpyxl.Workbook()
            ws_summary = report_wb.active
            ws_summary.title = "Summary"
            ws_summary.append(["ORMP Schedule Bulk Ingestion Report"])
            ws_summary.append([])
            ws_summary.append(["File Name", file.filename])
            ws_summary.append(["Upload Type", "schedules"])
            ws_summary.append(["Uploaded By", current_user.full_name])
            ws_summary.append(["Upload Date", datetime.now().strftime("%Y-%m-%d %H:%M:%S")])
            ws_summary.append(["Target Company", company.company_name])
            ws_summary.append(["Company UUID", str(company.company_id)])
            ws_summary.append([])
            ws_summary.append(["Metric", "Count"])
            ws_summary.append(["Total Rows", total_rows])
            ws_summary.append(["Inserted Records", len(valid_rows_to_insert)])
            ws_summary.append(["Updated Records", len(existing_list)])
            ws_summary.append(["Unchanged Records", len(unchanged_list)])
            ws_summary.append(["Error Rows", len(errors_list)])
            ws_summary.append(["Duplicate Rows", len(duplicates_list)])
            ws_summary.append(["Warning Rows", 0])
            
            for col in ws_summary.columns:
                max_len = max(len(str(cell.value or '')) for cell in col)
                ws_summary.column_dimensions[col[0].column_letter].width = max(max_len + 3, 12)

            headers_valid = [
                "Excel Row", "Orbit ID", "Engineer Name", "Support Type", "Country", "Fab City", 
                "Fab Site", "Start Date", "End Date", "Schedule Status", "Remarks", "Status"
            ]

            # Valid Records Sheet
            ws_valid = report_wb.create_sheet(title="Valid Records")
            ws_valid.append(headers_valid)
            for r in valid_rows_to_insert:
                ws_valid.append([
                    r["excel_row"],
                    r.get("orbit_id"),
                    r.get("resolved_engineer_name"),
                    r.get("support_type"),
                    r.get("country"),
                    r.get("fab_city"),
                    r.get("fab_site"),
                    str(r.get("start_date")) if r.get("start_date") else "",
                    str(r.get("end_date")) if r.get("end_date") else "",
                    r.get("schedule_status"),
                    r.get("remarks"),
                    "INSERTED"
                ])

            # Updated Records Sheet
            ws_updated = report_wb.create_sheet(title="Updated Records")
            ws_updated.append(["Excel Row", "Orbit ID", "Engineer Name", "Action Status", "Changed Columns", "Support Type", "Country", "Fab City", "Fab Site", "Status", "Remarks"])
            for r in existing_list:
                ws_updated.append([
                    r["excel_row"],
                    r.get("orbit_id") or "",
                    r.get("resolved_engineer_name") or "",
                    "UPDATED",
                    r.get("changed_fields") or "",
                    r.get("support_type"),
                    r.get("country"),
                    r.get("fab_city"),
                    r.get("fab_site"),
                    r.get("schedule_status"),
                    r.get("remarks")
                ])

            # Unchanged Records Sheet
            ws_unchanged = report_wb.create_sheet(title="Unchanged Records")
            ws_unchanged.append(["Excel Row", "Orbit ID", "Engineer Name", "Action Status", "Details", "Support Type", "Country", "Fab City", "Fab Site", "Status", "Remarks"])
            for r in unchanged_list:
                ws_unchanged.append([
                    r["excel_row"],
                    r.get("orbit_id") or "",
                    r.get("resolved_engineer_name") or "",
                    "UNCHANGED",
                    "All supplied values match database",
                    r.get("support_type"),
                    r.get("country"),
                    r.get("fab_city"),
                    r.get("fab_site"),
                    r.get("schedule_status"),
                    r.get("remarks")
                ])

            # Errors Sheet
            ws_errors = report_wb.create_sheet(title="Errors")
            ws_errors.append(["Excel Row", "Orbit ID", "Field", "Value", "Error"])
            for r in errors_list:
                for err in r.get("errors", []):
                    ws_errors.append([
                        r["excel_row"],
                        r.get("orbit_id") or "",
                        err.get("field") or "",
                        err.get("value") or "",
                        err.get("error") or ""
                    ])

            # Duplicates Sheet
            ws_dups = report_wb.create_sheet(title="Duplicates")
            ws_dups.append(["Excel Row", "Orbit ID", "Duplicate Key", "Duplicate Rows", "Reason"])
            for r in duplicates_list:
                ws_dups.append([
                    r["excel_row"],
                    r.get("orbit_id") or "",
                    r.get("duplicate_key") or "",
                    "",
                    "Duplicate Schedule row in Excel sheet"
                ])

            # Warnings Sheet
            ws_warn = report_wb.create_sheet(title="Warnings")
            ws_warn.append(["Excel Row", "Orbit ID", "Field", "Value", "Warning"])

            for sheet_obj in (ws_valid, ws_updated, ws_unchanged, ws_errors, ws_dups, ws_warn):
                for col in sheet_obj.columns:
                    max_len = max(len(str(cell.value or '')) for cell in col)
                    sheet_obj.column_dimensions[col[0].column_letter].width = max(max_len + 3, 12)

            os.makedirs(TEMP_REPORTS_DIR, exist_ok=True)
            report_filename = f"validation_report_{uuid_pkg.uuid4()}.xlsx"
            report_path = os.path.join(TEMP_REPORTS_DIR, report_filename)
            report_wb.save(report_path)
            t_report = time.perf_counter()

            final_status = "COMPLETED"
            if len(errors_list) > 0 or len(duplicates_list) > 0:
                final_status = "COMPLETED_WITH_ERRORS"

            bulk_upload_service.update_bulk_upload(
                db,
                upload_id=upload_id,
                status=final_status,
                report_file=report_filename,
                imported_rows=imported_count,
                failed_rows=failed_count
            )

            ingested_msg = f"Ingested {len(valid_rows_to_insert)} new schedule records. Updated {len(existing_list)} existing schedule records. {len(unchanged_list)} records were unchanged."
            if errors_list or duplicates_list:
                ingested_msg += " Some rows had validation errors or duplicates. See the validation report for details."

            return {
                "success": True,
                "rowsProcessed": total_rows,
                "errorsCount": len(errors_list),
                "inserted": len(valid_rows_to_insert),
                "updated": len(existing_list),
                "unchanged": len(unchanged_list),
                "message": ingested_msg,
                "report_url": f"/api/upload/download-report/{report_filename}"
            }

        if module_id == "up-visa":
            import time
            start_time = time.perf_counter()

            try:
                contents = await file.read()
                wb = openpyxl.load_workbook(io.BytesIO(contents))
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to parse Excel file. Please ensure it is a valid .xlsx file."
                )

            # Case-insensitive detection of the "Visa" sheet
            visa_sheet_name = None
            for name in wb.sheetnames:
                norm_name = name.strip().lower()
                if norm_name in ("visa", "visas", "visa details", "visa matrix"):
                    visa_sheet_name = name
                    break

            if not visa_sheet_name:
                if len(wb.sheetnames) == 1:
                    visa_sheet_name = wb.sheetnames[0]
                else:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="Excel workbook must contain a 'Visa' or 'Visas' sheet."
                    )

            sheet = wb[visa_sheet_name]
            
            # Map headers
            first_row = [sheet.cell(row=1, column=c).value for c in range(1, sheet.max_column + 1)]
            col_indices = {}
            for idx, val in enumerate(first_row):
                if val is not None:
                    norm = normalize_header(val)
                    mapped_field = VISA_HEADER_MAP.get(norm)
                    if mapped_field:
                        col_indices[mapped_field] = idx + 1

            # Check required columns: orbit_id and country
            missing_cols = []
            if "orbit_id" not in col_indices:
                missing_cols.append("Orbit ID")
            if "country" not in col_indices:
                missing_cols.append("Country")
            
            if missing_cols:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Required header(s) missing from Excel sheet: {', '.join(missing_cols)}."
                )

            # Gather all non-blank rows
            raw_rows = []
            for r in range(2, sheet.max_row + 1):
                is_blank = True
                for c in range(1, sheet.max_column + 1):
                    val = sheet.cell(row=r, column=c).value
                    if val is not None and str(val).strip() != "":
                        is_blank = False
                        break
                if is_blank:
                    continue

                row_dict = {"excel_row": r}
                
                # Retrieve original engineer name if present
                original_engineer_name = None
                for idx, val in enumerate(first_row):
                    if val is not None:
                        norm = normalize_header(val)
                        if norm in ("engineername", "name"):
                            original_engineer_name = clean_val(sheet.cell(row=r, column=idx + 1).value)
                            break
                row_dict["original_engineer_name"] = original_engineer_name

                # Load fields from mapped headers
                for field, col_idx in col_indices.items():
                    row_dict[field] = clean_val(sheet.cell(row=r, column=col_idx).value)

                # Fill missing columns
                for field in set(VISA_HEADER_MAP.values()):
                    if field not in row_dict:
                        row_dict[field] = None

                raw_rows.append(row_dict)

            if not raw_rows:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="The Visa sheet is empty or contains no rows."
                )

            t_excel = time.perf_counter()

            # Bulk Engineer Resolution
            unique_orbit_ids = {
                norm_str(row.get("orbit_id"))
                for row in raw_rows
                if row.get("orbit_id") and norm_str(row.get("orbit_id")) != ""
            }

            db_engineers = []
            if unique_orbit_ids:
                db_engineers = db.scalars(
                    select(Engineer).where(
                        func.lower(Engineer.orbit_id).in_(list(unique_orbit_ids)),
                        Engineer.company_id == target_company_id
                    )
                ).all()

            orbit_to_engineer = {
                norm_str(eng.orbit_id): (eng.engineer_id, eng.engineer_name)
                for eng in db_engineers
            }
            t_engineer = time.perf_counter()

            # Bulk Company User Lookup for Owner Resolution
            company_users = db.scalars(
                select(User).where(User.company_id == target_company_id)
            ).all()
            user_by_email = {u.email.lower(): u.user_id for u in company_users if u.email}
            user_by_name = {u.full_name.lower(): u.user_id for u in company_users if u.full_name}
            user_by_id = {str(u.user_id): u.user_id for u in company_users}

            # Bulk Existing Visa Check for Upsert
            resolved_engineer_ids = {
                val[0] for val in orbit_to_engineer.values()
            }

            db_visas = []
            if resolved_engineer_ids:
                db_visas = db.scalars(
                    select(Visa).where(
                        Visa.engineer_id.in_(list(resolved_engineer_ids))
                    )
                ).all()

            # Map existing visas by (engineer_id, country_lower, visa_type_lower)
            existing_visa_map = {}
            for v in db_visas:
                c_key = norm_str(v.country)
                vt_key = norm_str(v.visa_type)
                existing_visa_map[(norm_uuid(v.engineer_id), c_key, vt_key)] = v

            t_existing_lookup = time.perf_counter()

            errors_list = []
            duplicates_list = []
            existing_list = []
            unchanged_list = []
            valid_rows_to_insert = []
            seen_keys = set()

            total_rows = len(raw_rows)

            for row_dict in raw_rows:
                row_errors = []
                
                # 1. Validate required fields: orbit_id
                orbit_id = row_dict.get("orbit_id")
                if not orbit_id:
                    row_errors.append({
                        "field": "Orbit ID",
                        "value": "",
                        "error": "Orbit ID is required."
                    })
                    row_dict["errors"] = row_errors
                    errors_list.append(row_dict)
                    continue

                # 2. Resolve engineer using bulk lookup
                eng_info = orbit_to_engineer.get(norm_str(orbit_id))
                if not eng_info:
                    row_errors.append({
                        "field": "Orbit ID",
                        "value": str(orbit_id),
                        "error": f"Engineer with Orbit ID '{orbit_id}' does not exist in the selected company."
                    })
                    row_dict["errors"] = row_errors
                    errors_list.append(row_dict)
                    continue

                engineer_id, resolved_engineer_name = eng_info
                row_dict["engineer_id"] = engineer_id
                row_dict["resolved_engineer_name"] = resolved_engineer_name

                # 3. Validate required fields: country
                country = row_dict.get("country")
                if not country:
                    row_errors.append({
                        "field": "Country",
                        "value": "",
                        "error": "Country is required."
                    })

                # 4. Resolve optional Owner if provided in Excel
                owner_raw = row_dict.get("owner")
                resolved_owner_id = None
                if owner_raw is not None and str(owner_raw).strip() != "":
                    clean_owner = str(owner_raw).strip().lower()
                    resolved_owner_id = user_by_email.get(clean_owner) or user_by_name.get(clean_owner) or user_by_id.get(str(owner_raw).strip())
                    if not resolved_owner_id:
                        row_errors.append({
                            "field": "Owner",
                            "value": str(owner_raw),
                            "error": f"Owner '{owner_raw}' not found or does not belong to the target company."
                        })
                row_dict["owner_id"] = resolved_owner_id

                # 5. Parse and validate dates
                applied_on = None
                applied_on_val = row_dict.get("applied_on")
                if applied_on_val is not None:
                    try:
                        applied_on = parse_date(applied_on_val)
                    except ValueError:
                        row_errors.append({
                            "field": "Applied On",
                            "value": str(applied_on_val),
                            "error": "Invalid applied date format."
                        })

                visa_start_date = None
                start_date_val = row_dict.get("visa_start_date")
                if start_date_val is not None:
                    try:
                        visa_start_date = parse_date(start_date_val)
                    except ValueError:
                        row_errors.append({
                            "field": "Start Date",
                            "value": str(start_date_val),
                            "error": "Invalid start date format."
                        })

                visa_end_date = None
                end_date_val = row_dict.get("visa_end_date")
                if end_date_val is not None:
                    try:
                        visa_end_date = parse_date(end_date_val)
                    except ValueError:
                        row_errors.append({
                            "field": "End Date / Expiry Date",
                            "value": str(end_date_val),
                            "error": "Invalid end date format."
                        })

                if visa_start_date and visa_end_date and visa_end_date < visa_start_date:
                    row_errors.append({
                        "field": "End Date / Expiry Date",
                        "value": str(end_date_val),
                        "error": "visa_end_date should not be earlier than visa_start_date"
                    })

                if row_errors:
                    row_dict["errors"] = row_errors
                    errors_list.append(row_dict)
                    continue

                row_dict["applied_on"] = applied_on
                row_dict["visa_start_date"] = visa_start_date
                row_dict["visa_end_date"] = visa_end_date

                # 6. Duplicate row detection in Excel sheet
                visa_type = row_dict.get("visa_type") or ""
                country_clean = (country or "").strip().lower()
                visa_type_clean = (visa_type or "").strip().lower()

                row_key = (norm_uuid(engineer_id), country_clean, visa_type_clean)

                if row_key in seen_keys:
                    row_dict["duplicate_key"] = f"EngineerID: {engineer_id}, Country: {country}, Type: {visa_type}"
                    duplicates_list.append(row_dict)
                    continue
                seen_keys.add(row_key)

                # 7. Upsert check: existing DB record vs new record
                existing_visa_record = existing_visa_map.get(row_key)
                if existing_visa_record:
                    ev = existing_visa_record
                    row_dict["existing_visa"] = ev
                    changes = []

                    if "applied_on" in col_indices and row_dict.get("applied_on") != ev.applied_on:
                        changes.append(f"Applied On: '{ev.applied_on}' -> '{row_dict.get('applied_on')}'")
                        ev.applied_on = row_dict.get("applied_on")

                    if "visa_start_date" in col_indices and row_dict.get("visa_start_date") != ev.visa_start_date:
                        changes.append(f"Start Date: '{ev.visa_start_date}' -> '{row_dict.get('visa_start_date')}'")
                        ev.visa_start_date = row_dict.get("visa_start_date")

                    if "visa_end_date" in col_indices and row_dict.get("visa_end_date") != ev.visa_end_date:
                        changes.append(f"End Date: '{ev.visa_end_date}' -> '{row_dict.get('visa_end_date')}'")
                        ev.visa_end_date = row_dict.get("visa_end_date")

                    if "comments" in col_indices and row_dict.get("comments") != ev.comments:
                        changes.append(f"Comments: '{ev.comments}' -> '{row_dict.get('comments')}'")
                        ev.comments = row_dict.get("comments")

                    if "owner" in col_indices and row_dict.get("owner_id") != ev.owner_id:
                        changes.append(f"Owner: '{ev.owner_id}' -> '{row_dict.get('owner_id')}'")
                        ev.owner_id = row_dict.get("owner_id")

                    if changes:
                        ev.updated_at = datetime.utcnow()
                        row_dict["update_status"] = "UPDATED"
                        row_dict["changed_fields"] = "; ".join(changes)
                        existing_list.append(row_dict)
                    else:
                        row_dict["update_status"] = "UNCHANGED"
                        row_dict["changed_fields"] = "No fields modified"
                        unchanged_list.append(row_dict)
                else:
                    valid_rows_to_insert.append(row_dict)

            t_validation = time.perf_counter()

            # Update BulkUpload stats
            bulk_upload_service.update_bulk_upload(
                db,
                upload_id=upload_id,
                total_rows=total_rows,
                valid_rows=len(valid_rows_to_insert),
                error_rows=len(errors_list),
                duplicate_rows=len(duplicates_list),
                existing_rows=len(existing_list),
                warning_rows=0,
                status="READY"
            )

            # Transition to IMPORTING
            bulk_upload_service.update_bulk_upload(
                db,
                upload_id=upload_id,
                status="IMPORTING"
            )

            imported_count = 0
            failed_count = 0
            try:
                # 1. Bulk Insert New Visas
                visas_to_add = []
                for item in valid_rows_to_insert:
                    db_v = Visa(
                        visa_id=uuid_pkg.uuid4(),
                        engineer_id=item["engineer_id"],
                        owner_id=item.get("owner_id"),
                        country=item["country"],
                        visa_type=item["visa_type"],
                        applied_on=item["applied_on"],
                        visa_start_date=item["visa_start_date"],
                        visa_end_date=item["visa_end_date"],
                        comments=item["comments"],
                        comment_status="UNADDRESSED",
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    visas_to_add.append(db_v)
                if visas_to_add:
                    db.add_all(visas_to_add)

                db.commit()
                imported_count = len(valid_rows_to_insert) + len(existing_list)
            except Exception as insert_err:
                db.rollback()
                failed_count = len(valid_rows_to_insert) + len(existing_list)
                bulk_upload_service.update_bulk_upload(
                    db,
                    upload_id=upload_id,
                    status="FAILED",
                    failed_rows=failed_count
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Database ingestion failed: {str(insert_err)}"
                )
            t_insert = time.perf_counter()

            # 8. Generate report workbook
            report_wb = openpyxl.Workbook()
            ws_summary = report_wb.active
            ws_summary.title = "Summary"
            ws_summary.append(["ORMP Visa Bulk Ingestion Report"])
            ws_summary.append([])
            ws_summary.append(["File Name", file.filename])
            ws_summary.append(["Upload Type", "visas"])
            ws_summary.append(["Uploaded By", current_user.full_name])
            ws_summary.append(["Upload Date", datetime.now().strftime("%Y-%m-%d %H:%M:%S")])
            ws_summary.append(["Target Company", company.company_name])
            ws_summary.append(["Company UUID", str(company.company_id)])
            ws_summary.append([])
            ws_summary.append(["Metric", "Count"])
            ws_summary.append(["Total Rows", total_rows])
            ws_summary.append(["Inserted Records", len(valid_rows_to_insert)])
            ws_summary.append(["Updated Records", len(existing_list)])
            ws_summary.append(["Unchanged Records", len(unchanged_list)])
            ws_summary.append(["Error Rows", len(errors_list)])
            ws_summary.append(["Duplicate Rows", len(duplicates_list)])
            ws_summary.append(["Warning Rows", 0])
            
            for col in ws_summary.columns:
                max_len = max(len(str(cell.value or '')) for cell in col)
                ws_summary.column_dimensions[col[0].column_letter].width = max(max_len + 3, 12)

            headers_valid = [
                "Excel Row", "Orbit ID", "Engineer Name", "Country", "Visa Type", 
                "Applied On", "Start Date", "End Date", "Comments", "Status"
            ]

            # Valid Records Sheet (Inserted)
            ws_valid = report_wb.create_sheet(title="Valid Records")
            ws_valid.append(headers_valid)
            for r in valid_rows_to_insert:
                ws_valid.append([
                    r["excel_row"],
                    r.get("orbit_id"),
                    r.get("resolved_engineer_name"),
                    r.get("country"),
                    r.get("visa_type"),
                    str(r.get("applied_on")) if r.get("applied_on") else "",
                    str(r.get("visa_start_date")) if r.get("visa_start_date") else "",
                    str(r.get("visa_end_date")) if r.get("visa_end_date") else "",
                    r.get("comments"),
                    "INSERTED"
                ])

            # Updated Records Sheet
            ws_updated = report_wb.create_sheet(title="Updated Records")
            ws_updated.append(["Excel Row", "Orbit ID", "Engineer Name", "Action Status", "Changed Columns", "Country", "Visa Type", "Comments"])
            for r in existing_list:
                ws_updated.append([
                    r["excel_row"],
                    r.get("orbit_id") or "",
                    r.get("resolved_engineer_name") or r.get("original_engineer_name") or "",
                    "UPDATED",
                    r.get("changed_fields") or "",
                    r.get("country"),
                    r.get("visa_type"),
                    r.get("comments")
                ])

            # Unchanged Records Sheet
            ws_unchanged = report_wb.create_sheet(title="Unchanged Records")
            ws_unchanged.append(["Excel Row", "Orbit ID", "Engineer Name", "Action Status", "Details", "Country", "Visa Type", "Comments"])
            for r in unchanged_list:
                ws_unchanged.append([
                    r["excel_row"],
                    r.get("orbit_id") or "",
                    r.get("resolved_engineer_name") or r.get("original_engineer_name") or "",
                    "UNCHANGED",
                    "All supplied values match database",
                    r.get("country"),
                    r.get("visa_type"),
                    r.get("comments")
                ])

            # Errors Sheet
            ws_errors = report_wb.create_sheet(title="Errors")
            ws_errors.append(["Excel Row", "Orbit ID", "Field", "Value", "Error"])
            for r in errors_list:
                for err in r.get("errors", []):
                    ws_errors.append([
                        r["excel_row"],
                        r.get("orbit_id") or "",
                        err.get("field") or "",
                        err.get("value") or "",
                        err.get("error") or ""
                    ])

            # Duplicates Sheet
            ws_dups = report_wb.create_sheet(title="Duplicates")
            ws_dups.append(["Excel Row", "Orbit ID", "Duplicate Key", "Reason"])
            for r in duplicates_list:
                ws_dups.append([
                    r["excel_row"],
                    r.get("orbit_id") or "",
                    r.get("duplicate_key") or "",
                    "Duplicate Visa row within Excel sheet"
                ])

            # Warnings Sheet
            ws_warn = report_wb.create_sheet(title="Warnings")
            ws_warn.append(["Excel Row", "Orbit ID", "Field", "Value", "Warning"])

            for sheet_obj in (ws_valid, ws_updated, ws_unchanged, ws_errors, ws_dups, ws_warn):
                for col in sheet_obj.columns:
                    max_len = max(len(str(cell.value or '')) for cell in col)
                    sheet_obj.column_dimensions[col[0].column_letter].width = max(max_len + 3, 12)

            os.makedirs(TEMP_REPORTS_DIR, exist_ok=True)
            report_filename = f"validation_report_{uuid_pkg.uuid4()}.xlsx"
            report_path = os.path.join(TEMP_REPORTS_DIR, report_filename)
            report_wb.save(report_path)
            t_report = time.perf_counter()

            final_status = "COMPLETED"
            if len(errors_list) > 0 or len(duplicates_list) > 0:
                final_status = "COMPLETED_WITH_ERRORS"

            bulk_upload_service.update_bulk_upload(
                db,
                upload_id=upload_id,
                status=final_status,
                report_file=report_filename,
                imported_rows=imported_count,
                failed_rows=failed_count
            )

            total_time = time.perf_counter() - start_time
            logger.info(
                "\nVisa upload:\n"
                "Rows detected: %d\n"
                "Excel parsing: %.4fs\n"
                "Engineer lookup: %.4fs\n"
                "Existing visa lookup: %.4fs\n"
                "Validation & Duplicate detection: %.4fs\n"
                "Database upsert & commit: %.4fs\n"
                "Report generation: %.4fs\n"
                "Total: %.4fs",
                total_rows,
                t_excel - start_time,
                t_engineer - t_excel,
                t_existing_lookup - t_engineer,
                t_validation - t_existing_lookup,
                t_insert - t_validation,
                t_report - t_insert,
                total_time
            )

            ingested_msg = f"Ingested {len(valid_rows_to_insert)} new visa records. Updated {len(existing_list)} existing visa records. {len(unchanged_list)} records were unchanged."
            if errors_list or duplicates_list:
                ingested_msg += " Some rows had validation errors or duplicates. See the validation report for details."

            return {
                "success": True,
                "rowsProcessed": total_rows,
                "errorsCount": len(errors_list),
                "inserted": len(valid_rows_to_insert),
                "updated": len(existing_list),
                "unchanged": len(unchanged_list),
                "message": ingested_msg,
                "report_url": f"/api/upload/download-report/{report_filename}"
            }

        if module_id == "up-travel":
            import time
            start_time = time.perf_counter()

            try:
                contents = await file.read()
                wb = openpyxl.load_workbook(io.BytesIO(contents))
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to parse Excel file. Please ensure it is a valid .xlsx file."
                )

            # Case-insensitive detection of the "Travel" sheet
            travel_sheet_name = None
            for name in wb.sheetnames:
                norm_name = name.strip().lower()
                if norm_name in ("travel", "travels", "travel details", "travel arrangements", "travel itinerary"):
                    travel_sheet_name = name
                    break

            if not travel_sheet_name:
                if len(wb.sheetnames) == 1:
                    travel_sheet_name = wb.sheetnames[0]
                else:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="Excel workbook must contain a 'Travel' or 'Travel Details' sheet."
                    )

            sheet = wb[travel_sheet_name]
            
            # Map headers
            first_row = [sheet.cell(row=1, column=c).value for c in range(1, sheet.max_column + 1)]
            col_indices = {}
            for idx, val in enumerate(first_row):
                if val is not None:
                    norm = normalize_header(val)
                    mapped_field = TRAVEL_HEADER_MAP.get(norm)
                    if mapped_field:
                        col_indices[mapped_field] = idx + 1

            # Check required columns: orbit_id
            if "orbit_id" not in col_indices:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Required header 'Orbit ID' is missing from the Excel sheet."
                )

            # Gather all non-blank rows
            raw_rows = []
            for r in range(2, sheet.max_row + 1):
                is_blank = True
                for c in range(1, sheet.max_column + 1):
                    val = sheet.cell(row=r, column=c).value
                    if val is not None and str(val).strip() != "":
                        is_blank = False
                        break
                if is_blank:
                    continue

                row_dict = {"excel_row": r}
                
                # Retrieve original engineer name if present
                original_engineer_name = None
                for idx, val in enumerate(first_row):
                    if val is not None:
                        norm = normalize_header(val)
                        if norm in ("engineername", "name"):
                            original_engineer_name = clean_val(sheet.cell(row=r, column=idx + 1).value)
                            break
                row_dict["original_engineer_name"] = original_engineer_name

                # Load fields from mapped headers
                for field, col_idx in col_indices.items():
                    row_dict[field] = clean_val(sheet.cell(row=r, column=col_idx).value)

                # Fill missing columns
                for field in set(TRAVEL_HEADER_MAP.values()):
                    if field not in row_dict:
                        row_dict[field] = None

                raw_rows.append(row_dict)

            if not raw_rows:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="The Travel sheet is empty or contains no rows."
                )

            t_excel = time.perf_counter()

            # Bulk Engineer Resolution
            unique_orbit_ids = {
                norm_str(row.get("orbit_id"))
                for row in raw_rows
                if row.get("orbit_id") and norm_str(row.get("orbit_id")) != ""
            }

            db_engineers = []
            if unique_orbit_ids:
                db_engineers = db.scalars(
                    select(Engineer).where(
                        func.lower(Engineer.orbit_id).in_(list(unique_orbit_ids)),
                        Engineer.company_id == target_company_id
                    )
                ).all()

            orbit_to_engineer = {
                norm_str(eng.orbit_id): (eng.engineer_id, eng.engineer_name)
                for eng in db_engineers
            }
            t_engineer = time.perf_counter()

            # Resolution of Schedules for resolved engineers
            resolved_engineer_ids = {
                val[0] for val in orbit_to_engineer.values()
            }

            db_schedules = []
            if resolved_engineer_ids:
                db_schedules = db.scalars(
                    select(Schedule).where(
                        Schedule.engineer_id.in_(list(resolved_engineer_ids))
                    )
                ).all()

            # Group schedules by engineer_id
            engineer_schedules = {}
            for sch in db_schedules:
                engineer_schedules.setdefault(sch.engineer_id, []).append(sch)

            # Query existing travel arrangements for resolved schedules
            resolved_schedule_ids = [sch.schedule_id for sch in db_schedules]
            db_travels = []
            if resolved_schedule_ids:
                db_travels = db.scalars(
                    select(Travel).where(
                        Travel.schedule_id.in_(resolved_schedule_ids)
                    )
                ).all()

            # Map existing travel records by (schedule_id, travel_date, purpose_lower)
            existing_travel_map = {}
            for tr in db_travels:
                p_key = norm_str(tr.purpose)
                existing_travel_map[(norm_uuid(tr.schedule_id), norm_date(tr.travel_date), p_key)] = tr

            t_existing_lookup = time.perf_counter()

            errors_list = []
            duplicates_list = []
            existing_list = []
            unchanged_list = []
            valid_rows_to_insert = []
            new_schedules_created = []
            seen_keys = set()

            total_rows = len(raw_rows)

            for row_dict in raw_rows:
                row_errors = []
                
                # 1. Validate required fields: orbit_id
                orbit_id = row_dict.get("orbit_id")
                if not orbit_id:
                    row_errors.append({
                        "field": "Orbit ID",
                        "value": "",
                        "error": "Orbit ID is required."
                    })
                    row_dict["errors"] = row_errors
                    errors_list.append(row_dict)
                    continue

                # 2. Resolve engineer using bulk lookup
                eng_info = orbit_to_engineer.get(norm_str(orbit_id))
                if not eng_info:
                    row_errors.append({
                        "field": "Orbit ID",
                        "value": str(orbit_id),
                        "error": f"Engineer with Orbit ID '{orbit_id}' does not exist in the selected company."
                    })
                    row_dict["errors"] = row_errors
                    errors_list.append(row_dict)
                    continue

                engineer_id, resolved_engineer_name = eng_info
                row_dict["engineer_id"] = engineer_id
                row_dict["resolved_engineer_name"] = resolved_engineer_name

                # 3. Parse and validate dates
                booking_date = None
                booking_date_val = row_dict.get("booking_date")
                if booking_date_val is not None:
                    try:
                        booking_date = parse_date(booking_date_val)
                    except ValueError:
                        row_errors.append({
                            "field": "Booking Date",
                            "value": str(booking_date_val),
                            "error": "Invalid booking date format."
                        })

                travel_date = None
                travel_date_val = row_dict.get("travel_date")
                if travel_date_val is not None:
                    try:
                        travel_date = parse_date(travel_date_val)
                    except ValueError:
                        row_errors.append({
                            "field": "Travel Date",
                            "value": str(travel_date_val),
                            "error": "Invalid travel date format."
                        })

                if booking_date and travel_date and travel_date < booking_date:
                    row_errors.append({
                        "field": "Travel Date",
                        "value": str(travel_date_val),
                        "error": "travel_date should not be earlier than booking_date"
                    })

                if row_errors:
                    row_dict["errors"] = row_errors
                    errors_list.append(row_dict)
                    continue

                row_dict["booking_date"] = booking_date
                row_dict["travel_date"] = travel_date

                purpose = row_dict.get("purpose") or "Customer Support"
                row_dict["purpose"] = purpose

                # 4. Resolve Schedule for this engineer
                schedules_for_eng = engineer_schedules.get(engineer_id, [])
                target_schedule = None
                if schedules_for_eng:
                    # Pick best matching schedule or latest
                    target_schedule = schedules_for_eng[0]
                else:
                    # Create baseline Schedule for engineer if none exists
                    target_schedule = Schedule(
                        schedule_id=uuid_pkg.uuid4(),
                        engineer_id=engineer_id,
                        support_type=row_dict.get("support_type") or "Customer Support",
                        country=row_dict.get("country") or "Global",
                        fab_city=row_dict.get("fab_city"),
                        fab_site=row_dict.get("fab_site"),
                        start_date=travel_date or date.today(),
                        schedule_status="Upcoming",
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    engineer_schedules.setdefault(engineer_id, []).append(target_schedule)
                    new_schedules_created.append(target_schedule)

                schedule_id = target_schedule.schedule_id
                row_dict["schedule_id"] = schedule_id

                # 5. Duplicate row detection in Excel sheet
                purpose_clean = (purpose or "").strip().lower()
                row_key = (norm_uuid(schedule_id), norm_date(travel_date), purpose_clean)

                if row_key in seen_keys:
                    row_dict["duplicate_key"] = f"OrbitID: {orbit_id}, TravelDate: {travel_date}, Purpose: {purpose}"
                    duplicates_list.append(row_dict)
                    continue
                seen_keys.add(row_key)

                # 6. Upsert check: existing DB record vs new record
                existing_travel_record = existing_travel_map.get(row_key)
                if existing_travel_record:
                    etr = existing_travel_record
                    row_dict["existing_travel"] = etr
                    changes = []

                    if "booking_date" in col_indices and row_dict.get("booking_date") != etr.booking_date:
                        changes.append(f"Booking Date: '{etr.booking_date}' -> '{row_dict.get('booking_date')}'")
                        etr.booking_date = row_dict.get("booking_date")

                    if "travel_date" in col_indices and row_dict.get("travel_date") != etr.travel_date:
                        changes.append(f"Travel Date: '{etr.travel_date}' -> '{row_dict.get('travel_date')}'")
                        etr.travel_date = row_dict.get("travel_date")

                    if "purpose" in col_indices and row_dict.get("purpose") != etr.purpose:
                        changes.append(f"Purpose: '{etr.purpose}' -> '{row_dict.get('purpose')}'")
                        etr.purpose = row_dict.get("purpose")

                    if "comments" in col_indices and row_dict.get("comments") != etr.comments:
                        changes.append(f"Comments: '{etr.comments}' -> '{row_dict.get('comments')}'")
                        etr.comments = row_dict.get("comments")

                    if changes:
                        etr.updated_at = datetime.utcnow()
                        row_dict["update_status"] = "UPDATED"
                        row_dict["changed_fields"] = "; ".join(changes)
                        existing_list.append(row_dict)
                    else:
                        row_dict["update_status"] = "UNCHANGED"
                        row_dict["changed_fields"] = "No fields modified"
                        unchanged_list.append(row_dict)
                else:
                    valid_rows_to_insert.append(row_dict)

            t_validation = time.perf_counter()

            # Update BulkUpload stats
            bulk_upload_service.update_bulk_upload(
                db,
                upload_id=upload_id,
                total_rows=total_rows,
                valid_rows=len(valid_rows_to_insert),
                error_rows=len(errors_list),
                duplicate_rows=len(duplicates_list),
                existing_rows=len(existing_list),
                warning_rows=0,
                status="READY"
            )

            # Transition to IMPORTING
            bulk_upload_service.update_bulk_upload(
                db,
                upload_id=upload_id,
                status="IMPORTING"
            )

            imported_count = 0
            failed_count = 0
            try:
                # Add baseline schedules if any created
                if new_schedules_created:
                    db.add_all(new_schedules_created)

                # 1. Bulk Insert New Travels
                travels_to_add = []
                for item in valid_rows_to_insert:
                    db_tr = Travel(
                        travel_id=uuid_pkg.uuid4(),
                        schedule_id=item["schedule_id"],
                        booking_date=item["booking_date"],
                        travel_date=item["travel_date"],
                        purpose=item["purpose"],
                        comments=item["comments"],
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    travels_to_add.append(db_tr)
                if travels_to_add:
                    db.add_all(travels_to_add)

                db.commit()
                imported_count = len(valid_rows_to_insert) + len(existing_list)
            except Exception as insert_err:
                db.rollback()
                failed_count = len(valid_rows_to_insert) + len(existing_list)
                bulk_upload_service.update_bulk_upload(
                    db,
                    upload_id=upload_id,
                    status="FAILED",
                    failed_rows=failed_count
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Database ingestion failed: {str(insert_err)}"
                )
            t_insert = time.perf_counter()

            # 8. Generate report workbook
            report_wb = openpyxl.Workbook()
            ws_summary = report_wb.active
            ws_summary.title = "Summary"
            ws_summary.append(["ORMP Travel Bulk Ingestion Report"])
            ws_summary.append([])
            ws_summary.append(["File Name", file.filename])
            ws_summary.append(["Upload Type", "travel"])
            ws_summary.append(["Uploaded By", current_user.full_name])
            ws_summary.append(["Upload Date", datetime.now().strftime("%Y-%m-%d %H:%M:%S")])
            ws_summary.append(["Target Company", company.company_name])
            ws_summary.append(["Company UUID", str(company.company_id)])
            ws_summary.append([])
            ws_summary.append(["Metric", "Count"])
            ws_summary.append(["Total Rows", total_rows])
            ws_summary.append(["Inserted Records", len(valid_rows_to_insert)])
            ws_summary.append(["Updated Records", len(existing_list)])
            ws_summary.append(["Unchanged Records", len(unchanged_list)])
            ws_summary.append(["Error Rows", len(errors_list)])
            ws_summary.append(["Duplicate Rows", len(duplicates_list)])
            ws_summary.append(["Warning Rows", 0])
            
            for col in ws_summary.columns:
                max_len = max(len(str(cell.value or '')) for cell in col)
                ws_summary.column_dimensions[col[0].column_letter].width = max(max_len + 3, 12)

            headers_valid = [
                "Excel Row", "Orbit ID", "Engineer Name", "Booking Date", "Travel Date", 
                "Purpose", "Comments", "Status"
            ]

            # Valid Records Sheet (Inserted)
            ws_valid = report_wb.create_sheet(title="Valid Records")
            ws_valid.append(headers_valid)
            for r in valid_rows_to_insert:
                ws_valid.append([
                    r["excel_row"],
                    r.get("orbit_id"),
                    r.get("resolved_engineer_name"),
                    str(r.get("booking_date")) if r.get("booking_date") else "",
                    str(r.get("travel_date")) if r.get("travel_date") else "",
                    r.get("purpose"),
                    r.get("comments"),
                    "INSERTED"
                ])

            # Updated Records Sheet
            ws_updated = report_wb.create_sheet(title="Updated Records")
            ws_updated.append(["Excel Row", "Orbit ID", "Engineer Name", "Action Status", "Changed Columns", "Booking Date", "Travel Date", "Purpose", "Comments"])
            for r in existing_list:
                ws_updated.append([
                    r["excel_row"],
                    r.get("orbit_id") or "",
                    r.get("resolved_engineer_name") or r.get("original_engineer_name") or "",
                    "UPDATED",
                    r.get("changed_fields") or "",
                    str(r.get("booking_date")) if r.get("booking_date") else "",
                    str(r.get("travel_date")) if r.get("travel_date") else "",
                    r.get("purpose"),
                    r.get("comments")
                ])

            # Unchanged Records Sheet
            ws_unchanged = report_wb.create_sheet(title="Unchanged Records")
            ws_unchanged.append(["Excel Row", "Orbit ID", "Engineer Name", "Action Status", "Details", "Booking Date", "Travel Date", "Purpose", "Comments"])
            for r in unchanged_list:
                ws_unchanged.append([
                    r["excel_row"],
                    r.get("orbit_id") or "",
                    r.get("resolved_engineer_name") or r.get("original_engineer_name") or "",
                    "UNCHANGED",
                    "All supplied values match database",
                    str(r.get("booking_date")) if r.get("booking_date") else "",
                    str(r.get("travel_date")) if r.get("travel_date") else "",
                    r.get("purpose"),
                    r.get("comments")
                ])

            # Errors Sheet
            ws_errors = report_wb.create_sheet(title="Errors")
            ws_errors.append(["Excel Row", "Orbit ID", "Field", "Value", "Error"])
            for r in errors_list:
                for err in r.get("errors", []):
                    ws_errors.append([
                        r["excel_row"],
                        r.get("orbit_id") or "",
                        err.get("field") or "",
                        err.get("value") or "",
                        err.get("error") or ""
                    ])

            # Duplicates Sheet
            ws_dups = report_wb.create_sheet(title="Duplicates")
            ws_dups.append(["Excel Row", "Orbit ID", "Duplicate Key", "Reason"])
            for r in duplicates_list:
                ws_dups.append([
                    r["excel_row"],
                    r.get("orbit_id") or "",
                    r.get("duplicate_key") or "",
                    "Duplicate Travel row within Excel sheet"
                ])

            # Warnings Sheet
            ws_warn = report_wb.create_sheet(title="Warnings")
            ws_warn.append(["Excel Row", "Orbit ID", "Field", "Value", "Warning"])

            for sheet_obj in (ws_valid, ws_updated, ws_unchanged, ws_errors, ws_dups, ws_warn):
                for col in sheet_obj.columns:
                    max_len = max(len(str(cell.value or '')) for cell in col)
                    sheet_obj.column_dimensions[col[0].column_letter].width = max(max_len + 3, 12)

            os.makedirs(TEMP_REPORTS_DIR, exist_ok=True)
            report_filename = f"validation_report_{uuid_pkg.uuid4()}.xlsx"
            report_path = os.path.join(TEMP_REPORTS_DIR, report_filename)
            report_wb.save(report_path)
            t_report = time.perf_counter()

            final_status = "COMPLETED"
            if len(errors_list) > 0 or len(duplicates_list) > 0:
                final_status = "COMPLETED_WITH_ERRORS"

            bulk_upload_service.update_bulk_upload(
                db,
                upload_id=upload_id,
                status=final_status,
                report_file=report_filename,
                imported_rows=imported_count,
                failed_rows=failed_count
            )

            total_time = time.perf_counter() - start_time
            logger.info(
                "\nTravel upload:\n"
                "Rows detected: %d\n"
                "Excel parsing: %.4fs\n"
                "Engineer lookup: %.4fs\n"
                "Existing travel lookup: %.4fs\n"
                "Validation & Duplicate detection: %.4fs\n"
                "Database upsert & commit: %.4fs\n"
                "Report generation: %.4fs\n"
                "Total: %.4fs",
                total_rows,
                t_excel - start_time,
                t_engineer - t_excel,
                t_existing_lookup - t_engineer,
                t_validation - t_existing_lookup,
                t_insert - t_validation,
                t_report - t_insert,
                total_time
            )

            ingested_msg = f"Ingested {len(valid_rows_to_insert)} new travel records. Updated {len(existing_list)} existing travel records. {len(unchanged_list)} records were unchanged."
            if errors_list or duplicates_list:
                ingested_msg += " Some rows had validation errors or duplicates. See the validation report for details."

            return {
                "success": True,
                "rowsProcessed": total_rows,
                "errorsCount": len(errors_list),
                "inserted": len(valid_rows_to_insert),
                "updated": len(existing_list),
                "unchanged": len(unchanged_list),
                "message": ingested_msg,
                "report_url": f"/api/upload/download-report/{report_filename}"
            }

        if module_id == "up-performance":
            import time
            start_time = time.perf_counter()

            try:
                contents = await file.read()
                wb = openpyxl.load_workbook(io.BytesIO(contents))
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to parse Excel file. Please ensure it is a valid .xlsx file."
                )

            # Case-insensitive detection of the "Performance" sheet
            perf_sheet_name = None
            for name in wb.sheetnames:
                norm_name = name.strip().lower()
                if norm_name in ("performance", "performances", "performance details", "performance evaluations", "evaluations"):
                    perf_sheet_name = name
                    break

            if not perf_sheet_name:
                if len(wb.sheetnames) == 1:
                    perf_sheet_name = wb.sheetnames[0]
                else:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="Excel workbook must contain a 'Performance' or 'Performance Details' sheet."
                    )

            sheet = wb[perf_sheet_name]
            
            # Map headers
            first_row = [sheet.cell(row=1, column=c).value for c in range(1, sheet.max_column + 1)]
            col_indices = {}
            for idx, val in enumerate(first_row):
                if val is not None:
                    norm = normalize_header(val)
                    mapped_field = PERFORMANCE_HEADER_MAP.get(norm)
                    if mapped_field:
                        col_indices[mapped_field] = idx + 1

            # Required headers: schedule_id, orbit_id, actual_start_date, score
            required_cols = [("schedule_id", "Schedule ID"), ("orbit_id", "Orbit ID"), ("actual_start_date", "Actual Start Date"), ("score", "Score")]
            for req_field, req_name in required_cols:
                if req_field not in col_indices:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Required header '{req_name}' is missing from the Excel sheet."
                    )

            # Gather all non-blank rows
            raw_rows = []
            for r in range(2, sheet.max_row + 1):
                is_blank = True
                for c in range(1, sheet.max_column + 1):
                    val = sheet.cell(row=r, column=c).value
                    if val is not None and str(val).strip() != "":
                        is_blank = False
                        break
                if is_blank:
                    continue

                row_dict = {"excel_row": r}
                
                # Retrieve original engineer name if present
                original_engineer_name = None
                for idx, val in enumerate(first_row):
                    if val is not None:
                        norm = normalize_header(val)
                        if norm in ("engineername", "name"):
                            original_engineer_name = clean_val(sheet.cell(row=r, column=idx + 1).value)
                            break
                row_dict["original_engineer_name"] = original_engineer_name

                # Load fields from mapped headers
                for field, col_idx in col_indices.items():
                    row_dict[field] = clean_val(sheet.cell(row=r, column=col_idx).value)

                # Fill missing columns
                for field in set(PERFORMANCE_HEADER_MAP.values()):
                    if field not in row_dict:
                        row_dict[field] = None

                raw_rows.append(row_dict)

            if not raw_rows:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="The Performance sheet is empty or contains no rows."
                )

            t_excel = time.perf_counter()

            # Pre-fetch Schedules and Engineers by Schedule ID
            raw_sch_ids = set()
            for row in raw_rows:
                v = row.get("schedule_id")
                if v:
                    try:
                        raw_sch_ids.add(uuid_pkg.UUID(str(v).strip()))
                    except ValueError:
                        pass

            db_schedules_map = {}
            if raw_sch_ids:
                sches = db.scalars(
                    select(Schedule).where(Schedule.schedule_id.in_(list(raw_sch_ids)))
                ).all()
                db_schedules_map = {sch.schedule_id: sch for sch in sches}

            sch_engineer_ids = {sch.engineer_id for sch in db_schedules_map.values() if sch.engineer_id}
            db_engineers_map = {}
            if sch_engineer_ids:
                engs = db.scalars(
                    select(Engineer).where(Engineer.engineer_id.in_(list(sch_engineer_ids)))
                ).all()
                db_engineers_map = {eng.engineer_id: eng for eng in engs}

            t_engineer = time.perf_counter()

            existing_perf_map = {}
            if raw_sch_ids:
                perfs = db.scalars(
                    select(Performance).where(Performance.schedule_id.in_(list(raw_sch_ids)))
                ).all()
                for p in perfs:
                    existing_perf_map[(norm_uuid(p.schedule_id), norm_date(p.actual_start_date))] = p

            t_existing_lookup = time.perf_counter()

            errors_list = []
            duplicates_list = []
            existing_list = []
            unchanged_list = []
            valid_rows_to_insert = []
            seen_keys = set()

            total_rows = len(raw_rows)

            for row_dict in raw_rows:
                row_errors = []
                
                # 1. Validate Schedule ID
                raw_sch_str = str(row_dict.get("schedule_id") or "").strip()
                if not raw_sch_str:
                    row_errors.append({
                        "field": "Schedule ID",
                        "value": "",
                        "error": "Schedule ID is required."
                    })
                    row_dict["errors"] = row_errors
                    errors_list.append(row_dict)
                    continue

                parsed_sch_id = None
                try:
                    parsed_sch_id = uuid_pkg.UUID(raw_sch_str)
                except ValueError:
                    row_errors.append({
                        "field": "Schedule ID",
                        "value": raw_sch_str,
                        "error": f"Schedule {raw_sch_str} was not found. Performance record was not created."
                    })
                    row_dict["errors"] = row_errors
                    errors_list.append(row_dict)
                    continue

                target_sch = db_schedules_map.get(parsed_sch_id)
                if not target_sch:
                    row_errors.append({
                        "field": "Schedule ID",
                        "value": raw_sch_str,
                        "error": f"Schedule {raw_sch_str} was not found. Performance record was not created."
                    })
                    row_dict["errors"] = row_errors
                    errors_list.append(row_dict)
                    continue

                # 2. Resolve Engineer from Schedule
                eng = db_engineers_map.get(target_sch.engineer_id) if target_sch.engineer_id else None
                if not eng or eng.company_id != target_company_id:
                    row_errors.append({
                        "field": "Schedule ID",
                        "value": raw_sch_str,
                        "error": f"Schedule {raw_sch_str} has no valid engineer in the selected company."
                    })
                    row_dict["errors"] = row_errors
                    errors_list.append(row_dict)
                    continue

                # 3. Validate Orbit ID matches schedule's engineer
                uploaded_orbit_id = str(row_dict.get("orbit_id") or "").strip()
                if not uploaded_orbit_id:
                    row_errors.append({
                        "field": "Orbit ID",
                        "value": "",
                        "error": "Orbit ID is required."
                    })
                    row_dict["errors"] = row_errors
                    errors_list.append(row_dict)
                    continue

                if uploaded_orbit_id != eng.orbit_id:
                    row_errors.append({
                        "field": "Orbit ID",
                        "value": uploaded_orbit_id,
                        "error": f"Orbit ID {uploaded_orbit_id} does not match Schedule {parsed_sch_id}, which belongs to Orbit ID {eng.orbit_id}."
                    })
                    row_dict["errors"] = row_errors
                    errors_list.append(row_dict)
                    continue

                row_dict["schedule_id"] = target_sch.schedule_id
                row_dict["engineer_id"] = eng.engineer_id
                row_dict["resolved_engineer_name"] = eng.engineer_name

                # 4. Parse dates
                actual_start_date = None
                start_val = row_dict.get("actual_start_date")
                if start_val is not None and str(start_val).strip() != "":
                    try:
                        actual_start_date = parse_date(start_val)
                    except ValueError:
                        row_errors.append({
                            "field": "Actual Start Date",
                            "value": str(start_val),
                            "error": "Invalid actual start date format."
                        })
                else:
                    row_errors.append({
                        "field": "Actual Start Date",
                        "value": "",
                        "error": "Actual Start Date is required."
                    })

                actual_end_date = None
                end_val = row_dict.get("actual_end_date")
                if end_val is not None and str(end_val).strip() != "":
                    try:
                        actual_end_date = parse_date(end_val)
                    except ValueError:
                        row_errors.append({
                            "field": "Actual End Date",
                            "value": str(end_val),
                            "error": "Invalid actual end date format."
                        })

                if actual_start_date and actual_end_date and actual_end_date < actual_start_date:
                    row_errors.append({
                        "field": "Actual End Date",
                        "value": str(end_val),
                        "error": "actual_end_date should not be earlier than actual_start_date"
                    })

                # 5. Score / Rating validation (1.0 to 5.0)
                score = None
                score_val = row_dict.get("score")
                if score_val is not None and str(score_val).strip() != "":
                    try:
                        score = float(score_val)
                        if score < 1.0 or score > 5.0:
                            row_errors.append({
                                "field": "Score",
                                "value": str(score_val),
                                "error": "Performance rating score must be between 1.0 and 5.0"
                            })
                    except ValueError:
                        row_errors.append({
                            "field": "Score",
                            "value": str(score_val),
                            "error": "Score must be a valid number."
                        })
                else:
                    row_errors.append({
                        "field": "Score",
                        "value": "",
                        "error": "Score is required."
                    })

                # 6. Escalation & Escalation Reason validation
                escalation_val = row_dict.get("escalation")
                escalation = False
                if escalation_val is not None:
                    if isinstance(escalation_val, bool):
                        escalation = escalation_val
                    else:
                        str_esc = str(escalation_val).strip().lower()
                        if str_esc in ("true", "yes", "y", "1"):
                            escalation = True
                        elif str_esc in ("false", "no", "n", "0"):
                            escalation = False
                        else:
                            row_errors.append({
                                "field": "Escalation",
                                "value": str(escalation_val),
                                "error": "Escalation must be true or false."
                            })

                escalation_reason = row_dict.get("escalation_reason")
                if escalation and not (escalation_reason and str(escalation_reason).strip()):
                    row_errors.append({
                        "field": "Escalation Reason",
                        "value": "",
                        "error": "Escalation reason is required when escalation is enabled."
                    })

                if row_errors:
                    row_dict["errors"] = row_errors
                    errors_list.append(row_dict)
                    continue

                row_dict["actual_start_date"] = actual_start_date
                row_dict["actual_end_date"] = actual_end_date
                row_dict["score"] = score
                row_dict["escalation"] = escalation
                row_dict["escalation_reason"] = escalation_reason
                row_dict["feedback"] = row_dict.get("feedback")
                row_dict["attachment"] = row_dict.get("attachment")

                # 7. Duplicate row detection in Excel sheet
                row_key = (norm_uuid(target_sch.schedule_id), norm_date(actual_start_date))

                if row_key in seen_keys:
                    row_dict["duplicate_key"] = f"ScheduleID: {target_sch.schedule_id}, ActualStartDate: {actual_start_date}"
                    duplicates_list.append(row_dict)
                    continue
                seen_keys.add(row_key)

                # 8. Upsert check for Row-Level Upsert & Change Detection
                existing_perf_record = existing_perf_map.get(row_key)
                if existing_perf_record:
                    epf = existing_perf_record
                    row_dict["existing_perf"] = epf
                    changes = []

                    if "actual_end_date" in col_indices and row_dict.get("actual_end_date") != epf.actual_end_date:
                        changes.append(f"Actual End Date: '{epf.actual_end_date}' -> '{row_dict.get('actual_end_date')}'")
                        epf.actual_end_date = row_dict.get("actual_end_date")

                    if "score" in col_indices and row_dict.get("score") != epf.score:
                        changes.append(f"Score: '{epf.score}' -> '{row_dict.get('score')}'")
                        epf.score = row_dict.get("score")

                    if "escalation" in col_indices and row_dict.get("escalation") != epf.escalation:
                        changes.append(f"Escalation: '{epf.escalation}' -> '{row_dict.get('escalation')}'")
                        epf.escalation = row_dict.get("escalation")

                    if "escalation_reason" in col_indices and row_dict.get("escalation_reason") != epf.escalation_reason:
                        changes.append(f"Escalation Reason: '{epf.escalation_reason}' -> '{row_dict.get('escalation_reason')}'")
                        epf.escalation_reason = row_dict.get("escalation_reason")

                    if "feedback" in col_indices and row_dict.get("feedback") != epf.feedback:
                        changes.append(f"Feedback: '{epf.feedback}' -> '{row_dict.get('feedback')}'")
                        epf.feedback = row_dict.get("feedback")

                    if "attachment" in col_indices and row_dict.get("attachment") != epf.attachment:
                        changes.append(f"Attachment: '{epf.attachment}' -> '{row_dict.get('attachment')}'")
                        epf.attachment = row_dict.get("attachment")

                    if changes:
                        epf.updated_at = datetime.utcnow()
                        row_dict["update_status"] = "UPDATED"
                        row_dict["changed_fields"] = "; ".join(changes)
                        existing_list.append(row_dict)
                    else:
                        row_dict["update_status"] = "UNCHANGED"
                        row_dict["changed_fields"] = "No fields modified"
                        unchanged_list.append(row_dict)
                else:
                    valid_rows_to_insert.append(row_dict)

            t_validation = time.perf_counter()

            # Update BulkUpload stats
            bulk_upload_service.update_bulk_upload(
                db,
                upload_id=upload_id,
                total_rows=total_rows,
                valid_rows=len(valid_rows_to_insert),
                error_rows=len(errors_list),
                duplicate_rows=len(duplicates_list),
                existing_rows=len(existing_list),
                warning_rows=0,
                status="READY"
            )

            # Transition to IMPORTING
            bulk_upload_service.update_bulk_upload(
                db,
                upload_id=upload_id,
                status="IMPORTING"
            )

            imported_count = 0
            failed_count = 0
            try:
                # 1. Bulk Insert New Performance evaluations
                perfs_to_add = []
                for item in valid_rows_to_insert:
                    db_pf = Performance(
                        performance_id=uuid_pkg.uuid4(),
                        schedule_id=item["schedule_id"],
                        actual_start_date=item["actual_start_date"],
                        actual_end_date=item["actual_end_date"],
                        escalation=item["escalation"],
                        escalation_reason=item["escalation_reason"],
                        feedback=item["feedback"],
                        score=item["score"],
                        attachment=item["attachment"],
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    perfs_to_add.append(db_pf)
                if perfs_to_add:
                    db.add_all(perfs_to_add)

                db.commit()
                imported_count = len(valid_rows_to_insert) + len(existing_list)
            except Exception as insert_err:
                db.rollback()
                failed_count = len(valid_rows_to_insert) + len(existing_list)
                bulk_upload_service.update_bulk_upload(
                    db,
                    upload_id=upload_id,
                    status="FAILED",
                    failed_rows=failed_count
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Database ingestion failed: {str(insert_err)}"
                )
            t_insert = time.perf_counter()

            # Generate report workbook
            report_wb = openpyxl.Workbook()
            ws_summary = report_wb.active
            ws_summary.title = "Summary"
            ws_summary.append(["ORMP Performance Bulk Ingestion Report"])
            ws_summary.append([])
            ws_summary.append(["File Name", file.filename])
            ws_summary.append(["Upload Type", "performance"])
            ws_summary.append(["Uploaded By", current_user.full_name])
            ws_summary.append(["Upload Date", datetime.now().strftime("%Y-%m-%d %H:%M:%S")])
            ws_summary.append(["Target Company", company.company_name])
            ws_summary.append(["Company UUID", str(company.company_id)])
            ws_summary.append([])
            ws_summary.append(["Metric", "Count"])
            ws_summary.append(["Total Rows", total_rows])
            ws_summary.append(["Inserted Records", len(valid_rows_to_insert)])
            ws_summary.append(["Updated Records", len(existing_list)])
            ws_summary.append(["Unchanged Records", len(unchanged_list)])
            ws_summary.append(["Error Rows", len(errors_list)])
            ws_summary.append(["Duplicate Rows", len(duplicates_list)])
            ws_summary.append(["Warning Rows", 0])
            
            for col in ws_summary.columns:
                max_len = max(len(str(cell.value or '')) for cell in col)
                ws_summary.column_dimensions[col[0].column_letter].width = max(max_len + 3, 12)

            headers_valid = [
                "Excel Row", "Schedule ID", "Orbit ID", "Engineer Name", "Score", "Actual Start", 
                "Actual End", "Escalation", "Escalation Reason", "Feedback", "Status"
            ]

            # Valid Records Sheet (Inserted)
            ws_valid = report_wb.create_sheet(title="Valid Records")
            ws_valid.append(headers_valid)
            for r in valid_rows_to_insert:
                ws_valid.append([
                    r["excel_row"],
                    str(r.get("schedule_id") or ""),
                    r.get("orbit_id"),
                    r.get("resolved_engineer_name"),
                    r.get("score"),
                    str(r.get("actual_start_date")) if r.get("actual_start_date") else "",
                    str(r.get("actual_end_date")) if r.get("actual_end_date") else "",
                    "Yes" if r.get("escalation") else "No",
                    r.get("escalation_reason"),
                    r.get("feedback"),
                    "INSERTED"
                ])

            # Updated Records Sheet
            ws_updated = report_wb.create_sheet(title="Updated Records")
            ws_updated.append(["Excel Row", "Schedule ID", "Orbit ID", "Engineer Name", "Action Status", "Changed Columns", "Score", "Escalation", "Escalation Reason", "Feedback"])
            for r in existing_list:
                ws_updated.append([
                    r["excel_row"],
                    str(r.get("schedule_id") or ""),
                    r.get("orbit_id") or "",
                    r.get("resolved_engineer_name") or r.get("original_engineer_name") or "",
                    "UPDATED",
                    r.get("changed_fields") or "",
                    r.get("score"),
                    "Yes" if r.get("escalation") else "No",
                    r.get("escalation_reason"),
                    r.get("feedback")
                ])

            # Unchanged Records Sheet
            ws_unchanged = report_wb.create_sheet(title="Unchanged Records")
            ws_unchanged.append(["Excel Row", "Schedule ID", "Orbit ID", "Engineer Name", "Action Status", "Details", "Score", "Escalation", "Escalation Reason", "Feedback"])
            for r in unchanged_list:
                ws_unchanged.append([
                    r["excel_row"],
                    str(r.get("schedule_id") or ""),
                    r.get("orbit_id") or "",
                    r.get("resolved_engineer_name") or r.get("original_engineer_name") or "",
                    "UNCHANGED",
                    "All supplied values match database",
                    r.get("score"),
                    "Yes" if r.get("escalation") else "No",
                    r.get("escalation_reason"),
                    r.get("feedback")
                ])

            # Errors Sheet
            ws_errors = report_wb.create_sheet(title="Errors")
            ws_errors.append(["Excel Row", "Orbit ID", "Field", "Value", "Error"])
            for r in errors_list:
                for err in r.get("errors", []):
                    ws_errors.append([
                        r["excel_row"],
                        r.get("orbit_id") or "",
                        err.get("field") or "",
                        err.get("value") or "",
                        err.get("error") or ""
                    ])

            # Duplicates Sheet
            ws_dups = report_wb.create_sheet(title="Duplicates")
            ws_dups.append(["Excel Row", "Orbit ID", "Duplicate Key", "Reason"])
            for r in duplicates_list:
                ws_dups.append([
                    r["excel_row"],
                    r.get("orbit_id") or "",
                    r.get("duplicate_key") or "",
                    "Duplicate Performance row within Excel sheet"
                ])

            # Warnings Sheet
            ws_warn = report_wb.create_sheet(title="Warnings")
            ws_warn.append(["Excel Row", "Schedule ID", "Orbit ID", "Field", "Value", "Warning"])

            for sheet_obj in (ws_valid, ws_updated, ws_unchanged, ws_errors, ws_dups, ws_warn):
                for col in sheet_obj.columns:
                    max_len = max(len(str(cell.value or '')) for cell in col)
                    sheet_obj.column_dimensions[col[0].column_letter].width = max(max_len + 3, 12)

            os.makedirs(TEMP_REPORTS_DIR, exist_ok=True)
            report_filename = f"validation_report_{uuid_pkg.uuid4()}.xlsx"
            report_path = os.path.join(TEMP_REPORTS_DIR, report_filename)
            report_wb.save(report_path)
            t_report = time.perf_counter()

            final_status = "COMPLETED"
            if len(errors_list) > 0 or len(duplicates_list) > 0:
                final_status = "COMPLETED_WITH_ERRORS"

            bulk_upload_service.update_bulk_upload(
                db,
                upload_id=upload_id,
                status=final_status,
                report_file=report_filename,
                imported_rows=imported_count,
                failed_rows=failed_count
            )

            total_time = time.perf_counter() - start_time
            logger.info(
                "\nPerformance upload:\n"
                "Rows detected: %d\n"
                "Excel parsing: %.4fs\n"
                "Engineer lookup: %.4fs\n"
                "Existing performance lookup: %.4fs\n"
                "Validation & Duplicate detection: %.4fs\n"
                "Database upsert & commit: %.4fs\n"
                "Report generation: %.4fs\n"
                "Total: %.4fs",
                total_rows,
                t_excel - start_time,
                t_engineer - t_excel,
                t_existing_lookup - t_engineer,
                t_validation - t_existing_lookup,
                t_insert - t_validation,
                t_report - t_insert,
                total_time
            )

            ingested_msg = f"Ingested {len(valid_rows_to_insert)} new performance records. Updated {len(existing_list)} existing performance records. {len(unchanged_list)} records were unchanged."
            if errors_list or duplicates_list:
                ingested_msg += " Some rows had validation errors or duplicates. See the validation report for details."

            return {
                "success": True,
                "rowsProcessed": total_rows,
                "errorsCount": len(errors_list),
                "inserted": len(valid_rows_to_insert),
                "updated": len(existing_list),
                "unchanged": len(unchanged_list),
                "message": ingested_msg,
                "report_url": f"/api/upload/download-report/{report_filename}"
            }

        if module_id == "up-leave":
            import time
            start_time = time.perf_counter()

            try:
                contents = await file.read()
                wb = openpyxl.load_workbook(io.BytesIO(contents))
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to parse Excel file. Please ensure it is a valid .xlsx file."
                )

            # Case-insensitive detection of the "Leave" sheet
            leave_sheet_name = None
            for name in wb.sheetnames:
                norm_name = name.strip().lower()
                if norm_name in ("leave", "leaves", "leave details", "leave records", "absences"):
                    leave_sheet_name = name
                    break

            if not leave_sheet_name:
                if len(wb.sheetnames) == 1:
                    leave_sheet_name = wb.sheetnames[0]
                else:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="Excel workbook must contain a 'Leave' or 'Leaves' sheet."
                    )

            sheet = wb[leave_sheet_name]
            
            # Map headers
            first_row = [sheet.cell(row=1, column=c).value for c in range(1, sheet.max_column + 1)]
            col_indices = {}
            for idx, val in enumerate(first_row):
                if val is not None:
                    norm = normalize_header(val)
                    mapped_field = LEAVE_HEADER_MAP.get(norm)
                    if mapped_field:
                        col_indices[mapped_field] = idx + 1

            # Check required columns: orbit_id, requested_date
            if "orbit_id" not in col_indices:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Required header 'Orbit ID' is missing from the Excel sheet."
                )
            if "requested_date" not in col_indices:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Required header 'Requested Date' (Absence Date) is missing from the Excel sheet."
                )

            # Gather all non-blank rows
            raw_rows = []
            for r in range(2, sheet.max_row + 1):
                is_blank = True
                for c in range(1, sheet.max_column + 1):
                    val = sheet.cell(row=r, column=c).value
                    if val is not None and str(val).strip() != "":
                        is_blank = False
                        break
                if is_blank:
                    continue

                row_dict = {"excel_row": r}
                
                # Retrieve original engineer name if present
                original_engineer_name = None
                for idx, val in enumerate(first_row):
                    if val is not None:
                        norm = normalize_header(val)
                        if norm in ("engineername", "name"):
                            original_engineer_name = clean_val(sheet.cell(row=r, column=idx + 1).value)
                            break
                row_dict["original_engineer_name"] = original_engineer_name

                # Load fields from mapped headers
                for field, col_idx in col_indices.items():
                    row_dict[field] = clean_val(sheet.cell(row=r, column=col_idx).value)

                # Fill missing columns
                for field in set(LEAVE_HEADER_MAP.values()):
                    if field not in row_dict:
                        row_dict[field] = None

                raw_rows.append(row_dict)

            if not raw_rows:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="The Leave sheet is empty or contains no rows."
                )

            t_excel = time.perf_counter()

            # Bulk Engineer Resolution
            unique_orbit_ids = {
                norm_str(row.get("orbit_id"))
                for row in raw_rows
                if row.get("orbit_id") and norm_str(row.get("orbit_id")) != ""
            }

            db_engineers = []
            if unique_orbit_ids:
                db_engineers = db.scalars(
                    select(Engineer).where(
                        func.lower(Engineer.orbit_id).in_(list(unique_orbit_ids)),
                        Engineer.company_id == target_company_id
                    )
                ).all()

            orbit_to_engineer = {
                norm_str(eng.orbit_id): (eng.engineer_id, eng.engineer_name)
                for eng in db_engineers
            }
            t_engineer = time.perf_counter()

            # Query existing leave records for resolved engineers
            resolved_engineer_ids = [val[0] for val in orbit_to_engineer.values()]
            db_leaves = []
            if resolved_engineer_ids:
                db_leaves = db.scalars(
                    select(Leave).where(
                        Leave.engineer_id.in_(resolved_engineer_ids)
                    )
                ).all()

            # Map existing leave records by (engineer_id, requested_date, leave_type_lower)
            existing_leave_map = {}
            for lv in db_leaves:
                lt_key = norm_str(lv.leave_type or "Annual Leave")
                existing_leave_map[(norm_uuid(lv.engineer_id), norm_date(lv.requested_date), lt_key)] = lv

            t_existing_lookup = time.perf_counter()

            errors_list = []
            duplicates_list = []
            existing_list = []
            unchanged_list = []
            valid_rows_to_insert = []
            seen_keys = set()

            total_rows = len(raw_rows)

            for row_dict in raw_rows:
                row_errors = []
                
                # 1. Validate required fields: orbit_id
                orbit_id = row_dict.get("orbit_id")
                if not orbit_id:
                    row_errors.append({
                        "field": "Orbit ID",
                        "value": "",
                        "error": "Orbit ID is required."
                    })
                    row_dict["errors"] = row_errors
                    errors_list.append(row_dict)
                    continue

                # 2. Resolve engineer using bulk lookup
                eng_info = orbit_to_engineer.get(norm_str(orbit_id))
                if not eng_info:
                    row_errors.append({
                        "field": "Orbit ID",
                        "value": str(orbit_id),
                        "error": f"Engineer with Orbit ID '{orbit_id}' does not exist in the selected company."
                    })
                    row_dict["errors"] = row_errors
                    errors_list.append(row_dict)
                    continue

                engineer_id, resolved_engineer_name = eng_info
                row_dict["engineer_id"] = engineer_id
                row_dict["resolved_engineer_name"] = resolved_engineer_name

                # 3. Parse and validate dates
                requested_date = None
                req_date_val = row_dict.get("requested_date")
                if req_date_val is not None:
                    try:
                        requested_date = parse_date(req_date_val)
                    except ValueError:
                        row_errors.append({
                            "field": "Requested Date",
                            "value": str(req_date_val),
                            "error": "Invalid requested date format."
                        })
                else:
                    row_errors.append({
                        "field": "Requested Date",
                        "value": "",
                        "error": "Requested Date is required."
                    })

                requested_on = None
                req_on_val = row_dict.get("requested_on")
                if req_on_val is not None:
                    try:
                        requested_on = parse_date(req_on_val)
                    except ValueError:
                        row_errors.append({
                            "field": "Requested On",
                            "value": str(req_on_val),
                            "error": "Invalid requested on submission date format."
                        })
                else:
                    requested_on = date.today()

                if requested_date and requested_on and requested_on > requested_date:
                    row_errors.append({
                        "field": "Requested On",
                        "value": str(req_on_val),
                        "error": "requested_on date cannot be later than requested_date"
                    })

                leave_type = row_dict.get("leave_type") or "Annual Leave"
                approval_status = row_dict.get("approval_status") or "Pending"
                
                # Normalize approval_status
                norm_status = str(approval_status).strip().title()
                if norm_status not in ("Pending", "Approved", "Rejected", "Cancelled"):
                    norm_status = "Pending"
                approval_status = norm_status

                if row_errors:
                    row_dict["errors"] = row_errors
                    errors_list.append(row_dict)
                    continue

                row_dict["requested_date"] = requested_date
                row_dict["requested_on"] = requested_on
                row_dict["leave_type"] = leave_type
                row_dict["approval_status"] = approval_status

                # 4. Duplicate row detection in Excel sheet
                lt_clean = norm_str(leave_type or "Annual Leave")
                row_key = (norm_uuid(engineer_id), norm_date(requested_date), lt_clean)

                if row_key in seen_keys:
                    row_dict["duplicate_key"] = f"OrbitID: {orbit_id}, RequestedDate: {requested_date}, LeaveType: {leave_type}"
                    duplicates_list.append(row_dict)
                    continue
                seen_keys.add(row_key)

                # 5. Upsert check for Row-Level Upsert & Change Detection
                existing_leave_record = existing_leave_map.get(row_key)
                if existing_leave_record:
                    elv = existing_leave_record
                    row_dict["existing_leave"] = elv
                    changes = []

                    if "requested_on" in col_indices and row_dict.get("requested_on") != elv.requested_on:
                        changes.append(f"Requested On: '{elv.requested_on}' -> '{row_dict.get('requested_on')}'")
                        elv.requested_on = row_dict.get("requested_on")

                    if "approval_status" in col_indices and row_dict.get("approval_status") != elv.approval_status:
                        changes.append(f"Approval Status: '{elv.approval_status}' -> '{row_dict.get('approval_status')}'")
                        elv.approval_status = row_dict.get("approval_status")

                    if changes:
                        elv.updated_at = datetime.utcnow()
                        row_dict["update_status"] = "UPDATED"
                        row_dict["changed_fields"] = "; ".join(changes)
                        existing_list.append(row_dict)
                    else:
                        row_dict["update_status"] = "UNCHANGED"
                        row_dict["changed_fields"] = "No fields modified"
                        unchanged_list.append(row_dict)
                else:
                    valid_rows_to_insert.append(row_dict)

            t_validation = time.perf_counter()

            # Update BulkUpload stats
            bulk_upload_service.update_bulk_upload(
                db,
                upload_id=upload_id,
                total_rows=total_rows,
                valid_rows=len(valid_rows_to_insert),
                error_rows=len(errors_list),
                duplicate_rows=len(duplicates_list),
                existing_rows=len(existing_list),
                warning_rows=0,
                status="READY"
            )

            # Transition to IMPORTING
            bulk_upload_service.update_bulk_upload(
                db,
                upload_id=upload_id,
                status="IMPORTING"
            )

            imported_count = 0
            failed_count = 0
            try:
                # 1. Bulk Insert New Leave records
                leaves_to_add = []
                for item in valid_rows_to_insert:
                    db_lv = Leave(
                        leave_id=uuid_pkg.uuid4(),
                        engineer_id=item["engineer_id"],
                        leave_type=item["leave_type"],
                        requested_date=item["requested_date"],
                        requested_on=item["requested_on"],
                        approval_status=item["approval_status"],
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    leaves_to_add.append(db_lv)
                if leaves_to_add:
                    db.add_all(leaves_to_add)

                db.commit()
                imported_count = len(valid_rows_to_insert) + len(existing_list)
            except Exception as insert_err:
                db.rollback()
                failed_count = len(valid_rows_to_insert) + len(existing_list)
                bulk_upload_service.update_bulk_upload(
                    db,
                    upload_id=upload_id,
                    status="FAILED",
                    failed_rows=failed_count
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Database ingestion failed: {str(insert_err)}"
                )
            t_insert = time.perf_counter()

            # 8. Generate report workbook
            report_wb = openpyxl.Workbook()
            ws_summary = report_wb.active
            ws_summary.title = "Summary"
            ws_summary.append(["ORMP Leave Bulk Ingestion Report"])
            ws_summary.append([])
            ws_summary.append(["File Name", file.filename])
            ws_summary.append(["Upload Type", "leave"])
            ws_summary.append(["Uploaded By", current_user.full_name])
            ws_summary.append(["Upload Date", datetime.now().strftime("%Y-%m-%d %H:%M:%S")])
            ws_summary.append(["Target Company", company.company_name])
            ws_summary.append(["Company UUID", str(company.company_id)])
            ws_summary.append([])
            ws_summary.append(["Metric", "Count"])
            ws_summary.append(["Total Rows", total_rows])
            ws_summary.append(["Inserted Records", len(valid_rows_to_insert)])
            ws_summary.append(["Updated Records", len(existing_list)])
            ws_summary.append(["Unchanged Records", len(unchanged_list)])
            ws_summary.append(["Error Rows", len(errors_list)])
            ws_summary.append(["Duplicate Rows", len(duplicates_list)])
            ws_summary.append(["Warning Rows", 0])
            
            for col in ws_summary.columns:
                max_len = max(len(str(cell.value or '')) for cell in col)
                ws_summary.column_dimensions[col[0].column_letter].width = max(max_len + 3, 12)

            headers_valid = [
                "Excel Row", "Orbit ID", "Engineer Name", "Leave Type", 
                "Requested Date", "Requested On", "Approval Status", "Status"
            ]

            # Valid Records Sheet (Inserted)
            ws_valid = report_wb.create_sheet(title="Valid Records")
            ws_valid.append(headers_valid)
            for r in valid_rows_to_insert:
                ws_valid.append([
                    r["excel_row"],
                    r.get("orbit_id"),
                    r.get("resolved_engineer_name"),
                    r.get("leave_type"),
                    str(r.get("requested_date")) if r.get("requested_date") else "",
                    str(r.get("requested_on")) if r.get("requested_on") else "",
                    r.get("approval_status"),
                    "INSERTED"
                ])

            # Updated Records Sheet
            ws_updated = report_wb.create_sheet(title="Updated Records")
            ws_updated.append(["Excel Row", "Orbit ID", "Engineer Name", "Action Status", "Changed Columns", "Leave Type", "Requested Date", "Requested On", "Approval Status"])
            for r in existing_list:
                ws_updated.append([
                    r["excel_row"],
                    r.get("orbit_id") or "",
                    r.get("resolved_engineer_name") or r.get("original_engineer_name") or "",
                    "UPDATED",
                    r.get("changed_fields") or "",
                    r.get("leave_type"),
                    str(r.get("requested_date")) if r.get("requested_date") else "",
                    str(r.get("requested_on")) if r.get("requested_on") else "",
                    r.get("approval_status")
                ])

            # Unchanged Records Sheet
            ws_unchanged = report_wb.create_sheet(title="Unchanged Records")
            ws_unchanged.append(["Excel Row", "Orbit ID", "Engineer Name", "Action Status", "Details", "Leave Type", "Requested Date", "Requested On", "Approval Status"])
            for r in unchanged_list:
                ws_unchanged.append([
                    r["excel_row"],
                    r.get("orbit_id") or "",
                    r.get("resolved_engineer_name") or r.get("original_engineer_name") or "",
                    "UNCHANGED",
                    "All supplied values match database",
                    r.get("leave_type"),
                    str(r.get("requested_date")) if r.get("requested_date") else "",
                    str(r.get("requested_on")) if r.get("requested_on") else "",
                    r.get("approval_status")
                ])

            # Errors Sheet
            ws_errors = report_wb.create_sheet(title="Errors")
            ws_errors.append(["Excel Row", "Orbit ID", "Field", "Value", "Error"])
            for r in errors_list:
                for err in r.get("errors", []):
                    ws_errors.append([
                        r["excel_row"],
                        r.get("orbit_id") or "",
                        err.get("field") or "",
                        err.get("value") or "",
                        err.get("error") or ""
                    ])

            # Duplicates Sheet
            ws_dups = report_wb.create_sheet(title="Duplicates")
            ws_dups.append(["Excel Row", "Orbit ID", "Duplicate Key", "Reason"])
            for r in duplicates_list:
                ws_dups.append([
                    r["excel_row"],
                    r.get("orbit_id") or "",
                    r.get("duplicate_key") or "",
                    "Duplicate Leave row within Excel sheet"
                ])

            # Warnings Sheet
            ws_warn = report_wb.create_sheet(title="Warnings")
            ws_warn.append(["Excel Row", "Orbit ID", "Field", "Value", "Warning"])

            for sheet_obj in (ws_valid, ws_updated, ws_unchanged, ws_errors, ws_dups, ws_warn):
                for col in sheet_obj.columns:
                    max_len = max(len(str(cell.value or '')) for cell in col)
                    sheet_obj.column_dimensions[col[0].column_letter].width = max(max_len + 3, 12)

            os.makedirs(TEMP_REPORTS_DIR, exist_ok=True)
            report_filename = f"validation_report_{uuid_pkg.uuid4()}.xlsx"
            report_path = os.path.join(TEMP_REPORTS_DIR, report_filename)
            report_wb.save(report_path)
            t_report = time.perf_counter()

            final_status = "COMPLETED"
            if len(errors_list) > 0 or len(duplicates_list) > 0:
                final_status = "COMPLETED_WITH_ERRORS"

            bulk_upload_service.update_bulk_upload(
                db,
                upload_id=upload_id,
                status=final_status,
                report_file=report_filename,
                imported_rows=imported_count,
                failed_rows=failed_count
            )

            ingested_msg = f"Ingested {len(valid_rows_to_insert)} new leave records. Updated {len(existing_list)} existing leave records. {len(unchanged_list)} records were unchanged."
            if errors_list or duplicates_list:
                ingested_msg += " Some rows had validation errors or duplicates. See the validation report for details."

            return {
                "success": True,
                "rowsProcessed": total_rows,
                "errorsCount": len(errors_list),
                "inserted": len(valid_rows_to_insert),
                "updated": len(existing_list),
                "unchanged": len(unchanged_list),
                "message": ingested_msg,
                "report_url": f"/api/upload/download-report/{report_filename}"
            }

            total_time = time.perf_counter() - start_time
            logger.info(
                "\nLeave upload:\n"
                "Rows detected: %d\n"
                "Excel parsing: %.4fs\n"
                "Engineer lookup: %.4fs\n"
                "Existing leave lookup: %.4fs\n"
                "Validation & Duplicate detection: %.4fs\n"
                "Database upsert & commit: %.4fs\n"
                "Report generation: %.4fs\n"
                "Total: %.4fs",
                total_rows,
                t_excel - start_time,
                t_engineer - t_excel,
                t_existing_lookup - t_engineer,
                t_validation - t_existing_lookup,
                t_insert - t_validation,
                t_report - t_insert,
                total_time
            )

            ingested_msg = f"Ingested {len(valid_rows_to_insert)} new leave records. Updated {len(existing_list)} existing leave records. {len(unchanged_list)} records were unchanged."
            if errors_list or duplicates_list:
                ingested_msg += " Some rows had validation errors or duplicates. See the validation report for details."

            return {
                "success": True,
                "rowsProcessed": total_rows,
                "errorsCount": len(errors_list),
                "message": ingested_msg,
                "report_url": f"/api/upload/download-report/{report_filename}"
            }

        if module_id == "up-engineers":
            try:
                contents = await file.read()
                wb = openpyxl.load_workbook(io.BytesIO(contents))
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to parse Excel file. Please ensure it is a valid .xlsx file."
                )

            # 2. Case-insensitive detection of the "Engineer" sheet
            engineer_sheet_name = None
            for name in wb.sheetnames:
                if name.strip().lower() == "engineer":
                    engineer_sheet_name = name
                    break

            if not engineer_sheet_name:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Excel workbook must contain an Engineer sheet."
                )

            sheet = wb[engineer_sheet_name]
            
            # Determine actual last populated data row
            last_data_row = 1
            for r in range(sheet.max_row, 1, -1):
                row_has_data = False
                for c in range(1, sheet.max_column + 1):
                    val = sheet.cell(row=r, column=c).value
                    if val is not None and str(val).strip() != "":
                        row_has_data = True
                        break
                if row_has_data:
                    last_data_row = r
                    break

            if last_data_row <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="The Engineer sheet is empty or contains no rows."
                )

            # Map headers
            first_row = [sheet.cell(row=1, column=c).value for c in range(1, sheet.max_column + 1)]
            col_indices = {}
            for idx, val in enumerate(first_row):
                if val is not None:
                    mapped_field = map_engineer_header(val)
                    if mapped_field:
                        col_indices[mapped_field] = idx + 1

            # Check required columns
            for req in ["engineer_name", "orbit_id"]:
                if req not in col_indices:
                    req_label = "Engineer Name" if req == "engineer_name" else "Orbit ID"
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Required header '{req_label}' is missing from the Excel sheet."
                    )

            errors_list = []
            duplicates_list = []
            existing_list = []
            unchanged_list = []
            valid_rows_to_insert = []
            seen_orbit_ids = set()

            total_rows = last_data_row - 1

            all_fields = {
                "engineer_name", "goes_by", "employee_id", "orbit_id", "level",
                "date_of_joining", "primary_tool", "customer_experience",
                "industry_experience", "status", "email", "phone_number"
            }

            for r in range(2, last_data_row + 1):
                row_dict = {}
                row_dict["excel_row"] = r
                for field, col_idx in col_indices.items():
                    row_dict[field] = clean_val(sheet.cell(row=r, column=col_idx).value)

                # Fill missing columns
                for field in all_fields:
                    if field not in row_dict:
                        row_dict[field] = None

                row_errors = []
                
                # 1. Validate required fields
                if not row_dict.get("engineer_name"):
                    row_errors.append("Engineer Name is required")
                if not row_dict.get("orbit_id"):
                    row_errors.append("Orbit ID is required")

                # 2. Validate format: email
                email_val = row_dict.get("email")
                if email_val:
                    email_str = str(email_val).strip()
                    if not EMAIL_REGEX.match(email_str):
                        row_errors.append("Invalid email format")
                    else:
                        row_dict["email"] = email_str

                # 3. Validate format: phone
                phone_val = row_dict.get("phone_number")
                if phone_val:
                    phone_str = str(phone_val).strip()
                    if not re.match(r"^[+\d\s().-]{3,30}$", phone_str):
                        row_errors.append("Phone number is invalid or too long")
                    else:
                        row_dict["phone_number"] = phone_str

                # 4. Parse experience
                normalized_cust_exp = None
                if row_dict.get("customer_experience") is not None:
                    try:
                        normalized_cust_exp = parse_experience(row_dict["customer_experience"])
                    except ValueError:
                        row_errors.append("LAM Experience must be numeric or 'X Years'")

                normalized_ind_exp = None
                if row_dict.get("industry_experience") is not None:
                    try:
                        normalized_ind_exp = parse_experience(row_dict["industry_experience"])
                    except ValueError:
                        row_errors.append("Industry Experience must be numeric or 'X Years'")

                # 5. Parse date of joining
                normalized_date = None
                if row_dict.get("date_of_joining") is not None:
                    try:
                        normalized_date = parse_date(row_dict["date_of_joining"])
                    except ValueError:
                        row_errors.append("Date of Joining is invalid")

                if row_errors:
                    row_dict["errors"] = row_errors
                    errors_list.append(row_dict)
                    continue

                # Check duplicate in same sheet
                o_id = str(row_dict["orbit_id"]).strip()
                if o_id in seen_orbit_ids:
                    row_dict["errors"] = ["Duplicate Orbit ID in uploaded sheet"]
                    duplicates_list.append(row_dict)
                    continue
                seen_orbit_ids.add(o_id)

                row_dict["date_of_joining"] = normalized_date
                row_dict["customer_experience"] = normalized_cust_exp
                row_dict["industry_experience"] = normalized_ind_exp

                # Check existing in DB
                db_exist = db.scalars(
                    select(Engineer).where(
                        func.lower(Engineer.orbit_id) == norm_str(o_id),
                        Engineer.company_id == target_company_id
                    )
                ).first()
                if db_exist:
                    row_dict["existing_engineer"] = db_exist
                    changes = []
                    
                    if "engineer_name" in col_indices and row_dict["engineer_name"] != db_exist.engineer_name:
                        changes.append(f"Name: '{db_exist.engineer_name}' -> '{row_dict['engineer_name']}'")
                        db_exist.engineer_name = row_dict["engineer_name"]

                    if "goes_by" in col_indices and row_dict["goes_by"] != db_exist.goes_by:
                        changes.append(f"Goes By: '{db_exist.goes_by}' -> '{row_dict['goes_by']}'")
                        db_exist.goes_by = row_dict["goes_by"]

                    if "employee_id" in col_indices and row_dict["employee_id"] != db_exist.lam_id:
                        changes.append(f"Employee ID: '{db_exist.lam_id}' -> '{row_dict['employee_id']}'")
                        db_exist.lam_id = row_dict["employee_id"]

                    if "level" in col_indices and row_dict["level"] != db_exist.level:
                        changes.append(f"Level: '{db_exist.level}' -> '{row_dict['level']}'")
                        db_exist.level = row_dict["level"]

                    if "date_of_joining" in col_indices and norm_date(row_dict["date_of_joining"]) != norm_date(db_exist.date_of_joining):
                        changes.append(f"Date of Joining: '{db_exist.date_of_joining}' -> '{row_dict['date_of_joining']}'")
                        db_exist.date_of_joining = row_dict["date_of_joining"]

                    if "primary_tool" in col_indices and row_dict["primary_tool"] != db_exist.primary_tool_type:
                        changes.append(f"Primary Tool: '{db_exist.primary_tool_type}' -> '{row_dict['primary_tool']}'")
                        db_exist.primary_tool_type = row_dict["primary_tool"]

                    if "customer_experience" in col_indices:
                        cust_exp_new = row_dict["customer_experience"]
                        cust_exp_cur = float(db_exist.lam_experience) if db_exist.lam_experience is not None else None
                        if cust_exp_new != cust_exp_cur:
                            changes.append(f"Customer Exp: '{cust_exp_cur}' -> '{cust_exp_new}'")
                            db_exist.lam_experience = cust_exp_new

                    if "industry_experience" in col_indices:
                        ind_exp_new = row_dict["industry_experience"]
                        ind_exp_cur = float(db_exist.industry_experience) if db_exist.industry_experience is not None else None
                        if ind_exp_new != ind_exp_cur:
                            changes.append(f"Industry Exp: '{ind_exp_cur}' -> '{ind_exp_new}'")
                            db_exist.industry_experience = ind_exp_new

                    if "status" in col_indices and row_dict["status"] and row_dict["status"] != db_exist.status:
                        changes.append(f"Status: '{db_exist.status}' -> '{row_dict['status']}'")
                        db_exist.status = row_dict["status"]

                    if "email" in col_indices and row_dict["email"] != db_exist.email:
                        changes.append(f"Email: '{db_exist.email}' -> '{row_dict['email']}'")
                        db_exist.email = row_dict["email"]

                    if "phone_number" in col_indices and row_dict["phone_number"] != db_exist.phone_number:
                        changes.append(f"Phone: '{db_exist.phone_number}' -> '{row_dict['phone_number']}'")
                        db_exist.phone_number = row_dict["phone_number"]

                    if changes:
                        db_exist.updated_at = datetime.utcnow()
                        row_dict["update_status"] = "UPDATED"
                        row_dict["changed_fields"] = "; ".join(changes)
                        existing_list.append(row_dict)
                    else:
                        row_dict["update_status"] = "UNCHANGED"
                        row_dict["changed_fields"] = "No fields modified"
                        unchanged_list.append(row_dict)
                else:
                    valid_rows_to_insert.append(row_dict)

            # Update BulkUpload details and status to READY
            bulk_upload_service.update_bulk_upload(
                db,
                upload_id=upload_id,
                total_rows=total_rows,
                valid_rows=len(valid_rows_to_insert),
                error_rows=len(errors_list),
                duplicate_rows=len(duplicates_list),
                existing_rows=len(existing_list),
                warning_rows=0,
                status="READY"
            )

            # Transition status to IMPORTING
            bulk_upload_service.update_bulk_upload(
                db,
                upload_id=upload_id,
                status="IMPORTING"
            )

            # 3. Create NEW rows and update EXISTING rows (Transaction safe rollback)
            imported_count = 0
            updated_count = 0
            failed_count = 0
            try:
                # Add new engineers
                for item in valid_rows_to_insert:
                    db_engineer = Engineer(
                        engineer_id=uuid_pkg.uuid4(),
                        company_id=target_company_id,
                        engineer_name=item["engineer_name"],
                        goes_by=item["goes_by"],
                        lam_id=item["employee_id"],
                        orbit_id=item["orbit_id"],
                        level=item["level"],
                        date_of_joining=item["date_of_joining"],
                        primary_tool_type=item["primary_tool"],
                        lam_experience=item["customer_experience"],
                        industry_experience=item["industry_experience"],
                        status=item["status"] or "Active",
                        email=item["email"],
                        phone_number=item["phone_number"],
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    db.add(db_engineer)

                db.commit()
                imported_count = len(valid_rows_to_insert)
                updated_count = len(existing_list)
            except Exception as insert_err:
                db.rollback()
                failed_count = len(valid_rows_to_insert) + len(existing_list)
                bulk_upload_service.update_bulk_upload(
                    db,
                    upload_id=upload_id,
                    status="FAILED",
                    failed_rows=failed_count
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Database ingestion failed: {str(insert_err)}"
                )

            # 4. Generate report workbook
            report_wb = openpyxl.Workbook()
            
            # Summary Sheet
            ws_summary = report_wb.active
            ws_summary.title = "Summary"
            ws_summary.append(["ORMP Bulk Ingestion Invalidation & Validation Report"])
            ws_summary.append([])
            ws_summary.append(["File Name", file.filename])
            ws_summary.append(["Uploaded By", current_user.full_name])
            ws_summary.append(["Upload Date", datetime.now().strftime("%Y-%m-%d %H:%M:%S")])
            ws_summary.append(["Target Company", company.company_name])
            ws_summary.append(["Company UUID", str(company.company_id)])
            ws_summary.append([])
            ws_summary.append(["Metric", "Count"])
            ws_summary.append(["Total Rows", total_rows])
            ws_summary.append(["New Valid Rows Inserted", len(valid_rows_to_insert)])
            ws_summary.append(["Existing Rows Updated", len(existing_list)])
            ws_summary.append(["Unchanged Records", len(unchanged_list)])
            ws_summary.append(["Error Rows", len(errors_list)])
            ws_summary.append(["Duplicate Rows", len(duplicates_list)])
            ws_summary.append(["Warning Rows", 0])
            
            for col in ws_summary.columns:
                max_len = max(len(str(cell.value or '')) for cell in col)
                ws_summary.column_dimensions[col[0].column_letter].width = max(max_len + 3, 14)

            headers = [
                "engineer_name", "goes_by", "employee_id", "orbit_id", "level", 
                "date_of_joining", "primary_tool", "customer_experience", "industry_experience", 
                "status", "email", "phone_number"
            ]
            
            def add_sheet_data(title, rows, include_errors=False):
                ws = report_wb.create_sheet(title=title)
                row_headers = headers.copy()
                if include_errors:
                    row_headers.append("errors")
                ws.append(row_headers)
                for r in rows:
                    row_vals = [
                        r.get("engineer_name"),
                        r.get("goes_by"),
                        r.get("employee_id"),
                        r.get("orbit_id"),
                        r.get("level"),
                        str(r.get("date_of_joining")) if r.get("date_of_joining") else "",
                        r.get("primary_tool"),
                        r.get("customer_experience"),
                        r.get("industry_experience"),
                        r.get("status"),
                        r.get("email"),
                        r.get("phone_number")
                    ]
                    if include_errors:
                        row_vals.append(", ".join(r.get("errors", [])))
                    ws.append(row_vals)
                for col in ws.columns:
                    max_len = max(len(str(cell.value or '')) for cell in col)
                    ws.column_dimensions[col[0].column_letter].width = max(max_len + 3, 12)

            add_sheet_data("Valid Records", valid_rows_to_insert)
            add_sheet_data("Errors", errors_list, include_errors=True)
            add_sheet_data("Duplicates", duplicates_list)
            
            # Detailed Existing Records Sheet
            ws_exist = report_wb.create_sheet(title="Updated Records")
            ws_exist.append([
                "Excel Row", "Orbit ID", "Engineer Name", "Action Status", "Changed Diffs",
                "Goes By", "Employee ID", "Level", "Date of Joining", "Primary Tool",
                "Customer Exp", "Industry Exp", "Status", "Email", "Phone Number"
            ])
            for r in existing_list:
                ws_exist.append([
                    r.get("excel_row"),
                    r.get("orbit_id"),
                    r.get("engineer_name"),
                    r.get("update_status", "UPDATED"),
                    r.get("changed_fields", "Modified values updated in database"),
                    r.get("goes_by"),
                    r.get("employee_id"),
                    r.get("level"),
                    str(r.get("date_of_joining")) if r.get("date_of_joining") else "",
                    r.get("primary_tool"),
                    r.get("customer_experience"),
                    r.get("industry_experience"),
                    r.get("status"),
                    r.get("email"),
                    r.get("phone_number")
                ])
            for col in ws_exist.columns:
                max_len = max(len(str(cell.value or '')) for cell in col)
                ws_exist.column_dimensions[col[0].column_letter].width = max(max_len + 3, 14)

            # Unchanged Records Sheet
            ws_un = report_wb.create_sheet(title="Unchanged Records")
            ws_un.append(["Excel Row", "Orbit ID", "Engineer Name", "Action Status", "Details"])
            for r in unchanged_list:
                ws_un.append([
                    r.get("excel_row"),
                    r.get("orbit_id"),
                    r.get("engineer_name"),
                    "UNCHANGED",
                    "All supplied engineer fields match database record"
                ])
            for col in ws_un.columns:
                max_len = max(len(str(cell.value or '')) for cell in col)
                ws_un.column_dimensions[col[0].column_letter].width = max(max_len + 3, 14)

            add_sheet_data("Warnings", [])

            os.makedirs(TEMP_REPORTS_DIR, exist_ok=True)
            report_filename = f"validation_report_{uuid_pkg.uuid4()}.xlsx"
            report_path = os.path.join(TEMP_REPORTS_DIR, report_filename)
            report_wb.save(report_path)

            # Update final audit status
            final_status = "COMPLETED"
            if len(errors_list) > 0 or len(duplicates_list) > 0:
                final_status = "COMPLETED_WITH_ERRORS"
                
            bulk_upload_service.update_bulk_upload(
                db,
                upload_id=upload_id,
                status=final_status,
                report_file=report_filename,
                imported_rows=imported_count + updated_count,
                failed_rows=failed_count
            )

            msg_parts = []
            if len(valid_rows_to_insert) > 0:
                msg_parts.append(f"Ingested {len(valid_rows_to_insert)} new engineer records.")
            if len(existing_list) > 0:
                msg_parts.append(f"Updated {len(existing_list)} existing engineer records with latest uploaded data.")
            if len(unchanged_list) > 0:
                msg_parts.append(f"Preserved {len(unchanged_list)} unchanged engineer records.")
            if not msg_parts:
                ingested_msg = "No engineer records processed."
            else:
                ingested_msg = " ".join(msg_parts)

            if errors_list or duplicates_list:
                ingested_msg += " Some rows had validation errors or duplicates. See the validation report for details."

            return {
                "success": True,
                "rowsProcessed": total_rows,
                "errorsCount": len(errors_list),
                "inserted": len(valid_rows_to_insert),
                "updated": len(existing_list),
                "unchanged": len(unchanged_list),
                "message": ingested_msg,
                "report_url": f"/api/upload/download-report/{report_filename}"
            }

    except HTTPException as he:
        db.rollback()
        bulk_upload_service.update_bulk_upload(
            db,
            upload_id=upload_id,
            status="FAILED"
        )
        raise he
    except Exception as e:
        db.rollback()
        logger.error("Error during bulk upload: %s", str(e), exc_info=True)
        bulk_upload_service.update_bulk_upload(
            db,
            upload_id=upload_id,
            status="FAILED"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error occurred during bulk upload."
        )

@router.get("/download-report/{report_name}")
def download_report(
    report_name: str,
    current_user: User = Depends(get_current_user)
):
    """
    Download a validation report Excel file.
    """
    # Prevent path traversal
    clean_name = os.path.basename(report_name)
    report_path = os.path.join(TEMP_REPORTS_DIR, clean_name)
    
    if not os.path.exists(report_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Validation report not found or expired."
        )
    
    return FileResponse(
        path=report_path,
        filename=f"ORMP_Validation_Report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

from app.schemas.pagination import PaginatedResponse

@router.get("/history", response_model=PaginatedResponse[BulkUploadResponse])
def get_upload_history(
    company_id: Optional[UUID] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Enforce company isolation / Global Admin tenant filtering
    company_id = enforce_company_isolation(db, current_user, company_id)
    res = bulk_upload_service.get_bulk_uploads_history_paginated(
        db,
        company_id=company_id if isinstance(company_id, UUID) else None,
        page=page,
        page_size=page_size
    )
    return PaginatedResponse[BulkUploadResponse](
        items=[bulk_upload_service.map_to_response(db, u) for u in res["items"]],
        page=res["page"],
        page_size=res["page_size"],
        total=res["total"],
        total_pages=res["total_pages"]
    )

@router.get("/history/{upload_id}", response_model=BulkUploadResponse)
def get_upload_detail(
    upload_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    upload = bulk_upload_service.get_bulk_upload_by_id(db, upload_id)
    if not upload:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload record not found."
        )
    # Enforce IDOR protection: user can only access history records matching their tenant (or any if Global Admin)
    enforce_company_isolation(db, current_user, upload.company_id)
    return bulk_upload_service.map_to_response(db, upload)
