from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, BigInteger
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base

class RequestFile(Base):
    __tablename__ = "request_files"
    
    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("requests.id"), nullable=False)
    field_name = Column(String(255), nullable=False)  # Имя поля, к которому прикреплен файл
    
    # Информация о файле
    filename = Column(String(500), nullable=False)  # Оригинальное имя файла
    file_path = Column(String(1000), nullable=False)  # Путь к файлу на сервере
    file_size = Column(BigInteger, nullable=False)  # Размер файла в байтах
    content_type = Column(String(100), nullable=False)  # MIME тип файла
    
    # Метаданные
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Связи
    request = relationship("Request", back_populates="files")
    uploader = relationship("User", backref="uploaded_files")
    
    def __repr__(self):
        return f"<RequestFile(filename={self.filename}, request_id={self.request_id})>" 