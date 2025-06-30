from pydantic import BaseModel, computed_field
from typing import Optional
from datetime import datetime

class GroupBase(BaseModel):
    name: str
    department_id: Optional[int] = None
    education_level: Optional[str] = None  # бакалавр, магистр, аспирант
    education_form: Optional[str] = None   # очная, заочная, очно-заочная
    specialization: Optional[str] = None

class GroupCreate(GroupBase):
    pass

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    department_id: Optional[int] = None
    education_level: Optional[str] = None
    education_form: Optional[str] = None
    specialization: Optional[str] = None

class GroupResponse(GroupBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    @computed_field
    @property
    def parsed_year(self) -> Optional[int]:
        """Извлекает год набора из названия группы"""
        import re
        match = re.search(r'^(\d{2})', self.name)
        if match:
            year_suffix = int(match.group(1))
            current_year = datetime.now().year
            current_century = (current_year // 100) * 100
            full_year = current_century + year_suffix
            if full_year > current_year:
                full_year -= 100
            return full_year
        return None
    
    @computed_field
    @property
    def course(self) -> Optional[int]:
        """Вычисляет курс по году набора группы"""
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
        
        # Курс не может быть меньше 1 или больше 6
        if course < 1:
            return None
        if course > 6:
            return 6
        
        return course
    
    @computed_field
    @property
    def parsed_education_level(self) -> Optional[str]:
        """Определяет уровень образования по коду в названии"""
        import re
        match = re.search(r'^\d{2}(\d)', self.name)
        if match:
            level_code = int(match.group(1))
            level_map = {
                1: 'bachelor',
                3: 'master',
            }
            return level_map.get(level_code)
        return None
    
    @computed_field
    @property
    def parsed_education_form(self) -> Optional[str]:
        """Определяет форму обучения по коду в названии"""
        import re
        match = re.search(r'^\d{3}(\d)', self.name)
        if match:
            form_code = int(match.group(1))
            form_map = {
                1: 'full_time',
                2: 'evening', 
                3: 'part_time',
            }
            return form_map.get(form_code)
        return None
    
    class Config:
        from_attributes = True 