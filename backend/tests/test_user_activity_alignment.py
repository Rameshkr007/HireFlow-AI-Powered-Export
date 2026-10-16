import unittest
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from collections import Counter

from app.database import SessionLocal
from app.models.user import User
from app.models.buyer import Buyer
from app.models.email_send_log import EmailSendLog
from app.models.email_log import EmailLog
from app.api.email_activity import get_day_wise_activity, get_google_sheets_rows
from app.api.dashboard import get_stats

INDIA_TZ = ZoneInfo("Asia/Kolkata")

EXPECTED_COUNTS = {
    "2026-09-30": 71,
    "2026-10-01": 53,
    "2026-10-02": 63,
    "2026-10-05": 41,
    "2026-10-06": 28,
    "2026-10-07": 36,
    "2026-10-08": 30,
    "2026-10-09": 13,
    "2026-10-12": 18,
    "2026-10-13": 47,
    "2026-10-14": 25,
    "2026-10-15": 25
}

WEEKEND_DATES = ["2026-10-03", "2026-10-04", "2026-10-10", "2026-10-11"]

class TestUserActivityAlignment(unittest.TestCase):

    def setUp(self):
        self.db = SessionLocal()
        self.user = self.db.query(User).filter(User.email == "rameshkrthakur1816@gmail.com").first()

    def tearDown(self):
        self.db.close()

    def test_total_records_count(self):
        """Verify total records in EmailSendLog and EmailLog equal exactly 450."""
        send_count = self.db.query(EmailSendLog).filter(EmailSendLog.user_id == self.user.id).count()
        email_count = self.db.query(EmailLog).filter(EmailLog.user_id == self.user.id).count()
        self.assertEqual(send_count, 450, f"Expected 450 EmailSendLog records, got {send_count}")
        self.assertEqual(email_count, 450, f"Expected 450 EmailLog records, got {email_count}")

    def test_status_distribution(self):
        """Verify 447 SENT and 3 FAILED records."""
        sent_count = self.db.query(EmailSendLog).filter(EmailSendLog.user_id == self.user.id, EmailSendLog.status == "SENT").count()
        failed_count = self.db.query(EmailSendLog).filter(EmailSendLog.user_id == self.user.id, EmailSendLog.status == "FAILED").count()
        self.assertEqual(sent_count, 447, f"Expected 447 SENT records, got {sent_count}")
        self.assertEqual(failed_count, 3, f"Expected 3 FAILED records, got {failed_count}")

    def test_exact_date_breakdown(self):
        """Verify day-wise counts match the user's table exactly in Asia/Kolkata timezone."""
        logs = self.db.query(EmailSendLog).filter(EmailSendLog.user_id == self.user.id).all()
        date_counts = Counter()
        for l in logs:
            dt = l.sent_at or l.created_at
            if dt.tzinfo is None:
                dt_ist = dt.replace(tzinfo=timezone.utc).astimezone(INDIA_TZ)
            else:
                dt_ist = dt.astimezone(INDIA_TZ)
            date_counts[dt_ist.strftime("%Y-%m-%d")] += 1

        for expected_date, expected_count in EXPECTED_COUNTS.items():
            actual = date_counts.get(expected_date, 0)
            self.assertEqual(actual, expected_count, f"Mismatch on {expected_date}: expected {expected_count}, got {actual}")

    def test_weekend_strictly_off(self):
        """Verify Saturday & Sunday have strictly 0 emails."""
        logs = self.db.query(EmailSendLog).filter(EmailSendLog.user_id == self.user.id).all()
        for l in logs:
            dt = l.sent_at or l.created_at
            if dt.tzinfo is None:
                dt_ist = dt.replace(tzinfo=timezone.utc).astimezone(INDIA_TZ)
            else:
                dt_ist = dt.astimezone(INDIA_TZ)
            d_str = dt_ist.strftime("%Y-%m-%d")
            weekday = dt_ist.weekday()  # 5=Sat, 6=Sun
            self.assertNotIn(d_str, WEEKEND_DATES, f"Found email on weekend date: {d_str}")
            self.assertNotIn(weekday, (5, 6), f"Found email on Saturday/Sunday ({d_str})")

    def test_oct14_and_oct15_different_buyers(self):
        """Verify October 14 and October 15 have 25 unique emails each with zero overlap."""
        logs = self.db.query(EmailSendLog).filter(EmailSendLog.user_id == self.user.id).all()
        oct14_emails = set()
        oct15_emails = set()
        for l in logs:
            dt = l.sent_at or l.created_at
            if dt.tzinfo is None:
                dt_ist = dt.replace(tzinfo=timezone.utc).astimezone(INDIA_TZ)
            else:
                dt_ist = dt.astimezone(INDIA_TZ)
            d_str = dt_ist.strftime("%Y-%m-%d")
            if d_str == "2026-10-14":
                oct14_emails.add(l.recipient_email.lower())
            elif d_str == "2026-10-15":
                oct15_emails.add(l.recipient_email.lower())

        self.assertEqual(len(oct14_emails), 25, f"Expected 25 emails on Oct 14, got {len(oct14_emails)}")
        self.assertEqual(len(oct15_emails), 25, f"Expected 25 emails on Oct 15, got {len(oct15_emails)}")
        overlap = oct14_emails.intersection(oct15_emails)
        self.assertEqual(len(overlap), 0, f"Expected 0 overlap between Oct 14 and 15, found {overlap}")

    def test_day_wise_api_endpoint(self):
        """Verify the /api/email-activity/day-wise API returns all 12 working days and 447 sent emails."""
        res = get_day_wise_activity(current_user=self.user, db=self.db)
        self.assertEqual(res["summary"]["total_emails_sent"], 447)
        self.assertEqual(res["summary"]["total_days_active"], 12)
        self.assertEqual(len(res["days"]), 12)

    def test_dashboard_stats_endpoint(self):
        """Verify the /api/dashboard/stats API returns 447 sent and 3 failed."""
        stats = get_stats(current_user=self.user, db=self.db)
        self.assertEqual(stats["emails_sent"], 447)
        self.assertEqual(stats["emails_failed"], 3)

if __name__ == "__main__":
    unittest.main()
