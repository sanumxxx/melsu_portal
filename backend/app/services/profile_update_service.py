"""
Сервис для обновления профиля пользователя данными из заявки.
Обновляет поля профиля согласно настройкам связывания полей в шаблоне заявки.
"""

from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, date
import json
import logging

from ..models.user_profile import UserProfile
from ..models.user import User
from ..models.field import Field
from ..models.request import Request
from ..models.department import Department

from ..models.user_assignment import UserDepartmentAssignment
from ..utils.profile_fields import get_profile_field_info, ProfileFieldType

# Настройка логирования
logger = logging.getLogger(__name__)


class ProfileUpdateService:
    """Сервис для обновления профиля пользователя."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def update_profile_on_submit(self, request_id: int, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Обновление профиля при подаче заявки.
        
        Args:
            request_id: ID заявки
            form_data: Данные формы заявки
            
        Returns:
            Dict с результатом обновления
        """
        logger.info(f"Обновление профиля при подаче заявки {request_id}")
        
        # Получаем заявку
        request = self.db.query(Request).filter(Request.id == request_id).first()
        if not request:
            logger.error(f"Заявка {request_id} не найдена")
            return {"success": False, "error": "Заявка не найдена"}
        
        # Получаем поля шаблона с настройками обновления при подаче
        fields = self.db.query(Field).filter(
            Field.template_id == request.template_id,
            Field.profile_field_mapping.isnot(None),
            Field.update_profile_on_submit == True
        ).all()
        
        if not fields:
            logger.info(f"Нет полей для обновления профиля при подаче заявки {request_id}")
            return {"success": True, "updated_fields": []}
        
        return self._update_profile_fields(request.author_id, fields, form_data, "submit")
    
    def update_profile_on_approve(self, request_id: int) -> Dict[str, Any]:
        """
        Обновление профиля при одобрении заявки.
        
        Args:
            request_id: ID заявки
            
        Returns:
            Dict с результатом обновления
        """
        logger.info(f"Обновление профиля при одобрении заявки {request_id}")
        
        # Получаем заявку
        request = self.db.query(Request).filter(Request.id == request_id).first()
        if not request:
            logger.error(f"Заявка {request_id} не найдена")
            return {"success": False, "error": "Заявка не найдена"}
        
        # Получаем поля шаблона с настройками обновления при одобрении
        fields = self.db.query(Field).filter(
            Field.template_id == request.template_id,
            Field.profile_field_mapping.isnot(None),
            Field.update_profile_on_approve == True
        ).all()
        
        if not fields:
            logger.info(f"Нет полей для обновления профиля при одобрении заявки {request_id}")
            return {"success": True, "updated_fields": []}
        
        # Получаем данные заявки
        form_data = request.form_data or {}
        
        result = self._update_profile_fields(request.author_id, fields, form_data, "approve")
        
        return result
    

    
    def _update_profile_fields(
        self, 
        user_id: int, 
        fields: List[Field], 
        form_data: Dict[str, Any], 
        trigger: str
    ) -> Dict[str, Any]:
        """
        Внутренний метод для обновления полей профиля.
        
        Args:
            user_id: ID пользователя
            fields: Список полей для обновления
            form_data: Данные формы
            trigger: Триггер обновления (submit/approve)
            
        Returns:
            Dict с результатом обновления
        """
        try:
            # Получаем пользователя
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                logger.error(f"Пользователь {user_id} не найден")
                return {"success": False, "error": "Пользователь не найден"}
            
            # Получаем или создаем профиль пользователя
            profile = self.db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
            if not profile:
                logger.info(f"Создание нового профиля для пользователя {user_id}")
                profile = UserProfile(user_id=user_id)
                self.db.add(profile)
                self.db.flush()  # Сохраняем, чтобы получить ID
            
            updated_fields = []
            errors = []
            
            for field in fields:
                try:
                    # Получаем значение из формы
                    field_value = form_data.get(field.name)
                    
                    # Для новых полей faculty_id и department_id сохраняем ID напрямую
                    if field.name in ['faculty_id', 'department_id'] and field_value:
                        if field.name == 'faculty_id':
                            dept = self.db.query(Department).filter(
                                Department.id == int(field_value),
                                Department.department_type == 'faculty'
                            ).first()
                            if dept:
                                logger.info(f"Привязка к факультету: {dept.name} (ID: {dept.id})")
                            else:
                                logger.error(f"Факультет с ID {field_value} не найден")
                                errors.append(f"Факультет с ID {field_value} не найден")
                                continue
                        
                        elif field.name == 'department_id':
                            dept = self.db.query(Department).filter(
                                Department.id == int(field_value),
                                Department.department_type.in_(['department', 'chair'])
                            ).first()
                            if dept:
                                logger.info(f"Привязка к кафедре: {dept.name} (ID: {dept.id})")
                            else:
                                logger.error(f"Кафедра с ID {field_value} не найден")
                                errors.append(f"Кафедра с ID {field_value} не найден")
                                continue
                    
                    # Для старых полей факультета/кафедры получаем название по ID (для совместимости)
                    elif field.name in ['faculty', 'department'] and field_value:
                        if field.name == 'faculty' and field_value.isdigit():
                            dept = self.db.query(Department).filter(
                                Department.id == int(field_value),
                                Department.department_type == 'faculty'
                            ).first()
                            if dept:
                                field_value = dept.name
                                logger.info(f"Преобразован ID факультета {field_value} в название: {dept.name}")
                        
                        elif field.name == 'department' and field_value.isdigit():
                            dept = self.db.query(Department).filter(
                                Department.id == int(field_value),
                                Department.department_type.in_(['department', 'chair'])
                            ).first()
                            if dept:
                                field_value = dept.name
                                logger.info(f"Преобразован ID кафедры {field_value} в название: {dept.name}")
                    
                    # Для поля группы - сохраняем ID группы напрямую
                    if field.name == 'group' and field_value and field.profile_field_mapping == 'group_id':
                        if field_value.isdigit():
                            from ..models.group import Group
                            group = self.db.query(Group).filter(Group.id == int(field_value)).first()
                            if group:
                                logger.info(f"Студент будет прикреплен к группе: {group.name} (ID: {group.id})")
                            else:
                                logger.error(f"Группа с ID {field_value} не найдена")
                                errors.append(f"Группа с ID {field_value} не найдена")
                                continue
                    
                    if field_value is None or field_value == "":
                        logger.debug(f"Пропуск поля {field.name} - пустое значение")
                        continue
                    
                    # Получаем информацию о поле профиля
                    profile_field_info = get_profile_field_info(field.profile_field_mapping)
                    if not profile_field_info:
                        logger.error(f"Неизвестное поле профиля: {field.profile_field_mapping}")
                        errors.append(f"Неизвестное поле профиля: {field.profile_field_mapping}")
                        continue
                    
                    # Конвертируем значение в нужный тип
                    converted_value = self._convert_field_value(
                        field_value, 
                        profile_field_info["type"]
                    )
                    
                    if converted_value is None:
                        logger.error(f"Ошибка конвертации значения для поля {field.profile_field_mapping}")
                        errors.append(f"Ошибка конвертации значения для поля {field.profile_field_mapping}")
                        continue
                    
                    # Определяем в какой таблице находится поле
                    target_table = profile_field_info.get("table", "user_profiles")
                    target_object = user if target_table == "users" else profile
                    
                    # Обновляем поле
                    old_value = getattr(target_object, field.profile_field_mapping, None)
                    setattr(target_object, field.profile_field_mapping, converted_value)
                    
                    updated_fields.append({
                        "field_name": field.profile_field_mapping,
                        "field_label": profile_field_info["label"],
                        "old_value": old_value,
                        "new_value": converted_value,
                        "trigger": trigger,
                        "table": target_table
                    })
                    
                    logger.info(f"Обновлено поле {field.profile_field_mapping} в таблице {target_table}: {old_value} -> {converted_value}")
                    
                except Exception as e:
                    error_msg = f"Ошибка обновления поля {field.profile_field_mapping}: {str(e)}"
                    logger.error(error_msg)
                    errors.append(error_msg)
            
            # Обновляем время последнего изменения
            if any(field.get("table") == "users" for field in updated_fields):
                user.updated_at = datetime.utcnow()
            
            if any(field.get("table") == "user_profiles" for field in updated_fields):
                profile.updated_at = datetime.utcnow()
            
            # Сохраняем изменения
            self.db.commit()
            
            result = {
                "success": True,
                "updated_fields": updated_fields,
                "trigger": trigger,
                "total_updated": len(updated_fields)
            }
            
            if errors:
                result["errors"] = errors
                result["has_errors"] = True
            
            logger.info(f"Обновление профиля завершено. Обновлено полей: {len(updated_fields)}, ошибок: {len(errors)}")
            
            return result
            
        except Exception as e:
            logger.error(f"Критическая ошибка при обновлении профиля: {str(e)}")
            self.db.rollback()
            return {
                "success": False,
                "error": f"Критическая ошибка при обновлении профиля: {str(e)}"
            }
    
    def _convert_field_value(self, value: Any, field_type: str) -> Any:
        """
        Конвертирует значение поля в нужный тип данных.
        
        Args:
            value: Исходное значение
            field_type: Тип поля профиля
            
        Returns:
            Сконвертированное значение или None при ошибке
        """
        try:
            if value is None or value == "":
                return None
            
            if field_type == ProfileFieldType.STRING.value:
                return str(value)
            
            elif field_type == ProfileFieldType.INTEGER.value:
                if isinstance(value, int):
                    return value
                elif isinstance(value, str) and value.isdigit():
                    return int(value)
                else:
                    logger.warning(f"Не удалось конвертировать '{value}' в integer")
                    return None
            
            elif field_type == ProfileFieldType.DATE.value:
                if isinstance(value, date):
                    return value
                elif isinstance(value, datetime):
                    return value.date()
                elif isinstance(value, str):
                    # Пробуем различные форматы дат
                    for date_format in ["%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y"]:
                        try:
                            return datetime.strptime(value, date_format).date()
                        except ValueError:
                            continue
                    logger.warning(f"Не удалось конвертировать '{value}' в дату")
                    return None
            
            elif field_type == ProfileFieldType.TEXT.value:
                return str(value)
            
            elif field_type == ProfileFieldType.BOOLEAN.value:
                if isinstance(value, bool):
                    return value
                elif isinstance(value, str):
                    return value.lower() in ["true", "1", "да", "yes"]
                elif isinstance(value, int):
                    return bool(value)
                else:
                    return bool(value)
            
            else:
                logger.warning(f"Неизвестный тип поля: {field_type}")
                return str(value)
                
        except Exception as e:
            logger.error(f"Ошибка конвертации значения '{value}' в тип '{field_type}': {str(e)}")
            return None
    
    def get_profile_mapping_info(self, template_id: int) -> Dict[str, Any]:
        """
        Получает информацию о настройках связывания полей для шаблона.
        
        Args:
            template_id: ID шаблона заявки
            
        Returns:
            Dict с информацией о связанных полях
        """
        fields = self.db.query(Field).filter(
            Field.template_id == template_id,
            Field.profile_field_mapping.isnot(None)
        ).all()
        
        mapping_info = {
            "template_id": template_id,
            "total_mapped_fields": len(fields),
            "submit_trigger_fields": [],
            "approve_trigger_fields": [],
            "fields": []
        }
        
        for field in fields:
            profile_field_info = get_profile_field_info(field.profile_field_mapping)
            
            field_info = {
                "field_id": field.id,
                "field_name": field.name,
                "field_label": field.label,
                "profile_field": field.profile_field_mapping,
                "profile_field_label": profile_field_info["label"] if profile_field_info else "Неизвестно",
                "update_on_submit": field.update_profile_on_submit,
                "update_on_approve": field.update_profile_on_approve
            }
            
            mapping_info["fields"].append(field_info)
            
            if field.update_profile_on_submit:
                mapping_info["submit_trigger_fields"].append(field_info)
            
            if field.update_profile_on_approve:
                mapping_info["approve_trigger_fields"].append(field_info)
        
        return mapping_info 