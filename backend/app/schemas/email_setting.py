from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class EmailSettingCreateOrUpdate(BaseModel):
    provider: Optional[str] = "gmail"  # "gmail", "zoho", "outlook", "custom"
    smtp_host: Optional[str] = "smtp.gmail.com"
    smtp_port: Optional[int] = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    from_name: Optional[str] = None
    from_email: Optional[str] = None
    use_tls: Optional[bool] = True
    use_ssl: Optional[bool] = False

class EmailSettingResponse(BaseModel):
    id: Optional[int] = None
    user_id: int
    provider: str = "gmail"
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: Optional[str] = None
    from_name: Optional[str] = None
    from_email: Optional[str] = None
    use_tls: bool = True
    use_ssl: bool = False
    is_verified: bool = False
    has_password: bool = False
    masked_password: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TestEmailRequest(BaseModel):
    to_email: Optional[str] = None
