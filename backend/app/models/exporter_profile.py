from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class ExporterProfile(Base):
    __tablename__ = "exporter_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    exporter_name = Column(String, nullable=True)
    company_name = Column(String, nullable=True)
    company_email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    website = Column(String, nullable=True)
    country = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    product_categories = Column(JSON, nullable=True, default=list)
    company_description = Column(Text, nullable=True)
    sender_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User", back_populates="profile")
