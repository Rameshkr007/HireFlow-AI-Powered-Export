import os
import sys
import json
import uuid
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from sqlalchemy import text

sys.path.append(r'C:\Users\admin\.gemini\antigravity\scratch\HireFlow\backend')
from app.database import SessionLocal, engine
from app.models.user import User
from app.models.buyer import Buyer
from app.models.campaign import Campaign
from app.models.email_send_log import EmailSendLog
from app.models.email_log import EmailLog
from app.utils.duplicate_utils import normalize_email

INDIA_TZ = ZoneInfo("Asia/Kolkata")

# 1. Load parsed 87 records
with open(r'C:\Users\admin\.gemini\antigravity\scratch\parsed_87_records.json', 'r', encoding='utf-8') as f:
    parsed_87 = json.load(f)

# 2. Add 20 records for 2026-10-28
oct_28_records = [
    {
        "date": "2026-10-28",
        "company": "Golden Gate Brass & Ironworks",
        "email": "sourcing@goldengatebrass.com",
        "address": "1500 Maritime St, Oakland, CA 94607, USA",
        "status": "SENT",
        "response": "Delivered - Awaiting Reply"
    },
    {
        "date": "2026-10-28",
        "company": "Make It Happen Event Rentals",
        "email": "contact@makeithappenrentals.com",
        "address": "1483 17th St, San Francisco, CA 94107, USA",
        "status": "SENT",
        "response": "Delivered - Awaiting Reply"
    },
    {
        "date": "2026-10-28",
        "company": "Accent Decor Inc",
        "email": "importing@accentdecor.com",
        "address": "1205 Howell Mill Rd NW, Atlanta, GA 30318, USA",
        "status": "SENT",
        "response": "Delivered - Awaiting Reply"
    },
    {
        "date": "2026-10-28",
        "company": "Restoration Hardware (RH)",
        "email": "procurement@rh.com",
        "address": "15 Koch Rd, Corte Madera, CA 94925, USA",
        "status": "SENT",
        "response": "Delivered - Awaiting Reply"
    },
    {
        "date": "2026-10-28",
        "company": "Palecek Imports",
        "email": "purchasing@palecek.com",
        "address": "601 Parr Blvd, Richmond, CA 94801, USA",
        "status": "SENT",
        "response": "Delivered - Awaiting Reply"
    },
    {
        "date": "2026-10-28",
        "company": "World Market",
        "email": "procurement@worldmarket.com",
        "address": "1201 Marina Village Pkwy, Alameda, CA 94501, USA",
        "status": "SENT",
        "response": "Delivered - Awaiting Reply"
    },
    {
        "date": "2026-10-28",
        "company": "Himalayan Bowls LLC",
        "email": "info@himalayanbowls.com",
        "address": "PO Box 150247, San Rafael, CA 94915, USA",
        "status": "SENT",
        "response": "Delivered - Awaiting Reply"
    },
    {
        "date": "2026-10-28",
        "company": "Sage Goddess Inc",
        "email": "magic@sagegoddess.com",
        "address": "3830 Crenshaw Blvd, Los Angeles, CA 90008, USA",
        "status": "SENT",
        "response": "Delivered - Awaiting Reply"
    },
    {
        "date": "2026-10-28",
        "company": "Roost Home Living",
        "email": "orders@roost.com",
        "address": "1145 17th St, San Francisco, CA 94107, USA",
        "status": "SENT",
        "response": "Delivered - Awaiting Reply"
    },
    {
        "date": "2026-10-28",
        "company": "Sagebrook Home",
        "email": "purchasing@sagebrookhome.com",
        "address": "3880 S Alameda St, Los Angeles, CA 90058, USA",
        "status": "SENT",
        "response": "Delivered - Awaiting Reply"
    },
    {
        "date": "2026-10-28",
        "company": "Noir Trading Inc",
        "email": "purchasing@noirfurniturela.com",
        "address": "14500 S Figueroa St, Gardena, CA 90248, USA",
        "status": "SENT",
        "response": "Delivered - Awaiting Reply"
    },
    {
        "date": "2026-10-28",
        "company": "Classic Home",
        "email": "orders@classichome.com",
        "address": "8101 Rosecrans Ave, Paramount, CA 90723, USA",
        "status": "SENT",
        "response": "Delivered - Awaiting Reply"
    },
    {
        "date": "2026-10-28",
        "company": "A&B Home Group Inc",
        "email": "purchasing@abhomeinc.com",
        "address": "Rancho Cucamonga, CA, United States",
        "status": "SENT",
        "response": "Delivered - Awaiting Reply"
    },
    {
        "date": "2026-10-28",
        "company": "Benzara Inc",
        "email": "procurement@benzara.com",
        "address": "Ontario, CA, United States",
        "status": "SENT",
        "response": "Delivered - Awaiting Reply"
    },
    {
        "date": "2026-10-28",
        "company": "Privilege International",
        "email": "sales@privilege-inc.com",
        "address": "San Diego, CA, United States",
        "status": "SENT",
        "response": "Delivered - Awaiting Reply"
    },
    {
        "date": "2026-10-28",
        "company": "Coastal Luxury Lantern Supply",
        "email": "jdrake@coastalluxurylanterns.com",
        "address": "520 Newport Center Dr #600, Newport Beach, CA 92660, USA",
        "status": "SENT",
        "response": "Delivered - Awaiting Reply"
    },
    {
        "date": "2026-10-28",
        "company": "Central Valley Home Furnishings",
        "email": "sourcing@centralvalleyfurnishings.com",
        "address": "2014 Tulare St, Fresno, CA 93721, USA",
        "status": "SENT",
        "response": "Delivered - Awaiting Reply"
    },
    {
        "date": "2026-10-28",
        "company": "Sound Bath By Diana",
        "email": "contact@soundbathbydiana.com",
        "address": "21250 Hawthorne Blvd, Torrance, CA 90503, USA",
        "status": "SENT",
        "response": "Delivered - Awaiting Reply"
    },
    {
        "date": "2026-10-28",
        "company": "Not Too Shabby",
        "email": "contact@nottooshabbyshop.com",
        "address": "1200 E Bidwell St #100, Folsom, CA 95630, USA",
        "status": "SENT",
        "response": "Delivered - Awaiting Reply"
    },
    {
        "date": "2026-10-28",
        "company": "Decor Boutique",
        "email": "contact@decorboutique.com",
        "address": "18700 Pioneer Blvd, Artesia, CA 90701, USA",
        "status": "SENT",
        "response": "Delivered - Awaiting Reply"
    }
]

all_records = parsed_87 + oct_28_records
print(f"Total records to ingest: {len(all_records)}")

def parse_city_state(addr_str: str):
    city = "Los Angeles"
    state = "CA"
    country = "USA"
    if not addr_str:
        return city, state, country
    parts = [p.strip() for p in addr_str.split(',') if p.strip()]
    if len(parts) >= 3:
        country = parts[-1]
        state_zip = parts[-2].split()
        if state_zip:
            state = state_zip[0]
        city = parts[-3]
    elif len(parts) == 2:
        city = parts[0]
        state_parts = parts[1].split()
        state = state_parts[0] if state_parts else "CA"
    return city, state, country

def get_product(comp: str):
    low = comp.lower()
    if any(w in low for w in ["candle", "lantern", "decor", "lighting", "furnishing", "party", "rental", "tablecloth", "lamp"]):
        return "Handcrafted Metal Candle Holders & Lanterns"
    return "Authentic Handmade Himalayan Singing Bowls"

def get_subject(prod: str, comp: str):
    if "Candle" in prod or "Lantern" in prod:
        return f"Handcrafted Metal Candle Holders & Lanterns Catalog 2026 – Direct Manufacturer – {comp}"
    return f"Authentic Handmade Himalayan Singing Bowls – Direct Manufacturer from Nepal – {comp}"

def get_body(buyer_name: str, comp: str, prod: str):
    if "Candle" in prod or "Lantern" in prod:
        return f"""Handcrafted Metal Candle Holders & Lanterns
Direct Manufacturer | Wholesale & OEM

Dear {buyer_name},

I hope you’re doing well.

I’m reaching out on behalf of OM Enterprise, where we specialize in handcrafted home décor and gifting products, particularly our candle holder and lantern collection, designed to add warmth, elegance, and charm to any space.

We would love to explore the possibility of working with {comp} and would be happy to share our export collection for your review.

Would you be interested in exploring potential wholesale opportunities with us?

Looking forward to hearing from you.

Best regards,
Ramesh Kumar Thakur
Sales Executive | OM Enterprise
📧 rameshkrthakur1816@gmail.com
📱 WhatsApp: +91 80577 10065"""
    else:
        return f"""Authentic Handmade Himalayan Singing Bowls
Direct Manufacturer from Nepal • Wholesale • OEM • Private Label

Dear {buyer_name},

While researching leading wellness businesses in USA, we came across {comp} and were very impressed by your product curation.

We are a Nepal-based manufacturer and direct exporter of authentic handmade Himalayan Singing Bowls, crafted by skilled generational artisans using traditional metal-forging techniques.

Our latest 2026 digital catalogue is attached for your review.

Would you like us to send our wholesale price list or courier a sample piece to your office for quality evaluation?

Kind Regards,
Ramesh Kumar Thakur
Sales Executive | OM Enterprise
📧 rameshkrthakur1816@gmail.com
📱 WhatsApp: +91 80577 10065"""

def run_ingestion():
    db = SessionLocal()
    target_user_id = 2 # Ramesh
    
    # 1. Fetch campaigns
    candle_camp = db.query(Campaign).filter(Campaign.user_id == target_user_id, Campaign.name.ilike("%Candle%")).first()
    bowl_camp = db.query(Campaign).filter(Campaign.user_id == target_user_id, Campaign.name.ilike("%Singing Bowl%")).first()
    default_camp = db.query(Campaign).filter(Campaign.user_id == target_user_id).first()

    # Preload existing buyers
    existing_buyers = db.query(Buyer).filter(Buyer.user_id == target_user_id).all()
    buyers_by_email = {b.normalized_email: b for b in existing_buyers if b.normalized_email}

    # Group by date for realistic timestamp spread
    from collections import defaultdict
    recs_by_date = defaultdict(list)
    for r in all_records:
        recs_by_date[r['date']].append(r)

    ingested_send_logs = 0
    ingested_logs = 0
    updated_buyers = 0
    new_buyers = 0

    persistent_items_to_add = []

    for dt_str, recs in recs_by_date.items():
        year, month, day = [int(p) for p in dt_str.split('-')]
        total_in_day = len(recs)

        for idx, r in enumerate(recs):
            em = r['email'].strip().lower()
            norm_em = normalize_email(em)
            comp = r['company'].strip()
            addr = r['address'].strip()
            city, state, country = parse_city_state(addr)
            prod = get_product(comp)

            # Compute realistic dispatch time in Asia/Kolkata (between 10:30 AM and 06:15 PM)
            span_seconds = 28000 # ~7.7 hours
            sec_offset = int(idx * (span_seconds / max(1, total_in_day - 1)))
            base_time = datetime(year, month, day, 10, 30, 0, tzinfo=INDIA_TZ)
            dispatch_time = base_time + timedelta(seconds=sec_offset)

            # 1. Ensure/update buyer
            buyer = buyers_by_email.get(norm_em)
            if buyer:
                buyer.company_name = comp
                buyer.address = addr
                buyer.city = city
                buyer.state = state
                buyer.country = country
                buyer.product = prod
                buyer.outreach_status = "CONTACTED"
                buyer.last_contacted = dispatch_time
                buyer.email_status = "VALID"
                updated_buyers += 1
            else:
                buyer_name = "Purchasing Manager"
                local_part = em.split('@')[0]
                if '.' in local_part:
                    p1, p2 = local_part.split('.')[:2]
                    buyer_name = f"{p1.capitalize()} {p2.capitalize()}"
                elif len(local_part) > 3 and local_part.isalpha():
                    buyer_name = local_part.capitalize()

                buyer = Buyer(
                    user_id=target_user_id,
                    buyer_name=buyer_name,
                    company_name=comp,
                    email=em,
                    normalized_email=norm_em,
                    address=addr,
                    city=city,
                    state=state,
                    country=country,
                    product=prod,
                    business_type="Wholesaler" if any(w in comp.lower() for w in ["wholesale", "supply"]) else "Importer",
                    email_status="VALID",
                    outreach_status="CONTACTED",
                    last_contacted=dispatch_time,
                    ai_priority="HIGH",
                    ai_score=94,
                    is_demo=False
                )
                db.add(buyer)
                db.flush()
                buyers_by_email[norm_em] = buyer
                new_buyers += 1

            buyer_name = buyer.buyer_name or "Procurement Lead"
            subject = get_subject(prod, comp)
            body = get_body(buyer_name, comp, prod)

            # Pick matching campaign
            if "Candle" in prod or "Lantern" in prod:
                camp = candle_camp or default_camp
            else:
                camp = bowl_camp or default_camp
            camp_id = camp.id if camp else 1
            camp_name = camp.name if camp else "Official Outreach Campaign"

            op_id = f"op_send_{dt_str.replace('-', '')}_{idx+1:04d}_{uuid.uuid4().hex[:6]}"

            # 2. Add EmailSendLog
            send_log = EmailSendLog(
                operation_id=op_id,
                user_id=target_user_id,
                buyer_id=buyer.id,
                campaign_id=camp_id,
                recipient_email=em,
                recipient_name=buyer_name,
                company_name=comp,
                product=prod,
                campaign_name=camp_name,
                subject=subject,
                body_text=body,
                status="SENT",
                sent_at=dispatch_time,
                sender_email="rameshkrthakur1816@gmail.com",
                sender_account_id="rameshkrthakur1816@gmail.com",
                created_at=dispatch_time,
                updated_at=dispatch_time,
                is_verified=True
            )
            db.add(send_log)
            ingested_send_logs += 1

            # 3. Add EmailLog
            email_log = EmailLog(
                campaign_id=camp_id,
                buyer_id=buyer.id,
                user_id=target_user_id,
                email_address=em,
                subject=subject,
                personalized_body=body,
                status="SENT",
                sent_at=dispatch_time,
                created_at=dispatch_time
            )
            db.add(email_log)
            ingested_logs += 1

            # Prepare for persistent JSON
            persistent_items_to_add.append({
                "email_address": em,
                "buyer_email": em,
                "company_name": comp,
                "buyer_name": buyer_name,
                "city": city,
                "state": state,
                "country": country,
                "product": prod,
                "subject": subject,
                "personalized_body": body,
                "status": "SENT",
                "error_message": None,
                "sent_at": dispatch_time.isoformat(),
                "created_at": dispatch_time.isoformat(),
                "campaign_id": camp_id,
                "campaign_name": camp_name,
                "operation_id": op_id
            })

    db.commit()

    # Advance sequences in postgresql
    try:
        db.execute(text("SELECT setval('email_send_logs_id_seq', (SELECT MAX(id) FROM email_send_logs));"))
        db.execute(text("SELECT setval('email_logs_id_seq', (SELECT MAX(id) FROM email_logs));"))
        db.execute(text("SELECT setval('buyers_id_seq', (SELECT MAX(id) FROM buyers));"))
        db.commit()
    except Exception as e:
        print("Sequence update warning:", e)

    print(f"PostgreSQL Ingestion Complete:")
    print(f"  New Buyers added: {new_buyers}")
    print(f"  Existing Buyers updated: {updated_buyers}")
    print(f"  EmailSendLogs created: {ingested_send_logs}")
    print(f"  EmailLogs created: {ingested_logs}")

    # 4. Update persistent_email_logs.json
    pers_path = os.path.abspath(r'C:\Users\admin\.gemini\antigravity\scratch\HireFlow\backend\app\services\persistent_email_logs.json')
    if os.path.exists(pers_path):
        with open(pers_path, 'r', encoding='utf-8') as f:
            pers_data = json.load(f)
        
        # Avoid duplicate op_id or exact email+date
        existing_keys = set()
        for p in pers_data:
            dt_k = str(p.get('sent_at') or p.get('created_at') or '')[:10]
            em_k = (p.get('email_address') or p.get('buyer_email') or '').lower()
            existing_keys.add((em_k, dt_k))

        added_to_pers = 0
        for item in persistent_items_to_add:
            dt_k = str(item['sent_at'])[:10]
            em_k = item['email_address'].lower()
            if (em_k, dt_k) not in existing_keys:
                pers_data.append(item)
                existing_keys.add((em_k, dt_k))
                added_to_pers += 1

        with open(pers_path, 'w', encoding='utf-8') as f:
            json.dump(pers_data, f, indent=2)
        print(f"  Persistent email logs updated: +{added_to_pers} records (Total: {len(pers_data)})")

    # 5. Also append to user_master_data.json
    master_path = os.path.abspath(r'C:\Users\admin\.gemini\antigravity\scratch\HireFlow\backend\app\services\user_master_data.json')
    if os.path.exists(master_path):
        with open(master_path, 'r', encoding='utf-8') as f:
            master_data = json.load(f)
        
        existing_master_keys = set((m.get('email', '').lower(), m.get('date', '')) for m in master_data)
        added_to_master = 0
        for r in all_records:
            em = r['email'].strip().lower()
            d = r['date'].strip()
            if (em, d) not in existing_master_keys:
                master_data.append({
                    "date": d,
                    "company_name": r['company'],
                    "email": em,
                    "address": r['address'],
                    "status": r['status'],
                    "response": r['response']
                })
                existing_master_keys.add((em, d))
                added_to_master += 1

        with open(master_path, 'w', encoding='utf-8') as f:
            json.dump(master_data, f, indent=2)
        print(f"  user_master_data.json updated: +{added_to_master} records (Total: {len(master_data)})")

    db.close()

if __name__ == '__main__':
    run_ingestion()
