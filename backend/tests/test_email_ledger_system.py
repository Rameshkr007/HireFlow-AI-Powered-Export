import os
import sys
import unittest
from datetime import datetime, date, timezone
from zoneinfo import ZoneInfo

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.buyer import Buyer
from app.models.campaign import Campaign
from app.models.email_send_log import EmailSendLog
from app.models.email_log import EmailLog
from app.services.email_ledger_service import (
    record_and_dispatch_email,
    get_daily_email_ledger_report,
    reconcile_sent_ledger,
    generate_operation_id
)
from app.api.dashboard import get_stats
from app.api.email_activity import get_day_wise_activity

class TestEmailLedgerSystem(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()
        # Find or create Ramesh test user
        self.user = self.db.query(User).filter(User.email == "rameshkrthakur1816@gmail.com").first()
        if not self.user:
            self.user = self.db.query(User).first()
        self.assertIsNotNone(self.user, "User must exist in database")

        # Find or create a test buyer
        test_email = "test.lead.import.audit@globalbuyer.com"
        self.test_buyer = self.db.query(Buyer).filter(
            Buyer.user_id == self.user.id,
            Buyer.email == test_email
        ).first()
        if not self.test_buyer:
            self.test_buyer = Buyer(
                user_id=self.user.id,
                buyer_name="Jonathan Archer",
                company_name="Enterprise Global Sound Imports LLC",
                email=test_email,
                normalized_email=test_email.lower(),
                city="San Francisco",
                state="CA",
                country="USA",
                product="Handmade Himalayan Singing Bowls",
                business_type="Importer",
                email_status="VALID",
                outreach_status="PENDING",
                is_demo=True
            )
            self.db.add(self.test_buyer)
            self.db.commit()
            self.db.refresh(self.test_buyer)

    def tearDown(self):
        # Clean up only the specific test email record created in this test
        test_email = "test.lead.import.audit@globalbuyer.com"
        self.db.query(EmailSendLog).filter(
            EmailSendLog.user_id == self.user.id,
            EmailSendLog.recipient_email == test_email
        ).delete()
        self.db.query(EmailLog).filter(
            EmailLog.user_id == self.user.id,
            EmailLog.email_address == test_email
        ).delete()
        self.db.commit()
        self.db.close()

    def test_01_record_and_dispatch_creates_ledger_row(self):
        """Verify record_and_dispatch_email creates an EmailSendLog row with SENT status and exact message ID."""
        op_id = generate_operation_id()
        subject = "Authentic Handmade Himalayan Singing Bowls – Direct Manufacturer | Wholesale & OEM"
        body = "Dear Jonathan Archer,\n\nWe would like to introduce our Himalayan singing bowls collection."

        send_log, success, err = record_and_dispatch_email(
            db=self.db,
            user_id=self.user.id,
            recipient_email=self.test_buyer.email,
            subject=subject,
            body_text=body,
            buyer_id=self.test_buyer.id,
            operation_id=op_id,
            is_demo=True
        )

        self.assertTrue(success, f"Dispatch failed: {err}")
        self.assertIsNone(err)
        self.assertEqual(send_log.status, "SENT")
        self.assertEqual(send_log.operation_id, op_id)
        self.assertEqual(send_log.recipient_email, self.test_buyer.email)
        self.assertEqual(send_log.company_name, "Enterprise Global Sound Imports LLC")
        self.assertEqual(send_log.recipient_name, "Jonathan Archer")
        self.assertIsNotNone(send_log.gmail_message_id)
        self.assertIn("hireflow.internal", send_log.gmail_message_id)

        # Verify buyer status was updated to CONTACTED
        refreshed_buyer = self.db.query(Buyer).filter(Buyer.id == self.test_buyer.id).first()
        self.assertEqual(refreshed_buyer.outreach_status, "CONTACTED")
        self.assertIsNotNone(refreshed_buyer.last_contacted)

    def test_02_idempotency_prevents_duplicate_dispatches(self):
        """Verify duplicate calls with the same operation ID return existing record without duplicate send."""
        op_id = f"op_idempotency_test_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        subject = "Idempotency Test Subject"
        body = "Test body"

        log1, success1, _ = record_and_dispatch_email(
            db=self.db,
            user_id=self.user.id,
            recipient_email=self.test_buyer.email,
            subject=subject,
            body_text=body,
            buyer_id=self.test_buyer.id,
            operation_id=op_id,
            is_demo=True
        )
        self.assertTrue(success1)

        # Second dispatch with SAME op_id
        log2, success2, _ = record_and_dispatch_email(
            db=self.db,
            user_id=self.user.id,
            recipient_email=self.test_buyer.email,
            subject=subject,
            body_text=body,
            buyer_id=self.test_buyer.id,
            operation_id=op_id,
            is_demo=True
        )
        self.assertTrue(success2)
        self.assertEqual(log1.id, log2.id, "Second call must return the exact same database record")

        # Verify only ONE ledger record was created for this op_id
        count = self.db.query(EmailSendLog).filter(EmailSendLog.operation_id == op_id).count()
        self.assertEqual(count, 1, f"Expected 1 record, found {count}")

    def test_03_no_guesswork_buyer_mapping(self):
        """Verify recipient_email and buyer_id match with 100% precision with no array-index guessing."""
        op_id = generate_operation_id()
        # Pass no buyer_id, let system resolve by recipient email
        send_log, success, _ = record_and_dispatch_email(
            db=self.db,
            user_id=self.user.id,
            recipient_email=self.test_buyer.email,
            subject="Exact Matching Test",
            body_text="Testing buyer resolution",
            buyer_id=None,
            operation_id=op_id,
            is_demo=True
        )
        self.assertEqual(send_log.buyer_id, self.test_buyer.id)
        self.assertEqual(send_log.company_name, "Enterprise Global Sound Imports LLC")

    def test_04_timezone_aware_daily_report(self):
        """Verify get_daily_email_ledger_report returns accurate numbers in Asia/Kolkata timezone."""
        report = get_daily_email_ledger_report(self.db, self.user.id, timezone_str="Asia/Kolkata")
        self.assertEqual(report["timezone"], "Asia/Kolkata")
        self.assertIn("today", report)
        self.assertIn("all_time", report)
        self.assertIn("days", report)
        self.assertGreaterEqual(report["all_time"]["total_sent"], 445)
        self.assertGreaterEqual(len(report["days"]), 10)

    def test_05_reconciliation_verifies_data_integrity(self):
        """Verify reconcile_sent_ledger checks ledger consistency."""
        recon = reconcile_sent_ledger(self.db, self.user.id)
        self.assertIn("total_ledger_records", recon)
        self.assertIn("verified_consistent_records", recon)
        self.assertGreaterEqual(recon["total_ledger_records"], 448)

    def test_06_refresh_and_logout_persistence(self):
        """Verify that calling day-wise endpoint repeatedly NEVER deletes newly added records."""
        # 1. Add a test email
        op_id = generate_operation_id()
        send_log, success, _ = record_and_dispatch_email(
            db=self.db,
            user_id=self.user.id,
            recipient_email=self.test_buyer.email,
            subject="Persistence Check Test",
            body_text="This email must NEVER disappear on refresh",
            buyer_id=self.test_buyer.id,
            operation_id=op_id,
            is_demo=True
        )
        before_count = self.db.query(EmailSendLog).filter(EmailSendLog.user_id == self.user.id).count()

        # 2. Simulate 5 page refreshes (calling get_day_wise_activity and get_stats)
        for _ in range(5):
            get_day_wise_activity(current_user=self.user, db=self.db)
            get_stats(current_user=self.user, db=self.db)

        after_count = self.db.query(EmailSendLog).filter(EmailSendLog.user_id == self.user.id).count()
        self.assertEqual(before_count, after_count, "Refreshing pages must NEVER delete or alter email logs!")

        # 3. Verify our new record is still in the database
        found = self.db.query(EmailSendLog).filter(EmailSendLog.operation_id == op_id).first()
        self.assertIsNotNone(found, "Newly dispatched email was lost on refresh!")
        self.assertEqual(found.status, "SENT")

if __name__ == "__main__":
    unittest.main()
