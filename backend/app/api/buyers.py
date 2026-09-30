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
    """Adds 25 verified Candle Stand & Lantern US wholesale buyers to the current user's database."""
    from ..services.candle_buyers_data import CANDLE_STAND_BUYERS
    from ..models.buyer import Buyer
    from ..utils.duplicate_utils import normalize_email

    added = 0
    skipped = 0

    for bd in CANDLE_STAND_BUYERS:
        email = (bd.get("email") or "").strip()
        norm = normalize_email(email)
        existing = db.query(Buyer).filter(
            Buyer.user_id == current_user.id,
            Buyer.normalized_email == norm
        ).first()

        if existing:
            skipped += 1
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
        "skipped": skipped,
        "total": len(CANDLE_STAND_BUYERS),
        "message": f"Successfully loaded {added} verified Candle Stand & Lantern buyers to your database!"
    }
