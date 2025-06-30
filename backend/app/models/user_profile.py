from sqlalchemy import Column, Integer, String, Date, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base

class UserProfile(Base):
    __tablename__ = "user_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    # Старые поля department_id и department_role_id удалены - используйте UserDepartmentAssignment
    
    # Контактная информация
    phone = Column(String(20), nullable=True)
    alternative_email = Column(String(100), nullable=True)
    
    # Паспортные данные
    passport_series = Column(String(10), nullable=True)
    passport_number = Column(String(20), nullable=True)
    passport_issued_by = Column(Text, nullable=True)
    passport_issued_date = Column(Date, nullable=True)
    
    # Документы
    snils = Column(String(20), nullable=True)
    inn = Column(String(20), nullable=True)
    
    # Адрес регистрации
    registration_region = Column(String(100), nullable=True)
    registration_city = Column(String(100), nullable=True)
    registration_address = Column(Text, nullable=True)
    registration_postal_code = Column(String(10), nullable=True)
    
    # Адрес проживания
    residence_region = Column(String(100), nullable=True)
    residence_city = Column(String(100), nullable=True)
    residence_address = Column(Text, nullable=True)
    residence_postal_code = Column(String(10), nullable=True)
    
    # Академическая информация
    student_id = Column(String(50), nullable=True)
    course = Column(Integer, nullable=True)
    semester = Column(Integer, nullable=True)
    faculty = Column(String(200), nullable=True)
    department = Column(String(200), nullable=True)
    specialization = Column(String(200), nullable=True)
    education_level = Column(String(50), nullable=True)  # бакалавр, магистр, аспирант
    education_form = Column(String(50), nullable=True)   # очная, заочная, очно-заочная
    funding_type = Column(String(50), nullable=True)     # бюджет, договор
    enrollment_date = Column(Date, nullable=True)
    graduation_date = Column(Date, nullable=True)
    academic_status = Column(String(50), default='active', nullable=True)  # active, academic_leave, expelled
    
    # Профессиональная информация (для сотрудников)
    employee_id = Column(String(50), nullable=True)
    hire_date = Column(Date, nullable=True)
    employment_type = Column(String(50), nullable=True)  # основное, совместительство
    work_schedule = Column(String(100), nullable=True)
    
    # Образование и квалификация
    education_degree = Column(String(100), nullable=True)  # ученая степень
    education_title = Column(String(100), nullable=True)   # ученое звание
    work_experience = Column(Integer, nullable=True)       # общий стаж в годах
    pedagogical_experience = Column(Integer, nullable=True) # педагогический стаж
    
    # Дополнительная информация
    marital_status = Column(String(50), nullable=True)
    children_count = Column(Integer, default=0, nullable=True)
    emergency_contact = Column(String(200), nullable=True)
    social_category = Column(String(100), nullable=True)   # сирота, инвалид, многодетная семья
    military_service = Column(String(100), nullable=True)
    
    # Достижения
    gpa = Column(String(10), nullable=True)  # средний балл
    
    # Новое поле: группа
    group_id = Column(Integer, ForeignKey('groups.id'), nullable=True)
    
    # Даты создания и обновления
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Связь с основной таблицей пользователей
    user = relationship("User", back_populates="profile")
    group = relationship("Group", backref="members")
    # Старые связи с подразделением удалены - используйте UserDepartmentAssignment
    
    def __repr__(self):
        return f"<UserProfile(user_id={self.user_id}, student_id={self.student_id})>" 