from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    profile = relationship("ExporterProfile", back_populates="user", uselist=False)
    buyers = relationship("Buyer", back_populates="user")
    campaigns = relationship("Campaign", back_populates="user")
    email_logs = relationship("EmailLog", back_populates="user")
    gmail_connection = relationship("GmailConnection", back_populates="user", uselist=False)
    email_setting = relationship("EmailSetting", back_populates="user", uselist=False)
    attachments = relationship("Attachment", back_populates="user")
