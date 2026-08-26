import logging
import os
import base64
import urllib.parse
from typing import Optional, Dict, Any, Tuple
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

class SharePointServiceError(Exception):
    def __init__(self, message: str, status_code: int = 500, detail: Optional[str] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.detail = detail

class SharePointService:
    def get_config(self) -> Tuple[Optional[str], Optional[str], Optional[str], Optional[str], Optional[str], Optional[str], str]:
        tenant_id = os.getenv("SHAREPOINT_TENANT_ID") or getattr(settings, "SHAREPOINT_TENANT_ID", None)
        client_id = os.getenv("SHAREPOINT_CLIENT_ID") or getattr(settings, "SHAREPOINT_CLIENT_ID", None)
        client_secret = os.getenv("SHAREPOINT_CLIENT_SECRET") or getattr(settings, "SHAREPOINT_CLIENT_SECRET", None)
        site_id = os.getenv("SHAREPOINT_SITE_ID") or getattr(settings, "SHAREPOINT_SITE_ID", None)
        drive_id = os.getenv("SHAREPOINT_DRIVE_ID") or getattr(settings, "SHAREPOINT_DRIVE_ID", None)
        folder_id = os.getenv("SHAREPOINT_FOLDER_ID") or getattr(settings, "SHAREPOINT_FOLDER_ID", None)
        share_link = os.getenv("SHAREPOINT_SHARE_LINK") or getattr(
            settings,
            "SHAREPOINT_SHARE_LINK",
            "https://obtmhl.sharepoint.com/:f:/s/GFOLamDashboard/IgCEoaEMIExDTZ8APnqexqm6AW57-lo5YOkQng0OaKntfJ4?e=zAHtzC"
        )
        return tenant_id, client_id, client_secret, site_id, drive_id, folder_id, share_link

    def get_access_token(self) -> str:
        tenant_id, client_id, client_secret, _, _, _, _ = self.get_config()
        if not tenant_id or not client_id or not client_secret:
            raise SharePointServiceError(
                message="Unable to upload image because Microsoft Graph application credentials (SHAREPOINT_TENANT_ID, SHAREPOINT_CLIENT_ID, SHAREPOINT_CLIENT_SECRET) are missing or unconfigured in server environment settings.",
                status_code=503
            )

        token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
        payload = {
            "client_id": client_id,
            "client_secret": client_secret,
            "scope": "https://graph.microsoft.com/.default",
            "grant_type": "client_credentials"
        }
        try:
            with httpx.Client(timeout=15.0) as client:
                res = client.post(token_url, data=payload)
                if res.status_code != 200:
                    logger.error("Microsoft Graph token request failed [%s]: %s", res.status_code, res.text)
                    err_msg = res.text
                    try:
                        err_data = res.json()
                        err_msg = err_data.get("error_description") or err_data.get("error") or res.text
                    except Exception:
                        pass
                    raise SharePointServiceError(
                        message=f"Microsoft Graph authentication failed: {err_msg}",
                        status_code=502
                    )
                data = res.json()
                return data["access_token"]
        except httpx.RequestError as e:
            logger.error("Network error authenticating with Microsoft Graph: %s", str(e))
            raise SharePointServiceError(
                message=f"Network connection failure while authenticating with Microsoft Graph: {str(e)}",
                status_code=503
            )

    def upload_photo(self, filename: str, content: bytes, mime_type: str) -> Dict[str, Any]:
        """
        Uploads engineer photo file content to SharePoint via Microsoft Graph API.
        Returns a dict containing item_id, web_url, download_url, etc.
        """
        token = self.get_access_token()
        tenant_id, client_id, client_secret, site_id, drive_id, folder_id, share_link = self.get_config()

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": mime_type
        }

        # Determine target Graph API PUT endpoint URL for uploading the file
        if drive_id and folder_id:
            upload_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{folder_id}:/{filename}:/content"
        elif site_id and folder_id:
            upload_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drive/items/{folder_id}:/{filename}:/content"
        elif drive_id:
            upload_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/{filename}:/content"
        elif share_link:
            # Encode sharing URL according to Graph API spec: 'u!' + base64url without padding
            encoded_url = "u!" + base64.b64encode(share_link.encode("utf-8")).decode("utf-8").rstrip("=").replace("/", "_").replace("+", "-")
            upload_url = f"https://graph.microsoft.com/v1.0/shares/{encoded_url}/driveItem:/{filename}:/content"
        else:
            raise SharePointServiceError(
                message="Target SharePoint repository location is missing or unconfigured.",
                status_code=503
            )

        try:
            with httpx.Client(timeout=30.0) as client:
                res = client.put(upload_url, headers=headers, content=content)
                if res.status_code not in (200, 201):
                    logger.error("SharePoint file upload failed [%s]: %s", res.status_code, res.text)
                    err_msg = res.text
                    try:
                        err_json = res.json()
                        err_msg = err_json.get("error", {}).get("message") or res.text
                    except Exception:
                        pass

                    if res.status_code in (401, 403):
                        raise SharePointServiceError(
                            message=f"Unable to upload image because the ORMP application does not currently have permission to write to the SharePoint engineer-images folder. ({err_msg})",
                            status_code=403
                        )
                    elif res.status_code == 404:
                        raise SharePointServiceError(
                            message=f"Target SharePoint site or folder was not found. Please verify SharePoint configuration. ({err_msg})",
                            status_code=404
                        )
                    else:
                        raise SharePointServiceError(
                            message=f"SharePoint Graph API upload failed with status {res.status_code}: {err_msg}",
                            status_code=502
                        )

                data = res.json()
                web_url = data.get("webUrl", "")
                item_id = data.get("id", "")
                download_url = data.get("@microsoft.graph.downloadUrl", "")
                return {
                    "item_id": item_id,
                    "web_url": web_url,
                    "download_url": download_url,
                    "filename": filename
                }
        except httpx.RequestError as e:
            logger.error("Network error uploading to SharePoint: %s", str(e))
            raise SharePointServiceError(
                message=f"Network connection failure while uploading image to SharePoint: {str(e)}",
                status_code=503
            )

sharepoint_service = SharePointService()
