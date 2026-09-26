from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float, Boolean, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class Buyer(Base):
    __tablename__ = "buyers"
    __table_args__ = (
        UniqueConstraint("user_id", "normalized_email", name="uq_user_buyer_email"),
        Index("idx_buyer_user_country", "user_id", "country"),
        Index("idx_buyer_user_priority", "user_id", "ai_priority"),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    buyer_name = Column(String, nullable=True)
    company_name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    normalized_email = Column(String, nullable=True)
    website = Column(String, nullable=True)
    country = Column(String, nullable=True)
    source_platform = Column(String, nullable=True)
    business_type = Column(String, nullable=True)
    page_url = Column(String, nullable=True)
    product = Column(String, nullable=True)
    company_description = Column(Text, nullable=True)
    phone = Column(String, nullable=True)
    linkedin_url = Column(String, nullable=True)
    facebook_url = Column(String, nullable=True)
    email_status = Column(String, default="UNKNOWN")  # VALID, INVALID, UNKNOWN
    outreach_status = Column(String, default="PENDING")  # PENDING, CONTACTED, SKIPPED
    ai_priority = Column(String, default="UNCLASSIFIED")  # HIGH, MEDIUM, LOW, UNCLASSIFIED
    ai_score = Column(Integer, nullable=True)
    ai_confidence = Column(Float, nullable=True)
    ai_reason = Column(Text, nullable=True)
    ai_business_type = Column(String, nullable=True)
    last_contacted = Column(DateTime(timezone=True), nullable=True)
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User", back_populates="buyers")
    email_logs = relationship("EmailLog", back_populates="buyer")
