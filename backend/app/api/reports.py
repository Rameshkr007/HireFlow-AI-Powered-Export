from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io
from ..database import get_db
from ..schemas.report import CampaignReportResponse
from ..services import report_service
from ..services.auth_service import get_current_user
from ..models.user import User
from ..utils.csv_utils import buyers_to_csv

router = APIRouter(prefix="/api/reports", tags=["reports"])

@router.get("/{campaign_id}", response_model=CampaignReportResponse)
def get_report(campaign_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return report_service.generate_campaign_report(db, campaign_id, current_user.id)

@router.get("/{campaign_id}/export")
def export_report(campaign_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    report = report_service.generate_campaign_report(db, campaign_id, current_user.id)
    csv_data = [
        {"metric": k, "value": v}
        for k, v in report.model_dump().items()
        if not isinstance(v, dict)
    ]
    csv_str = buyers_to_csv(csv_data)
    return StreamingResponse(
        io.StringIO(csv_str),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=report_{campaign_id}.csv"}
    )
