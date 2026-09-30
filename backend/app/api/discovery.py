from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

from ..database import get_db
from ..services.auth_service import get_current_user
from ..services.discovery_service import (
    discover_buyers,
    get_configured_sources,
)
from ..services.buyer_service import create_buyer, check_duplicate
from ..schemas.buyer import BuyerCreate
from ..utils.duplicate_utils import normalize_email
from ..models.user import User

router = APIRouter(prefix="/api/discovery", tags=["discovery"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class DiscoverRequest(BaseModel):
    product: str = "home decor"
    country: str = "United States"
    buyer_type: str = "Importer"   # Importer | Distributor | Retailer | Wholesaler
    limit: int = 20
    auto_import: bool = True        # auto-save found buyers to DB


class ImportSelectedRequest(BaseModel):
    buyers: list          # list of buyer dicts from discovery result


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/sources")
def list_sources(current_user: User = Depends(get_current_user)):
    """Return which discovery APIs are configured."""
    return get_configured_sources()


@router.post("/search")
async def search_buyers(
    data: DiscoverRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Live buyer discovery via Apollo / Hunter / SerpAPI.
    Optionally auto-imports found buyers (skipping duplicates).
    """
    result = await discover_buyers(
        product=data.product,
        country=data.country,
        buyer_type=data.buyer_type,
        limit=data.limit,
    )

    imported = 0
    skipped_dup = 0

    if data.auto_import and result["buyers"]:
        for b in result["buyers"]:
            email = (b.get("email") or "").strip()
            if email and check_duplicate(db, current_user.id, email):
                skipped_dup += 1
                continue
            try:
                create_buyer(
                    db,
                    current_user.id,
                    BuyerCreate(
                        buyer_name=b.get("buyer_name"),
                        company_name=b.get("company_name"),
                        email=b.get("email"),
                        website=b.get("website"),
                        country=b.get("country") or data.country,
                        city=b.get("city"),
                        state=b.get("state"),
                        address=b.get("address"),
                        source_platform=b.get("source_platform", "API Discovery"),
                        business_type=b.get("business_type") or data.buyer_type,
                        product=b.get("product") or data.product,
                        company_description=b.get("company_description"),
                        phone=b.get("phone"),
                        linkedin_url=b.get("linkedin_url"),
                    ),
                )
                imported += 1
            except Exception:
                skipped_dup += 1

        result["imported"] = imported
        result["skipped_duplicates"] = skipped_dup
        result["message"] += f" {imported} new buyers saved to your database."

    return result


@router.post("/import-selected")
async def import_selected(
    data: ImportSelectedRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Manually import a selection of discovered buyers."""
    imported = 0
    duplicates = 0

    for b in data.buyers:
        email = (b.get("email") or "").strip()
        if email and check_duplicate(db, current_user.id, email):
            duplicates += 1
            continue
        try:
            create_buyer(
                db,
                current_user.id,
                BuyerCreate(
                    buyer_name=b.get("buyer_name"),
                    company_name=b.get("company_name"),
                    email=b.get("email"),
                    website=b.get("website"),
                    country=b.get("country"),
                    city=b.get("city"),
                    state=b.get("state"),
                    address=b.get("address"),
                    source_platform=b.get("source_platform", "API Discovery"),
                    business_type=b.get("business_type"),
                    product=b.get("product"),
                    company_description=b.get("company_description"),
                    phone=b.get("phone"),
                    linkedin_url=b.get("linkedin_url"),
                ),
            )
            imported += 1
        except Exception:
            duplicates += 1

    return {
        "imported": imported,
        "duplicates": duplicates,
        "message": f"{imported} buyers imported. {duplicates} skipped (duplicates).",
    }
