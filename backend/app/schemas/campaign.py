from pydantic import BaseModel, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime

def _safe_parse_ids(v):
    if v is None:
        return []
    if isinstance(v, (list, tuple, set)):
        return [int(x) for x in v if str(x).isdigit()]
    if isinstance(v, str):
        import json
        try:
            parsed = json.loads(v)
            if isinstance(parsed, list):
                return [int(x) for x in parsed if str(x).isdigit()]
            return [int(parsed)] if str(parsed).isdigit() else []
        except Exception:
            cleaned = v.replace('[', '').replace(']', '').split(',')
            return [int(x.strip()) for x in cleaned if x.strip().isdigit()]
    try:
        if str(v).isdigit():
            return [int(v)]
    except Exception:
        pass
    return []

def _safe_parse_steps(v):
    if v is None:
        return []
    if isinstance(v, list):
        return v
    if isinstance(v, str):
        import json
        try:
            parsed = json.loads(v)
            if isinstance(parsed, list):
                return parsed
            return []
        except Exception:
            return []
    return []

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
    attachment_ids: Optional[List[int]] = []
    is_demo: bool = False

    @field_validator('attachment_ids', mode='before')
    @classmethod
    def parse_attachment_ids_create(cls, v):
        return _safe_parse_ids(v)

    @field_validator('sequence_steps', mode='before')
    @classmethod
    def parse_sequence_steps_create(cls, v):
        return _safe_parse_steps(v)

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
    attachment_ids: Optional[List[int]] = None
    status: Optional[str] = None

    @field_validator('attachment_ids', mode='before')
    @classmethod
    def parse_attachment_ids_update(cls, v):
        return _safe_parse_ids(v)

    @field_validator('sequence_steps', mode='before')
    @classmethod
    def parse_sequence_steps_update(cls, v):
        return _safe_parse_steps(v)

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
    attachment_ids: Optional[List[int]] = []
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

    @field_validator('attachment_ids', mode='before')
    @classmethod
    def parse_attachment_ids_response(cls, v):
        return _safe_parse_ids(v)

    @field_validator('sequence_steps', mode='before')
    @classmethod
    def parse_sequence_steps_response(cls, v):
        return _safe_parse_steps(v)
    
    class Config:
        from_attributes = True
