import uuid
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from ..models.campaign import Campaign
from ..models.buyer import Buyer
from ..models.email_send_log import EmailSendLog
from ..models.email_log import EmailLog
from ..models.user import User
from ..models.exporter_profile import ExporterProfile
from ..services.email_ledger_service import record_and_dispatch_email
from ..workers.campaign_worker import personalize_email_simple

def get_campaign_cadence_status(db: Session, campaign_id: int, user_id: int) -> Dict[str, Any]:
    """Returns the visual status and progress of all steps in the campaign's cadence."""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        return {"error": "Campaign not found", "steps": []}

    steps = campaign.sequence_steps or []
    if not steps:
        # Default fallback to 3-step cadence
        steps = [
            {
                "id": "step-1",
                "step_number": 1,
                "step_name": "Initial Introduction: Handcrafted Collection (Official)",
                "delay_days": 0,
                "condition": "immediate",
                "email_subject": campaign.email_subject or "Export Partnership Opportunity",
                "email_body": campaign.email_body or "Hello {buyer_name},"
            },
            {
                "id": "step-2",
                "step_number": 2,
                "step_name": "Follow-up: Wholesale FOB Price Tiers & Port Freight",
                "delay_days": 3,
                "condition": "if_no_reply",
                "email_subject": "Re: Sourcing inquiry for {company_name}",
                "email_body": "Hi {buyer_name},\n\nFollowing up on my previous note. Can I send our 2-page wholesale price list?\n\nBest regards,\nRamesh Kumar Thakur"
            },
            {
                "id": "step-3",
                "step_number": 3,
                "step_name": "Value Proposition: Custom OEM, Private Label & Low MOQ",
                "delay_days": 7,
                "condition": "if_no_reply",
                "email_subject": "Private label & custom packaging options for {company_name}",
                "email_body": "Hi {buyer_name},\n\nWould it make sense to discuss custom packaging and free samples for {company_name}?\n\nBest regards,\nRamesh Kumar Thakur"
            }
        ]

    # Query send logs for this campaign
    logs = db.query(EmailSendLog).filter(EmailSendLog.campaign_id == campaign_id).all()
    
    # Categorize logs by step tag in operation_id
    step_1_logs = [l for l in logs if "step_1" in (l.operation_id or "") or ("step_2" not in (l.operation_id or "") and "step_3" not in (l.operation_id or ""))]
    step_2_logs = [l for l in logs if "step_2" in (l.operation_id or "")]
    step_3_logs = [l for l in logs if "step_3" in (l.operation_id or "")]

    # Check replied buyers
    contacted_buyer_ids = list(set(l.buyer_id for l in logs if l.buyer_id))
    replied_buyers = db.query(Buyer).filter(
        Buyer.id.in_(contacted_buyer_ids),
        or_(Buyer.outreach_status == 'REPLIED', Buyer.ai_priority == 'HOT LEAD')
    ).all() if contacted_buyer_ids else []
    replied_count = len(replied_buyers)

    now = datetime.now(timezone.utc)
    base_start = campaign.started_at or campaign.created_at or now
    if base_start.tzinfo is None:
        base_start = base_start.replace(tzinfo=timezone.utc)

    status_steps = []
    for idx, s in enumerate(steps, 1):
        delay = s.get("delay_days", 0)
        scheduled_dt = base_start + timedelta(days=delay)
        is_due = now >= scheduled_dt

        if idx == 1:
            sent_cnt = len(step_1_logs)
            st = "COMPLETED" if (sent_cnt > 0 or campaign.status == 'COMPLETED') else ("RUNNING" if campaign.status == 'RUNNING' else "READY")
        elif idx == 2:
            sent_cnt = len(step_2_logs)
            if sent_cnt > 0:
                st = "COMPLETED"
            elif len(step_1_logs) > 0:
                st = "DUE_NOW" if is_due else "SCHEDULED"
            else:
                st = "PENDING"
        elif idx == 3:
            sent_cnt = len(step_3_logs)
            if sent_cnt > 0:
                st = "COMPLETED"
            elif len(step_2_logs) > 0 or len(step_1_logs) > 0:
                st = "DUE_NOW" if is_due else "SCHEDULED"
            else:
                st = "PENDING"
        else:
            sent_cnt = 0
            st = "PENDING"

        status_steps.append({
            "step_number": idx,
            "step_name": s.get("step_name") or f"Touchpoint {idx}",
            "delay_days": delay,
            "condition": s.get("condition", "if_no_reply" if idx > 1 else "immediate"),
            "email_subject": s.get("email_subject", ""),
            "email_body": s.get("email_body", ""),
            "status": st,
            "sent_count": sent_cnt,
            "scheduled_for": scheduled_dt.isoformat(),
            "due_now": is_due and st != "COMPLETED",
            "is_reply_stopped": (idx > 1 and replied_count > 0)
        })

    return {
        "campaign_id": campaign_id,
        "campaign_name": campaign.name,
        "campaign_status": campaign.status,
        "cadence_active": True,
        "total_contacted": len(set(l.recipient_email for l in step_1_logs)),
        "replied_count": replied_count,
        "active_cadence_leads": max(0, len(step_1_logs) - replied_count),
        "steps": status_steps
    }

def execute_cadence_step(db: Session, campaign_id: int, step_number: int, user_id: int, force: bool = False) -> Dict[str, Any]:
    """
    Executes a specific sequence step (e.g., Step 2 or Step 3) for all eligible buyers.
    Rules:
    - If buyer has replied (outreach_status == 'REPLIED'), SKIP (stop cadence).
    - If buyer already received this step, SKIP (idempotent).
    - Safe-mode text-only deliverability.
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        return {"error": "Campaign not found", "dispatched": 0}

    steps = campaign.sequence_steps or []
    target_step = None
    for s in steps:
        if s.get("step_number") == step_number:
            target_step = s
            break

    if not target_step:
        # Fallback to standard step definitions
        if step_number == 2:
            target_step = {
                "step_number": 2,
                "step_name": "Follow-up: Wholesale FOB Price Tiers & Port Freight",
                "delay_days": 3,
                "condition": "if_no_reply",
                "email_subject": "Re: Sourcing inquiry for {company_name}",
                "email_body": """Hi {buyer_name},

Following up on my note regarding our handcrafted metalware & singing bowls for {company_name}.

Can I courier a complimentary physical sample piece to your office to inspect our finish and acoustic tuning firsthand?

Alternatively, I can share our 1-page FOB wholesale price list.

Best regards,

Ramesh Kumar Thakur
Sales Executive | OM Enterprise
📧 rameshkrthakur1816@gmail.com
📱 WhatsApp: +91 80577 10065
Direct Manufacturer from Nepal • Wholesale • OEM • Private Label"""
            }
        elif step_number == 3:
            target_step = {
                "step_number": 3,
                "step_name": "Value Proposition: Custom OEM, Private Label & Low MOQ",
                "delay_days": 7,
                "condition": "if_no_reply",
                "email_subject": "Private label & custom packaging options for {company_name}",
                "email_body": """Hi {buyer_name},

I understand you have a busy procurement schedule. As a direct manufacturer from Nepal, we provide complete OEM customization, laser logo engraving, and barcode packaging for US retail shelves.

Would you be open to reviewing sample finishes or receiving 1 piece at your office?

Best regards,

Ramesh Kumar Thakur
Sales Executive | OM Enterprise
📧 rameshkrthakur1816@gmail.com
📱 WhatsApp: +91 80577 10065
Direct Manufacturer from Nepal • Wholesale • OEM • Private Label"""
            }

    if not target_step:
        return {"error": f"Step {step_number} not found in campaign sequence", "dispatched": 0}

    # Fetch all buyers who received Step 1 in this campaign
    all_campaign_logs = db.query(EmailSendLog).filter(EmailSendLog.campaign_id == campaign_id).all()
    step_1_emails = set(l.recipient_email.lower().strip() for l in all_campaign_logs if l.recipient_email)
    
    # Buyers already sent THIS step
    already_sent_step = set(
        l.recipient_email.lower().strip()
        for l in all_campaign_logs
        if f"step_{step_number}" in (l.operation_id or "")
    )

    # Fetch buyers
    buyers = db.query(Buyer).filter(Buyer.email.in_(list(step_1_emails))).all()

    user = db.query(User).filter(User.id == user_id).first()
    profile = db.query(ExporterProfile).filter(ExporterProfile.user_id == user_id).first()
    user_email_str = user.email if user else "rameshkrthakur1816@gmail.com"

    dispatched = 0
    skipped_replied = 0
    skipped_already_sent = 0

    sub_tmpl = target_step.get("email_subject") or f"Follow-up Regarding Export Sourcing for {{company_name}}"
    body_tmpl = target_step.get("email_body") or f"Hi {{buyer_name}},\n\nFollowing up on my previous note."

    for buyer in buyers:
        b_em = (buyer.email or "").lower().strip()
        if not b_em:
            continue

        # Condition Check: Has buyer replied?
        if getattr(buyer, 'outreach_status', None) == 'REPLIED' or getattr(buyer, 'ai_priority', None) == 'HOT LEAD':
            skipped_replied += 1
            continue

        # Condition Check: Already sent this step?
        if b_em in already_sent_step:
            skipped_already_sent += 1
            continue

        # Personalize subject & body
        p_subject = personalize_email_simple(sub_tmpl, buyer, campaign.product or "", profile=profile, user_email=user_email_str)
        p_body = personalize_email_simple(body_tmpl, buyer, campaign.product or "", profile=profile, user_email=user_email_str)

        op_id = f"op_camp_{campaign_id}_step_{step_number}_{buyer.id}_{uuid.uuid4().hex[:8]}"

        try:
            send_log, send_success, send_err = record_and_dispatch_email(
                db=db,
                user_id=user_id,
                recipient_email=buyer.email,
                subject=p_subject,
                body_text=p_body,
                buyer_id=buyer.id,
                campaign_id=campaign_id,
                operation_id=op_id,
                attachment_name=None,
                attachment_path=None,
                attachment_list=[],
                is_demo=campaign.is_demo
            )
            if send_success:
                dispatched += 1
                already_sent_step.add(b_em)
        except Exception as e:
            print(f"[CADENCE DISPATCH ERROR] Step {step_number} for {b_em}: {e}")

    # Update sequence_steps in campaign
    updated_steps = []
    for s in steps:
        if s.get("step_number") == step_number:
            s_copy = dict(s)
            s_copy["status"] = "COMPLETED"
            s_copy["sent_at"] = datetime.now(timezone.utc).isoformat()
            s_copy["sent_count"] = dispatched
            updated_steps.append(s_copy)
        else:
            updated_steps.append(s)

    campaign.sequence_steps = updated_steps
    db.commit()

    return {
        "status": "success",
        "step_number": step_number,
        "step_name": target_step.get("step_name"),
        "dispatched": dispatched,
        "skipped_replied": skipped_replied,
        "skipped_already_sent": skipped_already_sent,
        "total_eligible": len(buyers)
    }

def check_and_run_due_cadences(db: Session) -> Dict[str, Any]:
    """
    Automated Background Cadence Checker.
    Scans running / active campaigns and auto-dispatches Step 2 (after 3 days)
    and Step 3 (after 7 days) to buyers who haven't replied.
    """
    campaigns = db.query(Campaign).filter(
        Campaign.status.in_(["RUNNING", "COMPLETED", "READY"])
    ).all()

    total_triggered = 0
    results = []

    now = datetime.now(timezone.utc)

    for camp in campaigns:
        steps = camp.sequence_steps or []
        if len(steps) < 2:
            continue

        base_dt = camp.started_at or camp.created_at
        if not base_dt:
            continue
        if base_dt.tzinfo is None:
            base_dt = base_dt.replace(tzinfo=timezone.utc)

        elapsed_days = (now - base_dt).total_seconds() / 86400.0

        # Check Step 2 (delay_days: 3)
        if elapsed_days >= 3.0:
            res_2 = execute_cadence_step(db, camp.id, step_number=2, user_id=camp.user_id, force=False)
            if res_2.get("dispatched", 0) > 0:
                total_triggered += res_2["dispatched"]
                results.append({"campaign_id": camp.id, "step": 2, "dispatched": res_2["dispatched"]})

        # Check Step 3 (delay_days: 7)
        if elapsed_days >= 7.0:
            res_3 = execute_cadence_step(db, camp.id, step_number=3, user_id=camp.user_id, force=False)
            if res_3.get("dispatched", 0) > 0:
                total_triggered += res_3["dispatched"]
                results.append({"campaign_id": camp.id, "step": 3, "dispatched": res_3["dispatched"]})

    return {"status": "checked", "total_triggered": total_triggered, "campaigns_processed": len(campaigns), "results": results}
