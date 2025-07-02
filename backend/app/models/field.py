from sqlalchemy import Column, Integer, String, Text, Boolean, JSON, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base

class FieldType(Base):
    __tablename__ = "field_types"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    label = Column(String(200), nullable=False)
    description = Column(Text)
    input_type = Column(String(50), nullable=False)  # text, number, email, select, etc.
    has_options = Column(Boolean, default=False)  # Для select, radio, checkbox
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Связь с полями
    fields = relationship("Field", back_populates="field_type")

class Field(Base):
    __tablename__ = "fields"
    
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("request_templates.id"), nullable=False)
    field_type_id = Column(Integer, ForeignKey("field_types.id"), nullable=False)
    
    name = Column(String(255), nullable=False)  # Техническое имя
    label = Column(String(500), nullable=False)  # Отображаемое название
    description = Column(Text)  # Описание поля
    placeholder = Column(String(500))  # Плейсхолдер
    
    is_required = Column(Boolean, default=False)
    is_visible = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    
    # Настройки валидации и опции
    validation_rules = Column(JSON)  # min, max, pattern и т.д.
    options = Column(JSON)  # Для select, radio, checkbox
    default_value = Column(Text)
    
    # Поля для условного отображения
    conditional_field_id = Column(Integer, ForeignKey("fields.id"), nullable=True)
    conditional_value = Column(String(255), nullable=True)
    conditional_operator = Column(String(20), default="equals", nullable=True)
    
    # Связь с полем профиля пользователя
    profile_field_mapping = Column(String(100), nullable=True)  # Имя поля в UserProfile
    update_profile_on_submit = Column(Boolean, default=False)   # Обновлять ли профиль при подаче заявки
    update_profile_on_approve = Column(Boolean, default=False)  # Обновлять ли профиль при одобрении заявки
    
    # Настройки масок ввода
    mask_enabled = Column(Boolean, default=False, nullable=False)  # Включена ли маска
    mask_type = Column(String(50), nullable=True)  # Тип маски (phone_ru, passport_rf, custom, etc.)
    mask_pattern = Column(Text, nullable=True)  # Паттерн маски (+7 (999) 999-99-99)
    mask_placeholder = Column(Text, nullable=True)  # Плейсхолдер маски (+7 (___) ___-__-__)
    mask_validation_regex = Column(Text, nullable=True)  # Regex для валидации
    mask_validation_message = Column(Text, nullable=True)  # Сообщение об ошибке валидации
    mask_guide = Column(Boolean, default=True, nullable=False)  # Показывать ли направляющие символы
    mask_keep_char_positions = Column(Boolean, default=False, nullable=False)  # Сохранять ли позиции символов
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Связи
    field_type = relationship("FieldType", back_populates="fields")
    template = relationship("RequestTemplate", back_populates="fields")
    conditional_field = relationship("Field", remote_side=[id], backref="dependent_fields") 