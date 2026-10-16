from sqlalchemy import Column, Integer, BigInteger, String, DateTime, ForeignKey, Text, Boolean, Index, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class EmailSendLog(Base):
    """
    Permanent, immutable ledger of all email dispatch operations.
    Acts as the canonical database source of truth for email tracking and deliverability auditing.
    """
    __tablename__ = "email_send_logs"
    __table_args__ = (
        UniqueConstraint("operation_id", name="uq_email_send_logs_operation_id"),
        Index("idx_send_logs_user_status_date", "user_id", "status", "created_at"),
        Index("idx_send_logs_user_recipient", "user_id", "recipient_email"),
        Index("idx_send_logs_campaign", "user_id", "campaign_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    operation_id = Column(String(64), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    buyer_id = Column(Integer, ForeignKey("buyers.id"), nullable=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True, index=True)

    recipient_email = Column(String(255), nullable=False, index=True)
    recipient_name = Column(String(255), nullable=True)
    company_name = Column(String(255), nullable=True)
    product = Column(String(255), nullable=True)
    campaign_name = Column(String(255), nullable=True)

    subject = Column(Text, nullable=False)
    body_text = Column(Text, nullable=True)
    body_html = Column(Text, nullable=True)
    attachment_name = Column(String(255), nullable=True)

    status = Column(String(32), nullable=False, default="PENDING", index=True)
    sent_at = Column(DateTime(timezone=True), nullable=True, index=True)
    gmail_message_id = Column(String(255), nullable=True, index=True)
    gmail_thread_id = Column(String(255), nullable=True)
    sender_account_id = Column(String(255), nullable=True)
    sender_email = Column(String(255), nullable=True)

    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    is_verified = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="email_send_logs")
    buyer = relationship("Buyer", back_populates="email_send_logs")
    campaign = relationship("Campaign", back_populates="email_send_logs")
