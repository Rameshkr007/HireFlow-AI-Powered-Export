from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ExporterProfileCreate(BaseModel):
    exporter_name: Optional[str] = None
    company_name: Optional[str] = None
    company_email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    country: Optional[str] = None
    address: Optional[str] = None
    product_categories: Optional[List[str]] = []
    company_description: Optional[str] = None
    sender_name: Optional[str] = None

class ExporterProfileUpdate(ExporterProfileCreate):
    pass

class ExporterProfileResponse(ExporterProfileCreate):
    id: int
    user_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
