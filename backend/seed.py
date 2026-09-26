import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, SessionLocal, Base
from app.models import User, ExporterProfile, Buyer, Campaign, EmailLog
from app.utils.security import hash_password
from app.utils.duplicate_utils import normalize_email
from datetime import datetime, timedelta
import random

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    existing = db.query(User).filter(User.email == "admin@hireflow.com").first()
    if existing:
        print("Database already seeded. Skipping.")
        db.close()
        return

    user = User(email="admin@hireflow.com", hashed_password=hash_password("admin123"), is_active=True)
    db.add(user)
    db.flush()

    profile = ExporterProfile(
        user_id=user.id,
        exporter_name="Raj Kumar",
        company_name="Himalayan Exports Pvt Ltd",
        company_email="exports@himalayanexports.com",
        phone="+977-1-4567890",
        website="https://www.himalayanexports.com",
        country="Nepal",
        address="Thamel, Kathmandu 44600, Nepal",
        product_categories=["Singing Bowls", "Handicrafts", "Home Decor", "Textiles"],
        company_description="Leading exporter of authentic Himalayan handicrafts and wellness products since 2005.",
        sender_name="Raj Kumar"
    )
    db.add(profile)
    db.flush()

    buyers_data = [
        {"buyer_name": "Michael Johnson", "company_name": "Global Wellness Imports LLC", "email": "info@globalwellnessimports.com", "website": "https://globalwellnessimports.com", "country": "USA", "business_type": "Importer", "ai_priority": "HIGH", "ai_score": 92, "email_status": "VALID", "product": "Singing Bowls", "company_description": "Leading importer and distributor of wellness and lifestyle products across North America."},
        {"buyer_name": "Sarah Chen", "company_name": "Pacific Trade Distribution Co", "email": "sarah@pacifictrade.com", "website": "https://pacifictrade.com", "country": "USA", "business_type": "Distributor", "ai_priority": "HIGH", "ai_score": 88, "email_status": "VALID", "product": "Singing Bowls", "company_description": "West coast distributor specializing in Asian import products."},
        {"buyer_name": "James Wilson", "company_name": "Harmony Retail Group", "email": "j.wilson@harmonyretail.co.uk", "website": "https://harmonyretail.co.uk", "country": "UK", "business_type": "Retailer", "ai_priority": "MEDIUM", "ai_score": 62, "email_status": "VALID", "product": "Handicrafts", "company_description": "UK-based retail group with 30+ stores specializing in lifestyle and home products."},
        {"buyer_name": "Hans Mueller", "company_name": "Eastern Lifestyle Wholesale GmbH", "email": "h.mueller@easternlifestyle.de", "website": "https://easternlifestyle.de", "country": "Germany", "business_type": "Wholesaler", "ai_priority": "HIGH", "ai_score": 90, "email_status": "VALID", "product": "Home Decor", "company_description": "Major German wholesaler of home decor and lifestyle products for European retailers."},
        {"buyer_name": "Emma Thompson", "company_name": "Zen Home & Wellness", "email": "emma@zenhomewellness.com.au", "website": "https://zenhomewellness.com.au", "country": "Australia", "business_type": "Importer", "ai_priority": "HIGH", "ai_score": 87, "email_status": "VALID", "product": "Singing Bowls", "company_description": "Australia's premier importer of meditation and wellness accessories."},
        {"buyer_name": "Lars Andersen", "company_name": "Nordic Living Imports BV", "email": "lars@nordicliving.nl", "website": "https://nordicliving.nl", "country": "Netherlands", "business_type": "Importer", "ai_priority": "MEDIUM", "ai_score": 68, "email_status": "VALID", "product": "Textiles", "company_description": "Scandinavian design-focused import company supplying Benelux retailers."},
        {"buyer_name": "Klaus Hoffman", "company_name": "Alpine Home Decor GmbH", "email": "k.hoffman@alpinedecor.de", "website": "https://alpinedecor.de", "country": "Germany", "business_type": "Importer", "ai_priority": "HIGH", "ai_score": 91, "email_status": "VALID", "product": "Home Decor", "company_description": "Premium home decor importer serving German and Austrian luxury retail chains."},
        {"buyer_name": "John MacDonald", "company_name": "Sunrise Wellness Traders", "email": "john@sunrisewellness.ca", "website": "https://sunrisewellness.ca", "country": "Canada", "business_type": "Distributor", "ai_priority": "MEDIUM", "ai_score": 65, "email_status": "VALID", "product": "Singing Bowls", "company_description": "Canadian health and wellness product distributor serving eastern Canada."},
        {"buyer_name": "Kenji Tanaka", "company_name": "Tokyo Lifestyle Imports KK", "email": "k.tanaka@tokyolifestyle.jp", "website": "https://tokyolifestyle.jp", "country": "Japan", "business_type": "Importer", "ai_priority": "LOW", "ai_score": 40, "email_status": "VALID", "product": "Handicrafts", "company_description": "Japanese importer of handcrafted Asian cultural products."},
        {"buyer_name": "Ahmed Al-Rashid", "company_name": "Desert Wellness Trading LLC", "email": "ahmed@desertwellness.ae", "website": "https://desertwellness.ae", "country": "UAE", "business_type": "Distributor", "ai_priority": "MEDIUM", "ai_score": 70, "email_status": "VALID", "product": "Singing Bowls", "company_description": "UAE-based distributor supplying wellness products to Gulf region retailers."},
        {"buyer_name": "Lisa Garcia", "company_name": "Luminary Home Goods Inc", "email": "lisa@luminaryhome.com", "website": "https://luminaryhome.com", "country": "USA", "business_type": "Retailer", "ai_priority": "LOW", "ai_score": 38, "email_status": "VALID", "product": "Home Decor", "company_description": "US e-commerce retailer focused on artisan home goods."},
        {"buyer_name": "Robert Kim", "company_name": "Cascade Pacific Trading", "email": "rkim@cascadepacific.com", "website": "https://cascadepacific.com", "country": "USA", "business_type": "Wholesaler", "ai_priority": "HIGH", "ai_score": 85, "email_status": "VALID", "product": "Singing Bowls", "company_description": "Pacific Northwest wholesale distributor of wellness and spiritual products."},
        {"buyer_name": "Pierre Dubois", "company_name": "Euro Wellness Distribution SARL", "email": "p.dubois@eurowellness.fr", "website": "https://eurowellness.fr", "country": "France", "business_type": "Distributor", "ai_priority": "MEDIUM", "ai_score": 72, "email_status": "VALID", "product": "Singing Bowls", "company_description": "French distributor of wellness and holistic health products."},
        {"buyer_name": "David Clarke", "company_name": "Maple Leaf Imports Inc", "email": "d.clarke@mapleleafimports.ca", "website": "https://mapleleafimports.ca", "country": "Canada", "business_type": "Importer", "ai_priority": "HIGH", "ai_score": 89, "email_status": "VALID", "product": "Handicrafts", "company_description": "Leading Canadian importer of artisan products from South and Southeast Asia."},
        {"buyer_name": "Sophie Martin", "company_name": "Oceania Trade Partners Pty", "email": "sophie@oceaniatrade.com.au", "website": "https://oceaniatrade.com.au", "country": "Australia", "business_type": "Wholesaler", "ai_priority": "MEDIUM", "ai_score": 66, "email_status": "VALID", "product": "Textiles", "company_description": "Australian wholesale trader supplying independent retail networks."},
        {"buyer_name": "Thomas White", "company_name": "White Mountain Imports LLC", "email": "thomas@whitemountainimports.com", "website": "https://whitemountainimports.com", "country": "USA", "business_type": "Importer", "ai_priority": "HIGH", "ai_score": 93, "email_status": "VALID", "product": "Singing Bowls", "company_description": "Specialist importer of Himalayan singing bowls and meditation accessories since 2010."},
        {"buyer_name": "Oliver Brown", "company_name": "Bristol Trading Company Ltd", "email": "o.brown@bristoltrading.co.uk", "website": "https://bristoltrading.co.uk", "country": "UK", "business_type": "Distributor", "ai_priority": "LOW", "ai_score": 42, "email_status": "UNKNOWN", "product": "Home Decor", "company_description": "UK trading company dealing in general home goods and accessories."},
        {"buyer_name": "Marco Rossi", "company_name": "Milan Home Collections Srl", "email": "m.rossi@milanhome.it", "website": "https://milanhome.it", "country": "Italy", "business_type": "Retailer", "ai_priority": "MEDIUM", "ai_score": 58, "email_status": "VALID", "product": "Home Decor", "company_description": "Italian premium home collections retailer with boutiques in Milan and Rome."},
        {"buyer_name": "Erik van der Berg", "company_name": "Dutch Trade House BV", "email": "e.vandenberg@dutchtradehouse.nl", "website": "https://dutchtradehouse.nl", "country": "Netherlands", "business_type": "Importer", "ai_priority": "HIGH", "ai_score": 86, "email_status": "VALID", "product": "Singing Bowls", "company_description": "Dutch trade house specializing in Asian imports for European wholesale market."},
        {"buyer_name": "Jennifer Lee", "company_name": "Bay Area Wellness Hub", "email": "jen@bayareawellness.com", "website": "https://bayareawellness.com", "country": "USA", "business_type": "Retailer", "ai_priority": "MEDIUM", "ai_score": 60, "email_status": "VALID", "product": "Singing Bowls", "company_description": "San Francisco Bay Area wellness center and retail store."},
        {"buyer_name": "Kevin Walsh", "company_name": "Rocky Mountain Wholesale Co", "email": "kevin@rockymtnwholesale.com", "website": "https://rockymtnwholesale.com", "country": "USA", "business_type": "Wholesaler", "ai_priority": "LOW", "ai_score": 35, "email_status": "INVALID", "product": "Handicrafts", "company_description": "Colorado-based general wholesaler."},
        {"buyer_name": "Charlotte Adams", "company_name": "Thames Valley Trading Ltd", "email": "c.adams@thamesvalleytrading.co.uk", "website": "https://thamesvalleytrading.co.uk", "country": "UK", "business_type": "Importer", "ai_priority": "MEDIUM", "ai_score": 63, "email_status": "VALID", "product": "Textiles", "company_description": "Thames Valley-based importer of handcrafted textile products."},
        {"buyer_name": "Andrew Cooper", "company_name": "Sydney Wellness Imports", "email": "a.cooper@sydneywellness.com.au", "website": "https://sydneywellness.com.au", "country": "Australia", "business_type": "Importer", "ai_priority": "HIGH", "ai_score": 88, "email_status": "VALID", "product": "Singing Bowls", "company_description": "Sydney-based importer specializing in meditation and mindfulness products."},
        {"buyer_name": "Michelle Tremblay", "company_name": "Vancouver Trade Co Ltd", "email": "m.tremblay@vantradeseco.ca", "website": "https://vantradeseco.ca", "country": "Canada", "business_type": "Distributor", "ai_priority": "MEDIUM", "ai_score": 67, "email_status": "VALID", "product": "Home Decor", "company_description": "Vancouver-based distributor of Asian home decor products across western Canada."},
        {"buyer_name": "Wolfgang Bauer", "company_name": "Hamburg Import GmbH", "email": "w.bauer@hamburgimport.de", "website": "https://hamburgimport.de", "country": "Germany", "business_type": "Wholesaler", "ai_priority": "HIGH", "ai_score": 91, "email_status": "VALID", "product": "Handicrafts", "company_description": "Major Hamburg-based importer and wholesaler of handcrafted products from Asia."},
    ]

    buyer_objects = []
    for bd in buyers_data:
        buyer = Buyer(
            user_id=user.id,
            buyer_name=bd["buyer_name"],
            company_name=bd["company_name"],
            email=bd["email"],
            normalized_email=normalize_email(bd["email"]),
            website=bd["website"],
            country=bd["country"],
            source_platform="Demo Data",
            business_type=bd["business_type"],
            product=bd["product"],
            company_description=bd["company_description"],
            email_status=bd["email_status"],
            outreach_status="PENDING",
            ai_priority=bd["ai_priority"],
            ai_score=bd["ai_score"],
            ai_confidence=round(bd["ai_score"] / 100.0, 2),
            ai_reason=f"Classified as {bd['business_type']} with {bd['ai_priority']} priority based on company profile and product alignment.",
            ai_business_type=bd["business_type"],
            is_demo=True
        )
        db.add(buyer)
        buyer_objects.append(buyer)

    db.flush()

    campaign = Campaign(
        user_id=user.id,
        name="USA Singing Bowls Outreach 2026",
        product="Singing Bowls",
        target_country="USA",
        target_audience="Importer",
        email_subject="Export Partnership Opportunity – Singing Bowls",
        email_body="""Dear <Buyer Name>,

I hope this email finds you well.

We came across your company while researching businesses involved in the import, distribution, or sale of Singing Bowls.

We are Himalayan Exports Pvt Ltd, a leading exporter of authentic handcrafted Himalayan Singing Bowls sourced directly from skilled artisans in Nepal.

Buyer Details:
Contact Name: <Buyer Name>
Company Name: <Company Name>
Country: <Country>
Website: <Website>

Product Details:
Product Name: Singing Bowls (7-Metal, Crystal, Tibetan)
MOQ: 50 pieces
Customization: Size, finish, packaging available
Shipping: Worldwide via DHL/FedEx

Please find our company catalogue attached for your review.

We would be pleased to discuss pricing, samples, and long-term supply opportunities.

Best Regards,
Raj Kumar
Himalayan Exports Pvt Ltd
exports@himalayanexports.com
+977-1-4567890""",
        sending_limit=20,
        delay_seconds=5,
        status="COMPLETED",
        sent_count=14,
        failed_count=2,
        skipped_count=4,
        total_leads=20,
        is_demo=True,
        started_at=datetime.utcnow() - timedelta(days=1),
        completed_at=datetime.utcnow() - timedelta(hours=22)
    )
    db.add(campaign)
    db.flush()

    statuses_pool = ['SENT'] * 14 + ['FAILED'] * 2 + ['SKIPPED'] * 2 + ['ALREADY_CONTACTED'] * 1 + ['INVALID_EMAIL'] * 1
    demo_errors = ["Temporary delivery failure", "Connection timeout"]

    for i, buyer in enumerate(buyer_objects[:20]):
        status = statuses_pool[i % len(statuses_pool)]
        error = None
        if status == "FAILED":
            error = demo_errors[i % 2]
        elif status == "SKIPPED":
            error = "Skipped by campaign rules"
        elif status == "ALREADY_CONTACTED":
            error = "Previously contacted in another campaign"
        elif status == "INVALID_EMAIL":
            error = "Invalid email format detected"

        log = EmailLog(
            campaign_id=campaign.id,
            buyer_id=buyer.id,
            user_id=user.id,
            email_address=buyer.email,
            subject=campaign.email_subject,
            status=status,
            error_message=error,
            sent_at=datetime.utcnow() - timedelta(hours=22, minutes=i * 3) if status == 'SENT' else None
        )
        db.add(log)

        if status == 'SENT':
            buyer.outreach_status = 'CONTACTED'
            buyer.last_contacted = datetime.utcnow() - timedelta(hours=22, minutes=i * 3)

    db.commit()
    print("[SUCCESS] Database seeded successfully!")
    print("[ADMIN] Admin user: admin@hireflow.com / admin123")
    print(f"[DATA] Created {len(buyers_data)} demo buyers")
    print("[CAMPAIGN] Created 1 sample campaign with 20 email logs")
    db.close()

if __name__ == "__main__":
    seed()
