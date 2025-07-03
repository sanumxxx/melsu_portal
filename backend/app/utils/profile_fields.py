"""
Утилиты для работы с полями профиля пользователя.
Содержит список доступных полей для связывания с полями заявок.
"""

from typing import Dict, List, Any
from enum import Enum

class ProfileFieldType(Enum):
    """Типы полей профиля для правильного маппинга типов данных."""
    STRING = "string"
    INTEGER = "integer"
    DATE = "date"
    TEXT = "text"
    BOOLEAN = "boolean"

# Список всех доступных полей профиля для связывания
PROFILE_FIELDS = {
    # === ОСНОВНАЯ ИНФОРМАЦИЯ ПОЛЬЗОВАТЕЛЯ (таблица users) ===
    "first_name": {
        "label": "Имя",
        "type": ProfileFieldType.STRING,
        "max_length": 100,
        "group": "Основная информация",
        "table": "users"
    },
    "last_name": {
        "label": "Фамилия", 
        "type": ProfileFieldType.STRING,
        "max_length": 100,
        "group": "Основная информация",
        "table": "users"
    },
    "middle_name": {
        "label": "Отчество",
        "type": ProfileFieldType.STRING,
        "max_length": 100,
        "group": "Основная информация",
        "table": "users"
    },
    "email": {
        "label": "Email",
        "type": ProfileFieldType.STRING,
        "max_length": 100,
        "group": "Основная информация",
        "table": "users"
    },
    "birth_date": {
        "label": "Дата рождения",
        "type": ProfileFieldType.DATE,
        "group": "Основная информация",
        "table": "users"
    },
    "gender": {
        "label": "Пол",
        "type": ProfileFieldType.STRING,
        "max_length": 20,
        "group": "Основная информация",
        "table": "users"
    },
    
    # === ДОПОЛНИТЕЛЬНЫЕ ПОЛЯ ПРОФИЛЯ (таблица user_profiles) ===
    
    # Контактная информация
    "phone": {
        "label": "Телефон",
        "type": ProfileFieldType.STRING,
        "max_length": 20,
        "group": "Контактная информация",
        "table": "user_profiles"
    },
    "alternative_email": {
        "label": "Альтернативный email",
        "type": ProfileFieldType.STRING,
        "max_length": 100,
        "group": "Контактная информация",
        "table": "user_profiles"
    },
    "emergency_contact": {
        "label": "Экстренный контакт",
        "type": ProfileFieldType.STRING,
        "max_length": 200,
        "group": "Контактная информация",
        "table": "user_profiles"
    },
    
    # Паспортные данные и документы
    "passport_series": {
        "label": "Серия паспорта",
        "type": ProfileFieldType.STRING,
        "max_length": 10,
        "group": "Документы",
        "table": "user_profiles"
    },
    "passport_number": {
        "label": "Номер паспорта",
        "type": ProfileFieldType.STRING,
        "max_length": 20,
        "group": "Документы",
        "table": "user_profiles"
    },
    "passport_issued_by": {
        "label": "Кем выдан паспорт",
        "type": ProfileFieldType.TEXT,
        "group": "Документы",
        "table": "user_profiles"
    },
    "passport_issued_date": {
        "label": "Дата выдачи паспорта",
        "type": ProfileFieldType.DATE,
        "group": "Документы",
        "table": "user_profiles"
    },
    "snils": {
        "label": "СНИЛС",
        "type": ProfileFieldType.STRING,
        "max_length": 20,
        "group": "Документы",
        "table": "user_profiles"
    },
    "inn": {
        "label": "ИНН",
        "type": ProfileFieldType.STRING,
        "max_length": 20,
        "group": "Документы",
        "table": "user_profiles"
    },
    
    # Адрес регистрации
    "registration_region": {
        "label": "Регион регистрации",
        "type": ProfileFieldType.STRING,
        "max_length": 100,
        "group": "Адрес регистрации",
        "table": "user_profiles"
    },
    "registration_city": {
        "label": "Город регистрации",
        "type": ProfileFieldType.STRING,
        "max_length": 100,
        "group": "Адрес регистрации",
        "table": "user_profiles"
    },
    "registration_address": {
        "label": "Адрес регистрации",
        "type": ProfileFieldType.TEXT,
        "group": "Адрес регистрации",
        "table": "user_profiles"
    },
    "registration_postal_code": {
        "label": "Почтовый индекс регистрации",
        "type": ProfileFieldType.STRING,
        "max_length": 10,
        "group": "Адрес регистрации",
        "table": "user_profiles"
    },
    
    # Адрес проживания
    "residence_region": {
        "label": "Регион проживания",
        "type": ProfileFieldType.STRING,
        "max_length": 100,
        "group": "Адрес проживания",
        "table": "user_profiles"
    },
    "residence_city": {
        "label": "Город проживания",
        "type": ProfileFieldType.STRING,
        "max_length": 100,
        "group": "Адрес проживания",
        "table": "user_profiles"
    },
    "residence_address": {
        "label": "Адрес проживания",
        "type": ProfileFieldType.TEXT,
        "group": "Адрес проживания",
        "table": "user_profiles"
    },
    "residence_postal_code": {
        "label": "Почтовый индекс проживания",
        "type": ProfileFieldType.STRING,
        "max_length": 10,
        "group": "Адрес проживания",
        "table": "user_profiles"
    },
    
    # Академическая информация
    "student_id": {
        "label": "Студенческий билет",
        "type": ProfileFieldType.STRING,
        "max_length": 50,
        "group": "Академическая информация",
        "table": "user_profiles"
    },
    "group_number": {
        "label": "Номер группы",
        "type": ProfileFieldType.STRING,
        "max_length": 50,
        "group": "Академическая информация",
        "table": "user_profiles"
    },
    "course": {
        "label": "Курс",
        "type": ProfileFieldType.INTEGER,
        "group": "Академическая информация",
        "table": "user_profiles"
    },
    "semester": {
        "label": "Семестр",
        "type": ProfileFieldType.INTEGER,
        "group": "Академическая информация",
        "table": "user_profiles"
    },
    "faculty": {
        "label": "Факультет",
        "type": ProfileFieldType.STRING,
        "max_length": 200,
        "group": "Академическая информация",
        "table": "user_profiles"
    },
    "department": {
        "label": "Кафедра",
        "type": ProfileFieldType.STRING,
        "max_length": 200,
        "group": "Академическая информация",
        "table": "user_profiles"
    },
    "specialization": {
        "label": "Специализация",
        "type": ProfileFieldType.STRING,
        "max_length": 200,
        "group": "Академическая информация",
        "table": "user_profiles"
    },
    "education_level": {
        "label": "Уровень образования",
        "type": ProfileFieldType.STRING,
        "max_length": 50,
        "group": "Академическая информация",
        "table": "user_profiles"
    },
    "education_form": {
        "label": "Форма обучения",
        "type": ProfileFieldType.STRING,
        "max_length": 50,
        "group": "Академическая информация",
        "table": "user_profiles"
    },
    "funding_type": {
        "label": "Тип финансирования",
        "type": ProfileFieldType.STRING,
        "max_length": 50,
        "group": "Академическая информация",
        "table": "user_profiles"
    },
    "enrollment_date": {
        "label": "Дата поступления",
        "type": ProfileFieldType.DATE,
        "group": "Академическая информация",
        "table": "user_profiles"
    },
    "graduation_date": {
        "label": "Дата выпуска",
        "type": ProfileFieldType.DATE,
        "group": "Академическая информация",
        "table": "user_profiles"
    },
    "academic_status": {
        "label": "Академический статус",
        "type": ProfileFieldType.STRING,
        "max_length": 50,
        "group": "Академическая информация",
        "table": "user_profiles"
    },
    "gpa": {
        "label": "Средний балл",
        "type": ProfileFieldType.STRING,
        "max_length": 10,
        "group": "Академическая информация",
        "table": "user_profiles"
    },
    
    # Профессиональная информация
    "employee_id": {
        "label": "Табельный номер",
        "type": ProfileFieldType.STRING,
        "max_length": 50,
        "group": "Профессиональная информация",
        "table": "user_profiles"
    },
    "hire_date": {
        "label": "Дата трудоустройства",
        "type": ProfileFieldType.DATE,
        "group": "Профессиональная информация",
        "table": "user_profiles"
    },
    "employment_type": {
        "label": "Тип трудоустройства",
        "type": ProfileFieldType.STRING,
        "max_length": 50,
        "group": "Профессиональная информация",
        "table": "user_profiles"
    },
    "work_schedule": {
        "label": "График работы",
        "type": ProfileFieldType.STRING,
        "max_length": 100,
        "group": "Профессиональная информация",
        "table": "user_profiles"
    },
    "work_experience": {
        "label": "Общий стаж (лет)",
        "type": ProfileFieldType.INTEGER,
        "group": "Профессиональная информация",
        "table": "user_profiles"
    },
    "pedagogical_experience": {
        "label": "Педагогический стаж (лет)",
        "type": ProfileFieldType.INTEGER,
        "group": "Профессиональная информация",
        "table": "user_profiles"
    },
    
    # Образование и квалификация
    "education_degree": {
        "label": "Ученая степень",
        "type": ProfileFieldType.STRING,
        "max_length": 100,
        "group": "Образование и квалификация",
        "table": "user_profiles"
    },
    "education_title": {
        "label": "Ученое звание",
        "type": ProfileFieldType.STRING,
        "max_length": 100,
        "group": "Образование и квалификация",
        "table": "user_profiles"
    },
    
    # Личная информация
    "marital_status": {
        "label": "Семейное положение",
        "type": ProfileFieldType.STRING,
        "max_length": 50,
        "group": "Личная информация",
        "table": "user_profiles"
    },
    "children_count": {
        "label": "Количество детей",
        "type": ProfileFieldType.INTEGER,
        "group": "Личная информация",
        "table": "user_profiles"
    },
    "social_category": {
        "label": "Социальная категория",
        "type": ProfileFieldType.STRING,
        "max_length": 100,
        "group": "Личная информация",
        "table": "user_profiles"
    },
    "military_service": {
        "label": "Военная служба",
        "type": ProfileFieldType.STRING,
        "max_length": 100,
        "group": "Личная информация",
        "table": "user_profiles"
    },
    
    # Социальные сети
    "vk_id": {
        "label": "ВКонтакте",
        "type": ProfileFieldType.STRING,
        "max_length": 100,
        "group": "Социальные сети",
        "table": "user_profiles"
    },
    "telegram_id": {
        "label": "Telegram",
        "type": ProfileFieldType.STRING,
        "max_length": 100,
        "group": "Социальные сети",
        "table": "user_profiles"
    }
}


def get_profile_fields_grouped() -> Dict[str, List[Dict[str, Any]]]:
    """
    Возвращает поля профиля, сгруппированные по категориям.
    
    Returns:
        Dict с группами полей профиля
    """
    grouped_fields = {}
    
    for field_name, field_info in PROFILE_FIELDS.items():
        group = field_info["group"]
        if group not in grouped_fields:
            grouped_fields[group] = []
        
        grouped_fields[group].append({
            "name": field_name,
            "label": field_info["label"],
            "type": field_info["type"].value,
            "max_length": field_info.get("max_length"),
            "table": field_info.get("table", "user_profiles")
        })
    
    return grouped_fields


def get_profile_field_info(field_name: str) -> Dict[str, Any]:
    """
    Возвращает информацию о конкретном поле профиля.
    
    Args:
        field_name: Имя поля профиля
        
    Returns:
        Dict с информацией о поле или None, если поле не найдено
    """
    if field_name in PROFILE_FIELDS:
        field_info = PROFILE_FIELDS[field_name].copy()
        field_info["name"] = field_name
        field_info["type"] = field_info["type"].value
        return field_info
    return None


def validate_profile_field_mapping(field_name: str) -> bool:
    """
    Проверяет, является ли указанное имя поля валидным для связывания.
    
    Args:
        field_name: Имя поля профиля
        
    Returns:
        True, если поле можно связать с полем заявки
    """
    return field_name in PROFILE_FIELDS


def get_profile_fields_list() -> List[Dict[str, Any]]:
    """
    Возвращает плоский список всех доступных полей профиля.
    
    Returns:
        List с информацией о всех полях профиля
    """
    fields_list = []
    
    for field_name, field_info in PROFILE_FIELDS.items():
        fields_list.append({
            "name": field_name,
            "label": field_info["label"],
            "type": field_info["type"].value,
            "group": field_info["group"],
            "max_length": field_info.get("max_length"),
            "table": field_info.get("table", "user_profiles")
        })
    
    # Сортируем по группам, затем по названию
    fields_list.sort(key=lambda x: (x["group"], x["label"]))
    return fields_list 