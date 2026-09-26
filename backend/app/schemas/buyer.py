from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class BuyerCreate(BaseModel):
    buyer_name: Optional[str] = None
    company_name: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    country: Optional[str] = None
    source_platform: Optional[str] = None
    business_type: Optional[str] = None
    page_url: Optional[str] = None
    product: Optional[str] = None
    company_description: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    facebook_url: Optional[str] = None

class BuyerUpdate(BuyerCreate):
    email_status: Optional[str] = None
    outreach_status: Optional[str] = None
    ai_priority: Optional[str] = None

class BuyerResponse(BaseModel):
    id: int
    user_id: int
    buyer_name: Optional[str] = None
    company_name: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    country: Optional[str] = None
    source_platform: Optional[str] = None
    business_type: Optional[str] = None
    page_url: Optional[str] = None
    product: Optional[str] = None
    company_description: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    facebook_url: Optional[str] = None
    email_status: Optional[str] = None
    outreach_status: Optional[str] = None
    ai_priority: Optional[str] = None
    ai_score: Optional[int] = None
    ai_confidence: Optional[float] = None
    ai_reason: Optional[str] = None
    ai_business_type: Optional[str] = None
    last_contacted: Optional[datetime] = None
    is_demo: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class BuyerListResponse(BaseModel):
    buyers: List[BuyerResponse]
    total: int
    skip: int
    limit: int

class AIClassificationResult(BaseModel):
    business_type: str
    lead_priority: str  # HIGH, MEDIUM, LOW
    confidence_score: float  # 0.0 to 1.0
    reason: str

class BuyerImportResult(BaseModel):
    rows_imported: int
    valid_rows: int
    invalid_rows: int
    duplicates: int
    incomplete_rows: int
    errors: List[str] = []

class DiscoveryRequest(BaseModel):
    product: str
    country: str
    buyer_type: str = "Importer"
    keywords: Optional[str] = None
