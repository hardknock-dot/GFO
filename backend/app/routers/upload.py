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
from sqlalchemy import select

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
    # Check if ends with "years" or "year" (case-insensitive)
    match = re.match(r"^([\d.]+)\s*years?$", v_str, re.IGNORECASE)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            pass
    # Otherwise check if it can be directly cast to float
    try:
        return float(v_str)
    except ValueError:
        raise ValueError("Must be a valid numeric experience value")

def clean_val(v):
    if v is None:
        return None
    if isinstance(v, str):
        v_stripped = v.strip()
        return v_stripped if v_stripped != "" else None
    return v

# Normalize names (strip, lowercase, replace spaces/underscores)
def normalize_header(name):
    if name is None:
        return ""
    return str(name).strip().lower().replace(" ", "").replace("_", "").replace("-", "")

HEADER_MAP = {
    "engineername": "engineer_name",
    "goesby": "goes_by",
    "lamid": "employee_id",
    "orbitid": "orbit_id",
    "level": "level",
    "dateofjoining": "date_of_joining",
    "primarytooltype": "primary_tool",
    "primarytool": "primary_tool",
    "lamexperience": "customer_experience",
    "customerexperience": "customer_experience",
    "industryexperience": "industry_experience",
    "status": "status",
    "email": "email",
    "phonenumber": "phone_number",
    "phone": "phone_number"
}

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
                str(row.get("orbit_id")).strip()
                for row in raw_rows
                if row.get("orbit_id") and str(row.get("orbit_id")).strip() != ""
            }

            db_engineers = []
            if unique_orbit_ids:
                db_engineers = db.scalars(
                    select(Engineer).where(
                        Engineer.orbit_id.in_(list(unique_orbit_ids)),
                        Engineer.company_id == target_company_id
                    )
                ).all()

            orbit_to_engineer = {
                eng.orbit_id: (eng.engineer_id, eng.engineer_name)
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

            existing_skill_keys = set()
            for s in db_skills:
                existing_key = (
                    s.engineer_id,
                    s.country,
                    s.fab,
                    s.wafer_size,
                    s.tool_type,
                    s.start_date,
                    s.end_date
                )
                existing_skill_keys.add(existing_key)
            t_existing_lookup = time.perf_counter()

            errors_list = []
            duplicates_list = []
            existing_list = []
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
                eng_info = orbit_to_engineer.get(orbit_id)
                if not eng_info:
                    row_errors.append({
                        "field": "Orbit ID",
                        "value": orbit_id,
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
                    engineer_id,
                    country,
                    fab,
                    wafer_size,
                    tool_type,
                    start_date,
                    end_date
                )

                if row_key in seen_keys:
                    row_dict["duplicate_key"] = f"EngineerID: {engineer_id}, Tool: {tool_type}, Fab: {fab}"
                    duplicates_list.append(row_dict)
                    continue
                seen_keys.add(row_key)

                # 7. Check if already exists in DB (in-memory lookup)
                if row_key in existing_skill_keys:
                    existing_list.append(row_dict)
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
                # Bulk add
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
                imported_count = len(valid_rows_to_insert)
            except Exception as insert_err:
                db.rollback()
                failed_count = len(valid_rows_to_insert)
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
            ws_summary.append(["Valid Rows", len(valid_rows_to_insert)])
            ws_summary.append(["Error Rows", len(errors_list)])
            ws_summary.append(["Duplicate Rows", len(duplicates_list)])
            ws_summary.append(["Existing Rows", len(existing_list)])
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
                    "VALID"
                ])

            # Errors Sheet: Excel Row | Orbit ID | Field | Value | Error
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

            # Duplicates Sheet: Excel Row | Orbit ID | Duplicate Key | Duplicate Rows | Reason
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

            # Existing Records Sheet: Excel Row | Orbit ID | Engineer Name | Reason
            ws_exist = report_wb.create_sheet(title="Existing Records")
            ws_exist.append(["Excel Row", "Orbit ID", "Engineer Name", "Reason"])
            for r in existing_list:
                ws_exist.append([
                    r["excel_row"],
                    r.get("orbit_id") or "",
                    r.get("resolved_engineer_name") or r.get("original_engineer_name") or "",
                    "Skill already exists in database."
                ])

            # Warnings Sheet
            ws_warn = report_wb.create_sheet(title="Warnings")
            ws_warn.append(["Excel Row", "Orbit ID", "Field", "Value", "Warning"])

            for sheet_obj in (ws_valid, ws_errors, ws_dups, ws_exist, ws_warn):
                for col in sheet_obj.columns:
                    max_len = max(len(str(cell.value or '')) for cell in col)
                    sheet_obj.column_dimensions[col[0].column_letter].width = max(max_len + 3, 12)

            os.makedirs(TEMP_REPORTS_DIR, exist_ok=True)
            report_filename = f"validation_report_{uuid_pkg.uuid4()}.xlsx"
            report_path = os.path.join(TEMP_REPORTS_DIR, report_filename)
            report_wb.save(report_path)
            t_report = time.perf_counter()

            final_status = "COMPLETED"
            if len(errors_list) > 0 or len(duplicates_list) > 0 or len(existing_list) > 0:
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
                "\nSkill upload:\n"
                "Rows detected: %d\n"
                "Excel parsing: %.4fs\n"
                "Engineer lookup: %.4fs\n"
                "Existing skill lookup: %.4fs\n"
                "Validation & Duplicate detection: %.4fs\n"
                "Database insert & commit: %.4fs\n"
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

            ingested_msg = f"Ingested {len(valid_rows_to_insert)} valid records successfully."
            if errors_list or duplicates_list or existing_list:
                ingested_msg += " Some rows were skipped due to validation errors. See the validation report for details."

            return {
                "success": True,
                "rowsProcessed": total_rows,
                "errorsCount": len(errors_list),
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
                str(row.get("orbit_id")).strip()
                for row in raw_rows
                if row.get("orbit_id") and str(row.get("orbit_id")).strip() != ""
            }

            db_engineers = []
            if unique_orbit_ids:
                db_engineers = db.scalars(
                    select(Engineer).where(
                        Engineer.orbit_id.in_(list(unique_orbit_ids)),
                        Engineer.company_id == target_company_id
                    )
                ).all()

            orbit_to_engineer = {
                eng.orbit_id: (eng.engineer_id, eng.engineer_name)
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

            existing_schedule_keys = set()
            for s in db_schedules:
                existing_key = (
                    s.engineer_id,
                    s.support_type,
                    s.country,
                    s.fab_city,
                    s.fab_site,
                    s.start_date,
                    s.end_date
                )
                existing_schedule_keys.add(existing_key)
            t_existing_lookup = time.perf_counter()

            errors_list = []
            duplicates_list = []
            existing_list = []
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
                eng_info = orbit_to_engineer.get(orbit_id)
                if not eng_info:
                    row_errors.append({
                        "field": "Orbit ID",
                        "value": orbit_id,
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
                    engineer_id,
                    support_type,
                    country,
                    fab_city,
                    fab_site,
                    start_date,
                    end_date
                )

                if row_key in seen_keys:
                    row_dict["duplicate_key"] = f"EngineerID: {engineer_id}, Type: {support_type}, Location: {country}/{fab_city}/{fab_site}"
                    duplicates_list.append(row_dict)
                    continue
                seen_keys.add(row_key)

                # 7. Check if already exists in DB (in-memory lookup)
                if row_key in existing_schedule_keys:
                    existing_list.append(row_dict)
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
                # Bulk add
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
                imported_count = len(valid_rows_to_insert)
            except Exception as insert_err:
                db.rollback()
                failed_count = len(valid_rows_to_insert)
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
            ws_summary.append(["Valid Rows", len(valid_rows_to_insert)])
            ws_summary.append(["Error Rows", len(errors_list)])
            ws_summary.append(["Duplicate Rows", len(duplicates_list)])
            ws_summary.append(["Existing Rows", len(existing_list)])
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
                    "VALID"
                ])

            # Errors Sheet: Excel Row | Orbit ID | Field | Value | Error
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

            # Duplicates Sheet: Excel Row | Orbit ID | Duplicate Key | Duplicate Rows | Reason
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

            # Existing Records Sheet: Excel Row | Orbit ID | Engineer Name | Reason
            ws_exist = report_wb.create_sheet(title="Existing Records")
            ws_exist.append(["Excel Row", "Orbit ID", "Engineer Name", "Reason"])
            for r in existing_list:
                desc = f"{r.get('support_type')} / {r.get('country')} / {str(r.get('start_date'))}"
                ws_exist.append([
                    r["excel_row"],
                    r.get("orbit_id") or "",
                    r.get("resolved_engineer_name") or r.get("original_engineer_name") or "",
                    desc,
                    "Schedule already exists in database."
                ])

            # Warnings Sheet
            ws_warn = report_wb.create_sheet(title="Warnings")
            ws_warn.append(["Excel Row", "Orbit ID", "Field", "Value", "Warning"])

            for sheet_obj in (ws_valid, ws_errors, ws_dups, ws_exist, ws_warn):
                for col in sheet_obj.columns:
                    max_len = max(len(str(cell.value or '')) for cell in col)
                    sheet_obj.column_dimensions[col[0].column_letter].width = max(max_len + 3, 12)

            os.makedirs(TEMP_REPORTS_DIR, exist_ok=True)
            report_filename = f"validation_report_{uuid_pkg.uuid4()}.xlsx"
            report_path = os.path.join(TEMP_REPORTS_DIR, report_filename)
            report_wb.save(report_path)
            t_report = time.perf_counter()

            final_status = "COMPLETED"
            if len(errors_list) > 0 or len(duplicates_list) > 0 or len(existing_list) > 0:
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
                "\nSchedule upload:\n"
                "Rows detected: %d\n"
                "Excel parsing: %.4fs\n"
                "Engineer lookup: %.4fs\n"
                "Existing schedule lookup: %.4fs\n"
                "Validation & Duplicate detection: %.4fs\n"
                "Database insert & commit: %.4fs\n"
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

            ingested_msg = f"Ingested {len(valid_rows_to_insert)} valid records successfully."
            if errors_list or duplicates_list or existing_list:
                ingested_msg += " Some rows were skipped due to validation errors. See the validation report for details."

            return {
                "success": True,
                "rowsProcessed": total_rows,
                "errorsCount": len(errors_list),
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
                str(row.get("orbit_id")).strip()
                for row in raw_rows
                if row.get("orbit_id") and str(row.get("orbit_id")).strip() != ""
            }

            db_engineers = []
            if unique_orbit_ids:
                db_engineers = db.scalars(
                    select(Engineer).where(
                        Engineer.orbit_id.in_(list(unique_orbit_ids)),
                        Engineer.company_id == target_company_id
                    )
                ).all()

            orbit_to_engineer = {
                eng.orbit_id: (eng.engineer_id, eng.engineer_name)
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
                c_key = (v.country or "").strip().lower()
                vt_key = (v.visa_type or "").strip().lower()
                existing_visa_map[(v.engineer_id, c_key, vt_key)] = v

            t_existing_lookup = time.perf_counter()

            errors_list = []
            duplicates_list = []
            existing_list = []
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
                eng_info = orbit_to_engineer.get(orbit_id)
                if not eng_info:
                    row_errors.append({
                        "field": "Orbit ID",
                        "value": orbit_id,
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

                row_key = (engineer_id, country_clean, visa_type_clean)

                if row_key in seen_keys:
                    row_dict["duplicate_key"] = f"EngineerID: {engineer_id}, Country: {country}, Type: {visa_type}"
                    duplicates_list.append(row_dict)
                    continue
                seen_keys.add(row_key)

                # 7. Upsert check: existing DB record vs new record
                existing_visa_record = existing_visa_map.get(row_key)
                if existing_visa_record:
                    row_dict["existing_visa"] = existing_visa_record
                    existing_list.append(row_dict)
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
            updated_count = 0
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

                # 2. Update Existing Visas
                for item in existing_list:
                    ev = item["existing_visa"]
                    if item.get("country"):
                        ev.country = item["country"]
                    if item.get("visa_type") is not None:
                        ev.visa_type = item["visa_type"]
                    if item.get("applied_on") is not None:
                        ev.applied_on = item["applied_on"]
                    if item.get("visa_start_date") is not None:
                        ev.visa_start_date = item["visa_start_date"]
                    if item.get("visa_end_date") is not None:
                        ev.visa_end_date = item["visa_end_date"]
                    if item.get("comments") is not None:
                        ev.comments = item["comments"]
                    if item.get("owner_id") is not None:
                        ev.owner_id = item["owner_id"]
                    ev.updated_at = datetime.utcnow()
                    ev.updated_at = datetime.utcnow()

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
            ws_summary.append(["New Valid Rows Inserted", len(valid_rows_to_insert)])
            ws_summary.append(["Existing Rows Updated", len(existing_list)])
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

            # Existing Records Sheet (Updated)
            ws_exist = report_wb.create_sheet(title="Existing Records")
            ws_exist.append(headers_valid)
            for r in existing_list:
                ws_exist.append([
                    r["excel_row"],
                    r.get("orbit_id") or "",
                    r.get("resolved_engineer_name") or r.get("original_engineer_name") or "",
                    r.get("country"),
                    r.get("visa_type"),
                    str(r.get("applied_on")) if r.get("applied_on") else "",
                    str(r.get("visa_start_date")) if r.get("visa_start_date") else "",
                    str(r.get("visa_end_date")) if r.get("visa_end_date") else "",
                    r.get("comments"),
                    "UPDATED"
                ])

            # Warnings Sheet
            ws_warn = report_wb.create_sheet(title="Warnings")
            ws_warn.append(["Excel Row", "Orbit ID", "Field", "Value", "Warning"])

            for sheet_obj in (ws_valid, ws_errors, ws_dups, ws_exist, ws_warn):
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
                imported_rows=imported_count + updated_count,
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

            ingested_msg = f"Processed {total_rows} rows: inserted {imported_count} new visa records and updated {updated_count} existing visa records."
            if errors_list or duplicates_list:
                ingested_msg += " Some rows were skipped due to validation errors. See the validation report for details."

            return {
                "success": True,
                "rowsProcessed": total_rows,
                "errorsCount": len(errors_list),
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
                str(row.get("orbit_id")).strip()
                for row in raw_rows
                if row.get("orbit_id") and str(row.get("orbit_id")).strip() != ""
            }

            db_engineers = []
            if unique_orbit_ids:
                db_engineers = db.scalars(
                    select(Engineer).where(
                        Engineer.orbit_id.in_(list(unique_orbit_ids)),
                        Engineer.company_id == target_company_id
                    )
                ).all()

            orbit_to_engineer = {
                eng.orbit_id: (eng.engineer_id, eng.engineer_name)
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
                p_key = (tr.purpose or "").strip().lower()
                existing_travel_map[(tr.schedule_id, tr.travel_date, p_key)] = tr

            t_existing_lookup = time.perf_counter()

            errors_list = []
            duplicates_list = []
            existing_list = []
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
                eng_info = orbit_to_engineer.get(orbit_id)
                if not eng_info:
                    row_errors.append({
                        "field": "Orbit ID",
                        "value": orbit_id,
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
                row_key = (schedule_id, travel_date, purpose_clean)

                if row_key in seen_keys:
                    row_dict["duplicate_key"] = f"OrbitID: {orbit_id}, TravelDate: {travel_date}, Purpose: {purpose}"
                    duplicates_list.append(row_dict)
                    continue
                seen_keys.add(row_key)

                # 6. Upsert check: existing DB record vs new record
                existing_travel_record = existing_travel_map.get(row_key)
                if existing_travel_record:
                    row_dict["existing_travel"] = existing_travel_record
                    existing_list.append(row_dict)
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
            updated_count = 0
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

                # 2. Update Existing Travels
                for item in existing_list:
                    etr = item["existing_travel"]
                    if item.get("booking_date") is not None:
                        etr.booking_date = item["booking_date"]
                    if item.get("travel_date") is not None:
                        etr.travel_date = item["travel_date"]
                    if item.get("purpose") is not None:
                        etr.purpose = item["purpose"]
                    if item.get("comments") is not None:
                        etr.comments = item["comments"]
                    etr.updated_at = datetime.utcnow()

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
            ws_summary.append(["New Valid Rows Inserted", len(valid_rows_to_insert)])
            ws_summary.append(["Existing Rows Updated", len(existing_list)])
            ws_summary.append(["Error Rows", len(errors_list)])
            ws_summary.append(["Duplicate Rows", len(duplicates_list)])
            ws_summary.append(["Warning Rows", 0])
            
            for col in ws_summary.columns:
                max_len = max(len(str(cell.value or '')) for cell in col)
                ws_summary.column_dimensions[col[0].column_letter].width = max(max_len + 3, 12)

            headers_valid = [
                "Excel Row", "Orbit ID", "Engineer Name", "Booking Date", 
                "Travel Date", "Purpose", "Comments", "Status"
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

            # Existing Records Sheet (Updated)
            ws_exist = report_wb.create_sheet(title="Existing Records")
            ws_exist.append(headers_valid)
            for r in existing_list:
                ws_exist.append([
                    r["excel_row"],
                    r.get("orbit_id") or "",
                    r.get("resolved_engineer_name") or r.get("original_engineer_name") or "",
                    str(r.get("booking_date")) if r.get("booking_date") else "",
                    str(r.get("travel_date")) if r.get("travel_date") else "",
                    r.get("purpose"),
                    r.get("comments"),
                    "UPDATED"
                ])

            # Warnings Sheet
            ws_warn = report_wb.create_sheet(title="Warnings")
            ws_warn.append(["Excel Row", "Orbit ID", "Field", "Value", "Warning"])

            for sheet_obj in (ws_valid, ws_errors, ws_dups, ws_exist, ws_warn):
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
                imported_rows=imported_count + updated_count,
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

            ingested_msg = f"Processed {total_rows} rows: inserted {imported_count} new travel records and updated {updated_count} existing travel records."
            if errors_list or duplicates_list:
                ingested_msg += " Some rows were skipped due to validation errors. See the validation report for details."

            return {
                "success": True,
                "rowsProcessed": total_rows,
                "errorsCount": len(errors_list),
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

            # Bulk Engineer Resolution
            unique_orbit_ids = {
                str(row.get("orbit_id")).strip()
                for row in raw_rows
                if row.get("orbit_id") and str(row.get("orbit_id")).strip() != ""
            }

            db_engineers = []
            if unique_orbit_ids:
                db_engineers = db.scalars(
                    select(Engineer).where(
                        Engineer.orbit_id.in_(list(unique_orbit_ids)),
                        Engineer.company_id == target_company_id
                    )
                ).all()

            orbit_to_engineer = {
                eng.orbit_id: (eng.engineer_id, eng.engineer_name)
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

            # Query existing performance records for resolved schedules
            resolved_schedule_ids = [sch.schedule_id for sch in db_schedules]
            db_perfs = []
            if resolved_schedule_ids:
                db_perfs = db.scalars(
                    select(Performance).where(
                        Performance.schedule_id.in_(resolved_schedule_ids)
                    )
                ).all()

            # Map existing performance records by (schedule_id, actual_start_date)
            existing_perf_map = {}
            for pf in db_perfs:
                existing_perf_map[(pf.schedule_id, pf.actual_start_date)] = pf

            t_existing_lookup = time.perf_counter()

            errors_list = []
            duplicates_list = []
            existing_list = []
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
                eng_info = orbit_to_engineer.get(orbit_id)
                if not eng_info:
                    row_errors.append({
                        "field": "Orbit ID",
                        "value": orbit_id,
                        "error": f"Engineer with Orbit ID '{orbit_id}' does not exist in the selected company."
                    })
                    row_dict["errors"] = row_errors
                    errors_list.append(row_dict)
                    continue

                engineer_id, resolved_engineer_name = eng_info
                row_dict["engineer_id"] = engineer_id
                row_dict["resolved_engineer_name"] = resolved_engineer_name

                # 3. Parse and validate dates
                actual_start_date = None
                start_val = row_dict.get("actual_start_date")
                if start_val is not None:
                    try:
                        actual_start_date = parse_date(start_val)
                    except ValueError:
                        row_errors.append({
                            "field": "Actual Start Date",
                            "value": str(start_val),
                            "error": "Invalid actual start date format."
                        })

                actual_end_date = None
                end_val = row_dict.get("actual_end_date")
                if end_val is not None:
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

                # 4. Score / Rating validation (1.0 to 5.0)
                score = None
                score_val = row_dict.get("score")
                if score_val is not None:
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

                # 5. Escalation & Escalation Reason validation
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

                # 6. Resolve Schedule for this engineer
                schedules_for_eng = engineer_schedules.get(engineer_id, [])
                target_schedule = None
                if schedules_for_eng:
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
                        start_date=actual_start_date or date.today(),
                        schedule_status="Upcoming",
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    engineer_schedules.setdefault(engineer_id, []).append(target_schedule)
                    new_schedules_created.append(target_schedule)

                schedule_id = target_schedule.schedule_id
                row_dict["schedule_id"] = schedule_id

                # 7. Duplicate row detection in Excel sheet
                row_key = (schedule_id, actual_start_date)

                if row_key in seen_keys:
                    row_dict["duplicate_key"] = f"OrbitID: {orbit_id}, ActualStartDate: {actual_start_date}"
                    duplicates_list.append(row_dict)
                    continue
                seen_keys.add(row_key)

                # 8. Upsert check: existing DB record vs new record
                existing_perf_record = existing_perf_map.get(row_key)
                if existing_perf_record:
                    row_dict["existing_perf"] = existing_perf_record
                    existing_list.append(row_dict)
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
            updated_count = 0
            failed_count = 0
            try:
                # Add baseline schedules if any created
                if new_schedules_created:
                    db.add_all(new_schedules_created)

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

                # 2. Update Existing Performance evaluations
                for item in existing_list:
                    epf = item["existing_perf"]
                    if item.get("actual_start_date") is not None:
                        epf.actual_start_date = item["actual_start_date"]
                    if item.get("actual_end_date") is not None:
                        epf.actual_end_date = item["actual_end_date"]
                    if item.get("escalation") is not None:
                        epf.escalation = item["escalation"]
                    if item.get("escalation_reason") is not None:
                        epf.escalation_reason = item["escalation_reason"]
                    if item.get("feedback") is not None:
                        epf.feedback = item["feedback"]
                    if item.get("score") is not None:
                        epf.score = item["score"]
                    if item.get("attachment") is not None:
                        epf.attachment = item["attachment"]
                    epf.updated_at = datetime.utcnow()

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
            t_insert = time.perf_counter()

            # 8. Generate report workbook
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
            ws_summary.append(["New Valid Rows Inserted", len(valid_rows_to_insert)])
            ws_summary.append(["Existing Rows Updated", len(existing_list)])
            ws_summary.append(["Error Rows", len(errors_list)])
            ws_summary.append(["Duplicate Rows", len(duplicates_list)])
            ws_summary.append(["Warning Rows", 0])
            
            for col in ws_summary.columns:
                max_len = max(len(str(cell.value or '')) for cell in col)
                ws_summary.column_dimensions[col[0].column_letter].width = max(max_len + 3, 12)

            headers_valid = [
                "Excel Row", "Orbit ID", "Engineer Name", "Score", "Actual Start", 
                "Actual End", "Escalation", "Escalation Reason", "Feedback", "Status"
            ]

            # Valid Records Sheet (Inserted)
            ws_valid = report_wb.create_sheet(title="Valid Records")
            ws_valid.append(headers_valid)
            for r in valid_rows_to_insert:
                ws_valid.append([
                    r["excel_row"],
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

            # Existing Records Sheet (Updated)
            ws_exist = report_wb.create_sheet(title="Existing Records")
            ws_exist.append(headers_valid)
            for r in existing_list:
                ws_exist.append([
                    r["excel_row"],
                    r.get("orbit_id") or "",
                    r.get("resolved_engineer_name") or r.get("original_engineer_name") or "",
                    r.get("score"),
                    str(r.get("actual_start_date")) if r.get("actual_start_date") else "",
                    str(r.get("actual_end_date")) if r.get("actual_end_date") else "",
                    "Yes" if r.get("escalation") else "No",
                    r.get("escalation_reason"),
                    r.get("feedback"),
                    "UPDATED"
                ])

            # Warnings Sheet
            ws_warn = report_wb.create_sheet(title="Warnings")
            ws_warn.append(["Excel Row", "Orbit ID", "Field", "Value", "Warning"])

            for sheet_obj in (ws_valid, ws_errors, ws_dups, ws_exist, ws_warn):
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
                imported_rows=imported_count + updated_count,
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

            ingested_msg = f"Processed {total_rows} rows: inserted {imported_count} new performance records and updated {updated_count} existing performance records."
            if errors_list or duplicates_list:
                ingested_msg += " Some rows were skipped due to validation errors. See the validation report for details."

            return {
                "success": True,
                "rowsProcessed": total_rows,
                "errorsCount": len(errors_list),
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
                str(row.get("orbit_id")).strip()
                for row in raw_rows
                if row.get("orbit_id") and str(row.get("orbit_id")).strip() != ""
            }

            db_engineers = []
            if unique_orbit_ids:
                db_engineers = db.scalars(
                    select(Engineer).where(
                        Engineer.orbit_id.in_(list(unique_orbit_ids)),
                        Engineer.company_id == target_company_id
                    )
                ).all()

            orbit_to_engineer = {
                eng.orbit_id: (eng.engineer_id, eng.engineer_name)
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
                lt_key = (lv.leave_type or "Annual Leave").strip().lower()
                existing_leave_map[(lv.engineer_id, lv.requested_date, lt_key)] = lv

            t_existing_lookup = time.perf_counter()

            errors_list = []
            duplicates_list = []
            existing_list = []
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
                eng_info = orbit_to_engineer.get(orbit_id)
                if not eng_info:
                    row_errors.append({
                        "field": "Orbit ID",
                        "value": orbit_id,
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
                lt_clean = (leave_type or "").strip().lower()
                row_key = (engineer_id, requested_date, lt_clean)

                if row_key in seen_keys:
                    row_dict["duplicate_key"] = f"OrbitID: {orbit_id}, RequestedDate: {requested_date}, LeaveType: {leave_type}"
                    duplicates_list.append(row_dict)
                    continue
                seen_keys.add(row_key)

                # 5. Upsert check: existing DB record vs new record
                existing_leave_record = existing_leave_map.get(row_key)
                if existing_leave_record:
                    row_dict["existing_leave"] = existing_leave_record
                    existing_list.append(row_dict)
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
            updated_count = 0
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

                # 2. Update Existing Leave records
                for item in existing_list:
                    elv = item["existing_leave"]
                    if item.get("leave_type") is not None:
                        elv.leave_type = item["leave_type"]
                    if item.get("requested_date") is not None:
                        elv.requested_date = item["requested_date"]
                    if item.get("requested_on") is not None:
                        elv.requested_on = item["requested_on"]
                    if item.get("approval_status") is not None:
                        elv.approval_status = item["approval_status"]
                    elv.updated_at = datetime.utcnow()

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
            ws_summary.append(["New Valid Rows Inserted", len(valid_rows_to_insert)])
            ws_summary.append(["Existing Rows Updated", len(existing_list)])
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

            # Existing Records Sheet (Updated)
            ws_exist = report_wb.create_sheet(title="Existing Records")
            ws_exist.append(headers_valid)
            for r in existing_list:
                ws_exist.append([
                    r["excel_row"],
                    r.get("orbit_id") or "",
                    r.get("resolved_engineer_name") or r.get("original_engineer_name") or "",
                    r.get("leave_type"),
                    str(r.get("requested_date")) if r.get("requested_date") else "",
                    str(r.get("requested_on")) if r.get("requested_on") else "",
                    r.get("approval_status"),
                    "UPDATED"
                ])

            # Warnings Sheet
            ws_warn = report_wb.create_sheet(title="Warnings")
            ws_warn.append(["Excel Row", "Orbit ID", "Field", "Value", "Warning"])

            for sheet_obj in (ws_valid, ws_errors, ws_dups, ws_exist, ws_warn):
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
                imported_rows=imported_count + updated_count,
                failed_rows=failed_count
            )

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

            ingested_msg = f"Processed {total_rows} rows: inserted {imported_count} new leave records and updated {updated_count} existing leave records."
            if errors_list or duplicates_list:
                ingested_msg += " Some rows were skipped due to validation errors. See the validation report for details."

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
                    norm = normalize_header(val)
                    mapped_field = HEADER_MAP.get(norm)
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
            valid_rows_to_insert = []
            seen_orbit_ids = set()

            total_rows = last_data_row - 1

            for r in range(2, last_data_row + 1):
                row_dict = {}
                for field, col_idx in col_indices.items():
                    row_dict[field] = clean_val(sheet.cell(row=r, column=col_idx).value)

                # Fill missing columns
                for field in HEADER_MAP.values():
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

                # Check existing in DB
                db_exist = db.scalars(
                    select(Engineer).where(
                        Engineer.orbit_id == o_id,
                        Engineer.company_id == target_company_id
                    )
                ).first()
                if db_exist:
                    row_dict["errors"] = ["Orbit ID already exists in DB"]
                    existing_list.append(row_dict)
                else:
                    row_dict["date_of_joining"] = normalized_date
                    row_dict["customer_experience"] = normalized_cust_exp
                    row_dict["industry_experience"] = normalized_ind_exp
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

            # 3. Create only VALID rows (Transaction safe rollback)
            imported_count = 0
            failed_count = 0
            try:
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
                        status=item["status"],
                        email=item["email"],
                        phone_number=item["phone_number"],
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    db.add(db_engineer)
                db.commit()
                imported_count = len(valid_rows_to_insert)
            except Exception as insert_err:
                db.rollback()
                failed_count = len(valid_rows_to_insert)
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
            ws_summary.append(["Valid Rows", len(valid_rows_to_insert)])
            ws_summary.append(["Error Rows", len(errors_list)])
            ws_summary.append(["Duplicate Rows", len(duplicates_list)])
            ws_summary.append(["Existing Rows", len(existing_list)])
            ws_summary.append(["Warning Rows", 0])
            
            for col in ws_summary.columns:
                max_len = max(len(str(cell.value or '')) for cell in col)
                ws_summary.column_dimensions[col[0].column_letter].width = max(max_len + 3, 12)

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
            add_sheet_data("Existing Records", existing_list)
            add_sheet_data("Warnings", [])

            os.makedirs(TEMP_REPORTS_DIR, exist_ok=True)
            report_filename = f"validation_report_{uuid_pkg.uuid4()}.xlsx"
            report_path = os.path.join(TEMP_REPORTS_DIR, report_filename)
            report_wb.save(report_path)

            # Update final audit status
            final_status = "COMPLETED"
            if len(errors_list) > 0 or len(duplicates_list) > 0 or len(existing_list) > 0:
                final_status = "COMPLETED_WITH_ERRORS"
                
            bulk_upload_service.update_bulk_upload(
                db,
                upload_id=upload_id,
                status=final_status,
                report_file=report_filename,
                imported_rows=imported_count,
                failed_rows=failed_count
            )

            ingested_msg = f"Ingested {len(valid_rows_to_insert)} valid records successfully."
            if errors_list or duplicates_list or existing_list:
                ingested_msg += " Some rows were skipped due to validation errors. See the validation report for details."

            return {
                "success": True,
                "rowsProcessed": total_rows,
                "errorsCount": len(errors_list),
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
