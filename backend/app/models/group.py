from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import re
from ..database import Base

class Group(Base):
    __tablename__ = "groups"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    education_level = Column(String(50), nullable=True)  # бакалавр, магистр, аспирант
    education_form = Column(String(50), nullable=True)   # очная, заочная, очно-заочная
    specialization = Column(String(200), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Связи
    department = relationship("Department", backref="groups")
    
    @property
    def parsed_year(self):
        """Извлекает год набора из названия группы (формат: YYXX-XXXX.X)"""
        match = re.search(r'^(\d{2})', self.name)
        if match:
            year_suffix = int(match.group(1))
            # Преобразуем в полный год (22 -> 2022)
            current_year = datetime.now().year
            current_century = (current_year // 100) * 100
            full_year = current_century + year_suffix
            # Если год больше текущего, значит это предыдущий век
            if full_year > current_year:
                full_year -= 100
            return full_year
        return None
    
    @property
    def course(self):
        """Определяет курс по году набора группы"""
        admission_year = self.parsed_year
        if admission_year is None:
            return None
        
        current_year = datetime.now().year
        current_month = datetime.now().month
        
        # Если сейчас до сентября (месяц < 9), то учебный год еще не начался
        if current_month < 9:
            academic_year = current_year - 1
        else:
            academic_year = current_year
        
        # Курс = разность между текущим учебным годом и годом набора + 1
        course = academic_year - admission_year + 1
        
        # Курс не может быть меньше 1 или больше 6 (для большинства программ)
        if course < 1:
            return None
        if course > 6:
            return 6  # Максимальный курс
        
        return course
    
    @property
    def parsed_education_level(self):
        """Определяет уровень образования по третьей цифре в названии группы"""
        match = re.search(r'^\d{2}(\d)', self.name)
        if match:
            level_code = int(match.group(1))
            level_map = {
                1: 'bachelor',      # Бакалавриат
                3: 'master',        # Магистратура
                # Можно добавить другие коды при необходимости
            }
            return level_map.get(level_code)
        return None
    
    @property
    def parsed_education_form(self):
        """Определяет форму обучения по четвертой цифре в названии группы"""
        match = re.search(r'^\d{3}(\d)', self.name)
        if match:
            form_code = int(match.group(1))
            form_map = {
                1: 'full_time',     # Очная
                2: 'evening',       # Очно-заочная (ОЗ)
                3: 'part_time',     # Заочная (З)
                # Можно добавить другие коды при необходимости
            }
            return form_map.get(form_code)
        return None
    
    def get_display_info(self):
        """Возвращает информацию для отображения с автоматически определенными значениями"""
        return {
            'id': self.id,
            'name': self.name,
            'department_id': self.department_id,
            'course': self.course,
            'admission_year': self.parsed_year,
            'education_level': self.parsed_education_level or self.education_level,
            'education_form': self.parsed_education_form or self.education_form,
            'specialization': self.specialization,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }
    
    def __repr__(self):
        return f"<Group(name={self.name}, course={self.course}, year={self.parsed_year})>" 