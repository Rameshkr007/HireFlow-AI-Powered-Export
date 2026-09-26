from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import Optional, List
from fastapi import HTTPException
from ..models.buyer import Buyer
from ..schemas.buyer import BuyerCreate, BuyerUpdate, BuyerImportResult, AIClassificationResult
from ..utils.duplicate_utils import normalize_email, normalize_company
from ..utils.csv_utils import parse_buyer_csv, validate_csv_row, buyers_to_csv
from ..services.email_validation_service import validate_email_address
from ..services.ai_service import classify_buyer

def get_buyers(
    db: Session, user_id: int, skip: int = 0, limit: int = 50,
    search: Optional[str] = None, country: Optional[str] = None,
    business_type: Optional[str] = None, priority: Optional[str] = None,
    email_status: Optional[str] = None
) -> tuple:
    query = db.query(Buyer).filter(Buyer.user_id == user_id)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(or_(
            Buyer.buyer_name.ilike(search_term),
            Buyer.company_name.ilike(search_term),
            Buyer.email.ilike(search_term),
            Buyer.country.ilike(search_term)
        ))
    if country:
        query = query.filter(Buyer.country.ilike(f"%{country}%"))
    if business_type:
        query = query.filter(Buyer.business_type == business_type)
    if priority:
        query = query.filter(Buyer.ai_priority == priority)
    if email_status:
        query = query.filter(Buyer.email_status == email_status)
    
    total = query.count()
    buyers = query.order_by(Buyer.created_at.desc()).offset(skip).limit(limit).all()
    return buyers, total

def get_buyer(db: Session, user_id: int, buyer_id: int) -> Buyer:
    buyer = db.query(Buyer).filter(Buyer.id == buyer_id, Buyer.user_id == user_id).first()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer not found")
    return buyer

def check_duplicate(db: Session, user_id: int, email: str) -> bool:
    if not email:
        return False
    norm = normalize_email(email)
    existing = db.query(Buyer).filter(
        Buyer.user_id == user_id,
        Buyer.normalized_email == norm
    ).first()
    return existing is not None

def create_buyer(db: Session, user_id: int, buyer_data: BuyerCreate) -> Buyer:
    # Check duplicate
    if buyer_data.email and check_duplicate(db, user_id, buyer_data.email):
        raise HTTPException(status_code=409, detail="Buyer with this email already exists")
    
    buyer = Buyer(
        user_id=user_id,
        **buyer_data.model_dump(),
        normalized_email=normalize_email(buyer_data.email or "")
    )
    db.add(buyer)
    db.commit()
    db.refresh(buyer)
    return buyer

def update_buyer(db: Session, user_id: int, buyer_id: int, data: BuyerUpdate) -> Buyer:
    buyer = get_buyer(db, user_id, buyer_id)
    update_data = data.model_dump(exclude_unset=True)
    if 'email' in update_data:
        update_data['normalized_email'] = normalize_email(update_data['email'] or "")
    for key, value in update_data.items():
        setattr(buyer, key, value)
    db.commit()
    db.refresh(buyer)
    return buyer

def delete_buyer(db: Session, user_id: int, buyer_id: int):
    buyer = get_buyer(db, user_id, buyer_id)
    db.delete(buyer)
    db.commit()

def validate_buyer_email(db: Session, user_id: int, buyer_id: int) -> Buyer:
    buyer = get_buyer(db, user_id, buyer_id)
    result = validate_email_address(buyer.email or "")
    buyer.email_status = result['status']
    db.commit()
    db.refresh(buyer)
    return buyer

async def classify_buyer_ai(db: Session, user_id: int, buyer_id: int) -> Buyer:
    buyer = get_buyer(db, user_id, buyer_id)
    buyer_info = {
        'company_name': buyer.company_name,
        'country': buyer.country,
        'website': buyer.website,
        'company_description': buyer.company_description,
        'business_type': buyer.business_type,
        'product': buyer.product
    }
    result = await classify_buyer(buyer_info)
    buyer.ai_business_type = result.business_type
    buyer.ai_priority = result.lead_priority.upper()
    buyer.ai_confidence = result.confidence_score
    buyer.ai_reason = result.reason
    # Calculate score 0-100
    priority_scores = {'High': 85, 'Medium': 60, 'Low': 35}
    base_score = priority_scores.get(result.lead_priority, 50)
    buyer.ai_score = int(base_score + (result.confidence_score * 15))
    if buyer.ai_score > 100:
        buyer.ai_score = 100
    db.commit()
    db.refresh(buyer)
    return buyer

def import_buyers_csv(db: Session, user_id: int, csv_content: bytes) -> BuyerImportResult:
    rows = parse_buyer_csv(csv_content)
    rows_imported = 0
    valid_rows = 0
    invalid_rows = 0
    duplicates = 0
    incomplete_rows = 0
    errors = []
    
    for i, row in enumerate(rows):
        is_valid, row_errors = validate_csv_row(row)
        if not is_valid:
            invalid_rows += 1
            errors.extend([f"Row {i+1}: {e}" for e in row_errors])
            continue
        
        # Check if row is incomplete
        if not row.get('email') or not row.get('buyer_name'):
            incomplete_rows += 1
        
        # Check duplicate
        if row.get('email') and check_duplicate(db, user_id, row['email']):
            duplicates += 1
            continue
        
        # Validate email
        email_status = "UNKNOWN"
        if row.get('email'):
            val_result = validate_email_address(row['email'])
            email_status = val_result['status']
        
        buyer = Buyer(
            user_id=user_id,
            buyer_name=row.get('buyer_name'),
            company_name=row.get('company_name'),
            email=row.get('email'),
            normalized_email=normalize_email(row.get('email', '')),
            website=row.get('website'),
            country=row.get('country'),
            source_platform=row.get('source_platform', 'CSV Import'),
            business_type=row.get('business_type'),
            page_url=row.get('page_url'),
            product=row.get('product'),
            company_description=row.get('company_description'),
            phone=row.get('phone'),
            email_status=email_status
        )
        db.add(buyer)
        valid_rows += 1
        rows_imported += 1
    
    db.commit()
    return BuyerImportResult(
        rows_imported=rows_imported,
        valid_rows=valid_rows,
        invalid_rows=invalid_rows,
        duplicates=duplicates,
        incomplete_rows=incomplete_rows,
        errors=errors[:20]  # limit error list
    )

def export_buyers_csv(db: Session, user_id: int, priority: Optional[str] = None, email_status: Optional[str] = None) -> str:
    query = db.query(Buyer).filter(Buyer.user_id == user_id)
    if priority:
        query = query.filter(Buyer.ai_priority == priority)
    if email_status:
        query = query.filter(Buyer.email_status == email_status)
    buyers = query.all()
    
    buyer_dicts = []
    for b in buyers:
        buyer_dicts.append({
            'id': b.id,
            'buyer_name': b.buyer_name,
            'company_name': b.company_name,
            'email': b.email,
            'website': b.website,
            'country': b.country,
            'source_platform': b.source_platform,
            'business_type': b.business_type,
            'product': b.product,
            'phone': b.phone,
            'email_status': b.email_status,
            'outreach_status': b.outreach_status,
            'ai_priority': b.ai_priority,
            'ai_score': b.ai_score,
            'last_contacted': str(b.last_contacted) if b.last_contacted else '',
            'created_at': str(b.created_at)
        })
    return buyers_to_csv(buyer_dicts)
