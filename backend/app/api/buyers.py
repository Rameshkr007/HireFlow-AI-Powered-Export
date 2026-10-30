from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, List
import io
from ..database import get_db
from ..schemas.buyer import BuyerCreate, BuyerUpdate, BuyerResponse, BuyerListResponse, BuyerImportResult
from ..services import buyer_service
from ..services.auth_service import get_current_user
from ..models.user import User

router = APIRouter(prefix="/api/buyers", tags=["buyers"])

@router.get("", response_model=BuyerListResponse)
def list_buyers(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    search: Optional[str] = None,
    country: Optional[str] = None,
    business_type: Optional[str] = None,
    priority: Optional[str] = None,
    email_status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    buyers, total = buyer_service.get_buyers(db, current_user.id, skip, limit, search, country, business_type, priority, email_status)
    return BuyerListResponse(buyers=buyers, total=total, skip=skip, limit=limit)

@router.get("/export")
def export_buyers(
    priority: Optional[str] = None,
    email_status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    csv_content = buyer_service.export_buyers_csv(db, current_user.id, priority, email_status)
    return StreamingResponse(
        io.StringIO(csv_content),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=buyers_export.csv"}
    )

@router.post("/import", response_model=BuyerImportResult)
async def import_buyers(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not file.filename or not file.filename.lower().endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    content = await file.read()
    return buyer_service.import_buyers_csv(db, current_user.id, content)

@router.post("", response_model=BuyerResponse)
def create_buyer(
    data: BuyerCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return buyer_service.create_buyer(db, current_user.id, data)

@router.get("/{buyer_id}", response_model=BuyerResponse)
def get_buyer(
    buyer_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return buyer_service.get_buyer(db, current_user.id, buyer_id)

@router.put("/{buyer_id}", response_model=BuyerResponse)
def update_buyer(
    buyer_id: int,
    data: BuyerUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return buyer_service.update_buyer(db, current_user.id, buyer_id, data)

@router.delete("/{buyer_id}")
def delete_buyer(
    buyer_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    buyer_service.delete_buyer(db, current_user.id, buyer_id)
    return {"success": True}

@router.post("/{buyer_id}/validate", response_model=BuyerResponse)
def validate_buyer(
    buyer_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return buyer_service.validate_buyer_email(db, current_user.id, buyer_id)

@router.post("/{buyer_id}/classify", response_model=BuyerResponse)
async def classify_buyer(
    buyer_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return await buyer_service.classify_buyer_ai(db, current_user.id, buyer_id)

@router.post("/bulk-classify")
async def bulk_classify(
    buyer_ids: List[int],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    classified = 0
    failed = 0
    for buyer_id in buyer_ids:
        try:
            await buyer_service.classify_buyer_ai(db, current_user.id, buyer_id)
            classified += 1
        except Exception:
            failed += 1
    return {"classified": classified, "failed": failed}

@router.post("/bulk-validate")
def bulk_validate(
    buyer_ids: List[int],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    validated = 0
    for buyer_id in buyer_ids:
        try:
            buyer_service.validate_buyer_email(db, current_user.id, buyer_id)
            validated += 1
        except Exception:
            pass
    return {"validated": validated}

@router.post("/seed-candle-buyers")
def seed_candle_buyers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Adds 100 verified export buyers (50 Candle Stand + 50 Himalayan Singing Bowls) with full street addresses."""
    from ..services.candle_buyers_data import MASTER_EXPORT_BUYERS
    from ..models.buyer import Buyer
    from ..utils.duplicate_utils import normalize_email

    added = 0
    updated = 0

    for bd in MASTER_EXPORT_BUYERS:
        email = (bd.get("email") or "").strip()
        norm = normalize_email(email)
        existing = db.query(Buyer).filter(
            Buyer.user_id == current_user.id,
            Buyer.normalized_email == norm
        ).first()

        if existing:
            existing.address = bd.get("address") or existing.address
            existing.city = bd.get("city") or existing.city
            existing.state = bd.get("state") or existing.state
            existing.phone = bd.get("phone") or existing.phone
            existing.website = bd.get("website") or existing.website
            updated += 1
            continue

        buyer = Buyer(
            user_id=current_user.id,
            buyer_name=bd.get("buyer_name"),
            company_name=bd.get("company_name"),
            email=bd.get("email"),
            normalized_email=norm,
            website=bd.get("website"),
            country=bd.get("country", "USA"),
            city=bd.get("city"),
            state=bd.get("state"),
            address=bd.get("address"),
            source_platform=bd.get("source_platform", "US Importers Registry"),
            business_type=bd.get("business_type", "Importer"),
            product=bd.get("product", "Metal Candle Holders & Lanterns"),
            company_description=bd.get("company_description"),
            phone=bd.get("phone"),
            linkedin_url=bd.get("linkedin_url"),
            email_status=bd.get("email_status", "VALID"),
            outreach_status="PENDING",
            ai_priority=bd.get("ai_priority", "HIGH"),
            ai_score=bd.get("ai_score", 95),
            ai_confidence=bd.get("ai_confidence", 0.95),
            ai_reason=bd.get("ai_reason"),
            ai_business_type=bd.get("business_type"),
            is_demo=False
        )
        db.add(buyer)
        added += 1

    db.commit()
    return {
        "success": True,
        "added": added,
        "updated": updated,
        "total": len(MASTER_EXPORT_BUYERS),
        "message": f"Successfully loaded & synced {added + updated} verified buyers with physical addresses!"
    }

@router.post("/{buyer_id}/enrich-decision-maker", response_model=BuyerResponse)
def enrich_buyer_dm(
    buyer_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from ..services.lead_enrichment_service import enrich_single_buyer
    buyer = buyer_service.get_buyer(db, current_user.id, buyer_id)
    enrich_single_buyer(buyer)
    db.commit()
    db.refresh(buyer)
    return buyer

@router.post("/bulk-enrich-decision-makers")
def bulk_enrich_dms(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from ..services.lead_enrichment_service import bulk_enrich_buyers
    return bulk_enrich_buyers(db, current_user.id)

@router.get("/{buyer_id}/whatsapp-script")
def get_buyer_whatsapp(
    buyer_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from ..services.lead_enrichment_service import generate_whatsapp_pitch
    buyer = buyer_service.get_buyer(db, current_user.id, buyer_id)
    return generate_whatsapp_pitch(
        buyer_name=buyer.buyer_name or "Procurement Manager",
        company_name=buyer.company_name or "your company",
        phone=buyer.phone or ""
    )

from pydantic import BaseModel

class IndividualEmailDispatchSchema(BaseModel):
    buyer_id: Optional[int] = None
    to_email: str
    recipient_name: Optional[str] = "Buyer"
    company_name: Optional[str] = "Company"
    subject: str
    body_text: str
    body_html: Optional[str] = None
    attachment_name: Optional[str] = None
    attachment_path: Optional[str] = None
    attachment_list: Optional[List[str]] = None
    template_id: Optional[str] = "custom"

@router.post("/send-individual")
def send_individual_pitch(
    payload: IndividualEmailDispatchSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from ..services.email_ledger_service import record_and_dispatch_email
    from ..models.buyer import Buyer
    import os

    clean_to = payload.to_email.strip().lower()
    if not clean_to or "@" not in clean_to:
        raise HTTPException(status_code=400, detail="Please enter a valid recipient email address.")

    # Locate attachment path if an attachment_name was specified
    att_name = payload.attachment_name
    att_path = payload.attachment_path
    if att_name and not att_path:
        from ..config import settings
        upload_dir = os.path.abspath(settings.UPLOAD_DIR)
        candidate = os.path.join(upload_dir, att_name)
        if os.path.exists(candidate):
            att_path = candidate

    # Build safe attachment items list (avoids raw string crashes)
    built_items = []
    if att_path and os.path.exists(att_path):
        built_items.append({"path": att_path, "name": att_name or os.path.basename(att_path)})
    elif att_name:
        built_items.append({"name": att_name})

    send_log, send_success, send_err = record_and_dispatch_email(
        db=db,
        user_id=current_user.id,
        recipient_email=clean_to,
        subject=payload.subject,
        body_text=payload.body_text,
        body_html=payload.body_html,
        buyer_id=payload.buyer_id,
        attachment_name=att_name,
        attachment_path=att_path,
        attachment_list=built_items,
        is_demo=False,
        recipient_name=payload.recipient_name,
        company_name=payload.company_name
    )

    # If buyer exists, mark as CONTACTED
    buyer = None
    if payload.buyer_id:
        buyer = db.query(Buyer).filter(Buyer.id == payload.buyer_id).first()
    if not buyer:
        buyer = db.query(Buyer).filter(Buyer.email == clean_to).first()
    if buyer:
        buyer.outreach_status = "CONTACTED"
        buyer.last_contacted_at = send_log.sent_at or send_log.created_at
        db.commit()

    if not send_success:
        return {
            "success": False,
            "status": "FAILED",
            "error": send_err or "Failed to deliver email. Check provider settings.",
            "log_id": send_log.id if send_log else None
        }

    return {
        "success": True,
        "status": "SENT",
        "message": f"Individual email successfully dispatched to {clean_to}!",
        "log_id": send_log.id if send_log else None,
        "recipient": clean_to
    }
