from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base

class Report(Base):
    __tablename__ = "reports"
    
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("report_templates.id"), nullable=False)
    
    # JSON данные отчета
    data = Column(JSON, nullable=False)
    
    # Метаданные отправителя
    submitted_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Дополнительные поля
    notes = Column(Text, nullable=True)
    status = Column(String(50), default="submitted", nullable=False)
    
    # Связи
    template = relationship("ReportTemplate", back_populates="reports")
    submitted_by = relationship("User", foreign_keys=[submitted_by_id])
    
    def __repr__(self):
        return f"<Report(template_id={self.template_id}, submitted_by_id={self.submitted_by_id})>" 