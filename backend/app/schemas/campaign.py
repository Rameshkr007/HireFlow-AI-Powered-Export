from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class CampaignCreate(BaseModel):
    name: str
    product: Optional[str] = None
    target_country: Optional[str] = None
    target_audience: Optional[str] = None
    email_subject: Optional[str] = None
    email_body: Optional[str] = None
    sequence_steps: Optional[List[Dict[str, Any]]] = None
    sending_limit: int = 20
    delay_seconds: int = 60
    attachment_id: Optional[int] = None
    is_demo: bool = True

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    product: Optional[str] = None
    target_country: Optional[str] = None
    target_audience: Optional[str] = None
    email_subject: Optional[str] = None
    email_body: Optional[str] = None
    sequence_steps: Optional[List[Dict[str, Any]]] = None
    sending_limit: Optional[int] = None
    delay_seconds: Optional[int] = None
    attachment_id: Optional[int] = None
    status: Optional[str] = None

class CampaignResponse(BaseModel):
    id: int
    user_id: int
    name: str
    product: Optional[str] = None
    target_country: Optional[str] = None
    target_audience: Optional[str] = None
    email_subject: Optional[str] = None
    email_body: Optional[str] = None
    sequence_steps: Optional[List[Dict[str, Any]]] = None
    sending_limit: int
    delay_seconds: int
    attachment_id: Optional[int] = None
    status: str
    sent_count: int
    failed_count: int
    skipped_count: int
    total_leads: int
    is_demo: bool
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
