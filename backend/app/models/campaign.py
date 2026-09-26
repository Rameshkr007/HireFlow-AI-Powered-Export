from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class Campaign(Base):
    __tablename__ = "campaigns"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    product = Column(String, nullable=True)
    target_country = Column(String, nullable=True)
    target_audience = Column(String, nullable=True)
    email_subject = Column(String, nullable=True)
    email_body = Column(Text, nullable=True)
    sending_limit = Column(Integer, default=20)
    delay_seconds = Column(Integer, default=60)
    attachment_id = Column(Integer, ForeignKey("attachments.id"), nullable=True)
    status = Column(String, default="DRAFT")  # DRAFT, READY, RUNNING, PAUSED, COMPLETED, FAILED
    sent_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    skipped_count = Column(Integer, default=0)
    total_leads = Column(Integer, default=0)
    is_demo = Column(Boolean, default=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User", back_populates="campaigns")
    attachment = relationship("Attachment", foreign_keys=[attachment_id])
    email_logs = relationship("EmailLog", back_populates="campaign")
