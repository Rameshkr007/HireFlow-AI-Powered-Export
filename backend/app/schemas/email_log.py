from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class EmailLogResponse(BaseModel):
    id: int
    campaign_id: int
    buyer_id: Optional[int] = None
    user_id: int
    email_address: Optional[str] = None
    subject: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    attachment_name: Optional[str] = None
    sent_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    
    # Joined buyer fields
    buyer_name: Optional[str] = None
    company_name: Optional[str] = None
    country: Optional[str] = None
    
    class Config:
        from_attributes = True
