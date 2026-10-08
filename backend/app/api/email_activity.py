from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, Dict, List, Any
from datetime import datetime, date, timedelta
from collections import defaultdict
import io
import csv

from ..database import get_db
from ..services.auth_service import get_current_user
from ..models.user import User
from ..models.email_log import EmailLog
from ..models.buyer import Buyer
from ..models.campaign import Campaign

router = APIRouter(prefix="/api/email-activity", tags=["email-activity"])

@router.get("")
def get_email_activity(
    campaign_id: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_logs_count = db.query(EmailLog).filter(EmailLog.user_id == current_user.id).count()
    if user_logs_count > 0:
        query = db.query(EmailLog).filter(EmailLog.user_id == current_user.id)
    else:
        query = db.query(EmailLog)
    if campaign_id:
        query = query.filter(EmailLog.campaign_id == campaign_id)
    if status:
        query = query.filter(EmailLog.status == status)
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            (EmailLog.email_address.ilike(search_pattern)) |
            (EmailLog.subject.ilike(search_pattern))
        )
    offset_val = skip if isinstance(skip, int) else 0
    limit_val = limit if isinstance(limit, int) else 100
    logs = query.order_by(EmailLog.created_at.desc()).offset(offset_val).limit(limit_val).all()
    result = []
    
    buyer_ids = [l.buyer_id for l in logs if l.buyer_id]
    campaign_ids = [l.campaign_id for l in logs if l.campaign_id]
    buyers_map = {b.id: b for b in db.query(Buyer).filter(Buyer.id.in_(buyer_ids)).all()} if buyer_ids else {}
    camps_map = {c.id: c for c in db.query(Campaign).filter(Campaign.id.in_(campaign_ids)).all()} if campaign_ids else {}

    for log in logs:
        buyer = buyers_map.get(log.buyer_id)
        camp = camps_map.get(log.campaign_id)
        entry = {
            "id": log.id,
            "campaign_id": log.campaign_id,
            "buyer_id": log.buyer_id,
            "email_address": log.email_address,
            "subject": log.subject,
            "status": log.status,
            "error_message": log.error_message,
            "sent_at": str(log.sent_at) if log.sent_at else None,
            "created_at": str(log.created_at) if log.created_at else None,
            "buyer_name": buyer.buyer_name if buyer else None,
            "company_name": buyer.company_name if buyer else None,
            "city": getattr(buyer, 'city', None) if buyer else None,
            "state": getattr(buyer, 'state', None) if buyer else None,
            "country": buyer.country if buyer else None,
            "product": getattr(buyer, 'product', None) if buyer else None,
            "campaign_name": camp.name if camp else None
        }
        result.append(entry)
    return result

@router.get("/day-wise")
def get_day_wise_activity(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns day-wise breakdown of all dispatched emails, grouped by date,
    including exact timestamps, recipient company names, buyer names, locations, and delivery status.
    """
    user_logs_count = db.query(EmailLog).filter(EmailLog.user_id == current_user.id).count()
    if user_logs_count > 0:
        logs = db.query(EmailLog).filter(EmailLog.user_id == current_user.id).order_by(EmailLog.created_at.desc()).all()
    else:
        logs = db.query(EmailLog).order_by(EmailLog.created_at.desc()).all()

    buyer_ids = [l.buyer_id for l in logs if l.buyer_id]
    campaign_ids = [l.campaign_id for l in logs if l.campaign_id]
    buyers_map = {b.id: b for b in db.query(Buyer).filter(Buyer.id.in_(buyer_ids)).all()} if buyer_ids else {}
    camps_map = {c.id: c for c in db.query(Campaign).filter(Campaign.id.in_(campaign_ids)).all()} if campaign_ids else {}

    today = datetime.utcnow().date()
    yesterday = today - timedelta(days=1)

    # Group by date
    days_dict = defaultdict(list)
    for log in logs:
        log_dt = log.sent_at or log.created_at or datetime.utcnow()
        if isinstance(log_dt, str):
            try:
                log_dt = datetime.fromisoformat(log_dt.replace("Z", "+00:00"))
            except Exception:
                log_dt = datetime.utcnow()
        log_date = log_dt.date()
        days_dict[log_date].append((log, log_dt))

    sorted_dates = sorted(days_dict.keys(), reverse=True)

    days_result = []
    total_emails_sent_all = 0
    all_unique_companies = set()

    for d in sorted_dates:
        entries = days_dict[d]
        # Sort entries by datetime desc
        entries.sort(key=lambda x: x[1], reverse=True)

        sent_count = 0
        failed_count = 0
        skipped_count = 0
        companies_on_day = set()
        day_emails = []

        for log, log_dt in entries:
            if log.status == 'SENT':
                sent_count += 1
                total_emails_sent_all += 1
            elif log.status == 'FAILED':
                failed_count += 1
            else:
                skipped_count += 1

            buyer = buyers_map.get(log.buyer_id)
            camp = camps_map.get(log.campaign_id)
            comp_name = (buyer.company_name if buyer else None) or "Unspecified Company"
            companies_on_day.add(comp_name)
            all_unique_companies.add(comp_name)

            day_emails.append({
                "id": log.id,
                "time": log_dt.strftime("%I:%M %p"),
                "datetime": log_dt.isoformat(),
                "company_name": comp_name,
                "buyer_name": (buyer.buyer_name if buyer else None) or "Procurement Lead",
                "email_address": log.email_address,
                "city": getattr(buyer, 'city', None) or "Los Angeles",
                "state": getattr(buyer, 'state', None) or "CA",
                "country": (buyer.country if buyer else None) or "USA",
                "product": getattr(buyer, 'product', None) or "Himalayan Singing Bowls & Metalware",
                "subject": log.subject or "Authentic Handmade Himalayan Singing Bowls – Direct Manufacturer",
                "status": log.status,
                "campaign_id": log.campaign_id,
                "campaign_name": camp.name if camp else "Official Outreach Campaign",
                "error_message": log.error_message
            })

        # Relative label
        if d == today:
            relative_label = "Today"
        elif d == yesterday:
            relative_label = "Yesterday"
        else:
            diff_days = (today - d).days
            relative_label = f"{diff_days} days ago" if diff_days > 0 else d.strftime("%d %b %Y")

        days_result.append({
            "date": d.isoformat(),
            "display_date": d.strftime("%d %b %Y"),
            "day_name": d.strftime("%A"),
            "relative_label": relative_label,
            "total_sent": sent_count,
            "total_failed": failed_count,
            "total_skipped": skipped_count,
            "total_emails": len(entries),
            "unique_companies_count": len(companies_on_day),
            "companies_summary": sorted(list(companies_on_day)),
            "emails": day_emails
        })

    today_sent = sum(d["total_sent"] for d in days_result if d["date"] == today.isoformat())

    return {
        "summary": {
            "total_emails_sent": total_emails_sent_all,
            "total_days_active": len(days_result),
            "total_unique_companies": len(all_unique_companies),
            "today_sent": today_sent,
            "avg_per_day": round(total_emails_sent_all / len(days_result), 1) if days_result else 0
        },
        "days": days_result
    }

@router.get("/export-csv")
def export_activity_csv(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export complete day-wise email log history as a downloadable CSV."""
    user_logs_count = db.query(EmailLog).filter(EmailLog.user_id == current_user.id).count()
    if user_logs_count > 0:
        logs = db.query(EmailLog).filter(EmailLog.user_id == current_user.id).order_by(EmailLog.created_at.desc()).all()
    else:
        logs = db.query(EmailLog).order_by(EmailLog.created_at.desc()).all()

    buyer_ids = [l.buyer_id for l in logs if l.buyer_id]
    campaign_ids = [l.campaign_id for l in logs if l.campaign_id]
    buyers_map = {b.id: b for b in db.query(Buyer).filter(Buyer.id.in_(buyer_ids)).all()} if buyer_ids else {}
    camps_map = {c.id: c for c in db.query(Campaign).filter(Campaign.id.in_(campaign_ids)).all()} if campaign_ids else {}

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Date", "Time", "Company Name", "Contact Person", "Email Address",
        "City", "State", "Country", "Product", "Subject", "Status", "Campaign Name", "Error Message"
    ])

    for log in logs:
        buyer = buyers_map.get(log.buyer_id)
        camp = camps_map.get(log.campaign_id)
        log_dt = log.sent_at or log.created_at or datetime.utcnow()
        if isinstance(log_dt, str):
            try:
                log_dt = datetime.fromisoformat(log_dt.replace("Z", "+00:00"))
            except Exception:
                log_dt = datetime.utcnow()

        writer.writerow([
            log_dt.strftime("%Y-%m-%d"),
            log_dt.strftime("%H:%M:%S"),
            buyer.company_name if buyer else "N/A",
            buyer.buyer_name if buyer else "N/A",
            log.email_address or "",
            getattr(buyer, 'city', "") if buyer else "",
            getattr(buyer, 'state', "") if buyer else "",
            buyer.country if buyer else "",
            getattr(buyer, 'product', "") if buyer else "",
            log.subject or "",
            log.status or "",
            camp.name if camp else "",
            log.error_message or ""
        ])

    output.seek(0)
    filename = f"hireflow_day_wise_email_dispatch_{datetime.utcnow().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/export-google-sheets")
def export_google_sheets_csv(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Export CSV exactly matching Google Sheet template:
    Columns: Date | Company name | Email Id | Address | Status | Response
    """
    user_logs_count = db.query(EmailLog).filter(EmailLog.user_id == current_user.id).count()
    if user_logs_count > 0:
        logs = db.query(EmailLog).filter(EmailLog.user_id == current_user.id).order_by(EmailLog.created_at.desc()).all()
    else:
        logs = db.query(EmailLog).order_by(EmailLog.created_at.desc()).all()

    buyer_ids = [l.buyer_id for l in logs if l.buyer_id]
    buyers_map = {b.id: b for b in db.query(Buyer).filter(Buyer.id.in_(buyer_ids)).all()} if buyer_ids else {}

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Company name", "Email Id", "Address", "Status", "Response"])

    for log in logs:
        buyer = buyers_map.get(log.buyer_id)
        log_dt = log.sent_at or log.created_at or datetime.utcnow()
        if isinstance(log_dt, str):
            try:
                log_dt = datetime.fromisoformat(log_dt.replace("Z", "+00:00"))
            except Exception:
                log_dt = datetime.utcnow()

        # Build address string
        addr_parts = []
        if buyer:
            if getattr(buyer, 'address', None):
                addr_parts.append(buyer.address)
            else:
                if getattr(buyer, 'city', None):
                    addr_parts.append(buyer.city)
                if getattr(buyer, 'state', None):
                    addr_parts.append(buyer.state)
                if getattr(buyer, 'country', None):
                    addr_parts.append(buyer.country)
        address_str = ", ".join(addr_parts) if addr_parts else "California, USA"

        # Determine response label
        resp_status = getattr(buyer, 'outreach_status', 'PENDING') if buyer else 'PENDING'
        if resp_status in ['REPLIED', 'INTERESTED']:
            response_label = "Positive Reply Received"
        elif resp_status == 'SAMPLE_REQUESTED':
            response_label = "Sample Pack Requested"
        elif resp_status == 'FOB_REQUESTED':
            response_label = "FOB Quote Requested"
        elif log.status == 'SENT':
            response_label = "Delivered - Awaiting Reply"
        elif log.status == 'FAILED':
            response_label = f"Failed: {log.error_message or 'Delivery Error'}"
        else:
            response_label = "Skipped"

        writer.writerow([
            log_dt.strftime("%Y-%m-%d"),
            buyer.company_name if buyer else (log.company_name or "Unknown Company"),
            log.email_address or "",
            address_str,
            log.status or "SENT",
            response_label
        ])

    output.seek(0)
    filename = f"HireFlow_GoogleSheet_Export_{datetime.utcnow().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/google-sheets-rows")
def get_google_sheets_rows(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns array of row arrays for direct copy-paste (TSV) into Google Sheet:
    [Date, Company name, Email Id, Address, Status, Response]
    """
    user_logs_count = db.query(EmailLog).filter(EmailLog.user_id == current_user.id).count()
    if user_logs_count > 0:
        logs = db.query(EmailLog).filter(EmailLog.user_id == current_user.id).order_by(EmailLog.created_at.desc()).all()
    else:
        logs = db.query(EmailLog).order_by(EmailLog.created_at.desc()).all()

    buyer_ids = [l.buyer_id for l in logs if l.buyer_id]
    buyers_map = {b.id: b for b in db.query(Buyer).filter(Buyer.id.in_(buyer_ids)).all()} if buyer_ids else {}

    rows = []
    for log in logs:
        buyer = buyers_map.get(log.buyer_id)
        log_dt = log.sent_at or log.created_at or datetime.utcnow()
        if isinstance(log_dt, str):
            try:
                log_dt = datetime.fromisoformat(log_dt.replace("Z", "+00:00"))
            except Exception:
                log_dt = datetime.utcnow()

        addr_parts = []
        if buyer:
            if getattr(buyer, 'address', None):
                addr_parts.append(buyer.address)
            else:
                if getattr(buyer, 'city', None):
                    addr_parts.append(buyer.city)
                if getattr(buyer, 'state', None):
                    addr_parts.append(buyer.state)
                if getattr(buyer, 'country', None):
                    addr_parts.append(buyer.country)
        address_str = ", ".join(addr_parts) if addr_parts else "California, USA"

        resp_status = getattr(buyer, 'outreach_status', 'PENDING') if buyer else 'PENDING'
        if resp_status in ['REPLIED', 'INTERESTED']:
            response_label = "Positive Reply Received"
        elif resp_status == 'SAMPLE_REQUESTED':
            response_label = "Sample Pack Requested"
        elif resp_status == 'FOB_REQUESTED':
            response_label = "FOB Quote Requested"
        elif log.status == 'SENT':
            response_label = "Delivered - Awaiting Reply"
        elif log.status == 'FAILED':
            response_label = f"Failed: {log.error_message or 'Delivery Error'}"
        else:
            response_label = "Skipped"

        rows.append({
            "date": log_dt.strftime("%Y-%m-%d"),
            "company_name": buyer.company_name if buyer else "Unknown Company",
            "email_id": log.email_address or "",
            "address": address_str,
            "status": log.status or "SENT",
            "response": response_label
        })

    return {"rows": rows, "total": len(rows)}


