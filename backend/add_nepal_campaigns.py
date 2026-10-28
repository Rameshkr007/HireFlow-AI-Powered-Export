import sqlite3
import os

db_paths = ['hireflow.db', 'backend/hireflow.db']

nepal_sample_body = """Hi {{name}},

While researching leading sound healing & wellness brands in the US, I came across {{company}} and was very impressed by your product curation.

We are a direct manufacturer and exporter based in Nepal, handcrafting authentic Himalayan Singing Bowls (432Hz & 528Hz tuned sets) using traditional 7-metal alloy forging techniques.

Because you are dealing directly with our Nepal workshop, we offer direct factory FOB pricing, custom laser branding, and worldwide door-to-door (DHL/FedEx) logistics.

May I courier a complimentary sample bowl to your office this week for acoustic and quality evaluation?

Warm regards,

Ramesh Kumar Thakur
Sales Executive | OM Enterprise (Nepal)
📧 rameshkrthakur1816@gmail.com
📱 WhatsApp: +91 80577 10065"""

nepal_followup_body = """Hi {{name}},

Following up on my previous note regarding your product curation at {{company}}.

Would you like me to courier a complimentary sample piece of our authentic Nepal 432Hz Himalayan Singing Bowl to your office for quality evaluation?

Best regards,

Ramesh Kumar Thakur
Sales Executive | OM Enterprise (Nepal)
📧 rameshkrthakur1816@gmail.com
📱 WhatsApp: +91 80577 10065"""

for path in db_paths:
    if not os.path.exists(path):
        continue
    try:
        conn = sqlite3.connect(path)
        cur = conn.cursor()
        
        # 1. Update Exporter Profile to Nepal for all users
        cur.execute("""
            UPDATE exporter_profiles 
            SET country = 'Nepal', 
                address = 'Kathmandu, Nepal',
                company_description = 'Direct manufacturer and exporter based in Nepal of authentic handmade Himalayan Singing Bowls, Full Moon Healing Sets, 7-Chakra tuned sets, and handcrafted Tibetan sound healing instruments.'
        """)
        
        # 2. Get user id (usually 1)
        cur.execute("SELECT id FROM users LIMIT 1")
        u_row = cur.fetchone()
        uid = u_row[0] if u_row else 1
        
        # 3. Add / Update Campaign 1: Direct Nepal Manufacturer Sample Outreach
        cur.execute("SELECT id FROM campaigns WHERE name LIKE '%Direct Nepal Manufacturer%'")
        row = cur.fetchone()
        if not row:
            cur.execute("""
                INSERT INTO campaigns (user_id, name, product, target_country, target_audience, email_subject, email_body, sending_limit, delay_seconds, status, sent_count, failed_count, skipped_count, total_leads, is_demo, created_at)
                VALUES (?, 'Direct Nepal Manufacturer – Free Sample Outreach 2026', 'Authentic Handmade Himalayan Singing Bowls (Nepal Factory Direct)', 'USA - California', 'Importer & Wholesaler', 'Direct Nepal sourcing for {{company}} - Singing Bowls', ?, 50, 5, 'READY', 0, 0, 0, 50, 0, datetime('now'))
            """, (uid, nepal_sample_body))
            print(f"Inserted Nepal Sample Campaign for user {uid} in {path}")
        else:
            cur.execute("""
                UPDATE campaigns SET user_id = ?, email_subject = 'Direct Nepal sourcing for {{company}} - Singing Bowls', email_body = ? WHERE id = ?
            """, (uid, nepal_sample_body, row[0]))
            print(f"Updated Nepal Sample Campaign for user {uid} in {path}")
            
        # 4. Add / Update Campaign 2: Direct Nepal Follow-up
        cur.execute("SELECT id FROM campaigns WHERE name LIKE '%Direct Nepal Follow-up%'")
        row = cur.fetchone()
        if not row:
            cur.execute("""
                INSERT INTO campaigns (user_id, name, product, target_country, target_audience, email_subject, email_body, sending_limit, delay_seconds, status, sent_count, failed_count, skipped_count, total_leads, is_demo, created_at)
                VALUES (?, 'Direct Nepal Follow-up – Free Sample Dispatch', 'Authentic Handmade Himalayan Singing Bowls (Nepal Factory Direct)', 'USA - California', 'Importer & Wholesaler', 'Quick follow up regarding complimentary sample for {{company}}', ?, 50, 5, 'READY', 0, 0, 0, 50, 0, datetime('now'))
            """, (uid, nepal_followup_body))
            print(f"Inserted Nepal Follow-up Campaign for user {uid} in {path}")
        else:
            cur.execute("""
                UPDATE campaigns SET user_id = ?, email_subject = 'Quick follow up regarding complimentary sample for {{company}}', email_body = ? WHERE id = ?
            """, (uid, nepal_followup_body, row[0]))
            print(f"Updated Nepal Follow-up Campaign for user {uid} in {path}")
            
        # Ensure all campaigns belong to this user
        cur.execute("UPDATE campaigns SET user_id = ?", (uid,))
        
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error updating {path}: {e}")
