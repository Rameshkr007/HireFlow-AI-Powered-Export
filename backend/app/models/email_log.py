from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class EmailLog(Base):
    __tablename__ = "email_logs"
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False)
    buyer_id = Column(Integer, ForeignKey("buyers.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    email_address = Column(String, nullable=True)
    subject = Column(String, nullable=True)
    personalized_body = Column(Text, nullable=True)
    status = Column(String, nullable=False)  # PENDING, SENDING, SENT, FAILED, SKIPPED, ALREADY_CONTACTED, INVALID_EMAIL
    error_message = Column(Text, nullable=True)
    attachment_name = Column(String, nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    campaign = relationship("Campaign", back_populates="email_logs")
    buyer = relationship("Buyer", back_populates="email_logs")
    user = relationship("User", back_populates="email_logs")
