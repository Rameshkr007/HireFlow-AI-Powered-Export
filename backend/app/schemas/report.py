from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class CampaignReportResponse(BaseModel):
    campaign_id: int
    campaign_name: str
    product: Optional[str] = None
    target_country: Optional[str] = None
    total_buyers: int
    valid_contacts: int
    invalid_emails: int
    duplicates_removed: int
    already_contacted: int
    emails_sent: int
    emails_failed: int
    emails_skipped: int
    high_priority_leads: int
    medium_priority_leads: int
    low_priority_leads: int
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    by_country: Dict[str, int] = {}
    by_business_type: Dict[str, int] = {}
