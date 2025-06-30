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
from ..models.student_access import StudentAccess
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
        
        # Если обновились поля факультета/кафедры студента, создаем доступ для сотрудников
        if result.get("success") and result.get("updated_fields"):
            self._create_student_access_for_departments(request.author_id, result["updated_fields"])
        
        return result
    
    def _create_student_access_for_departments(self, student_id: int, updated_fields: List[Dict]) -> None:
        """
        Создает доступ к студенту для сотрудников факультета/кафедры при обновлении профиля.
        
        Args:
            student_id: ID студента
            updated_fields: Список обновленных полей
        """
        try:
            # Проверяем, что пользователь - студент
            user = self.db.query(User).filter(User.id == student_id).first()
            if not user or 'student' not in (user.roles or []):
                logger.debug(f"Пользователь {student_id} не является студентом, пропускаем создание доступа")
                return
            
            # Проверяем, обновились ли поля факультета или кафедры
            faculty_updated = any(field.get("field_name") == "faculty" for field in updated_fields)
            department_updated = any(field.get("field_name") == "department" for field in updated_fields)
            
            if not (faculty_updated or department_updated):
                logger.debug(f"Поля факультета/кафедры не обновлялись для студента {student_id}")
                return
            
            logger.info(f"Создание доступа для сотрудников к студенту {student_id}")
            
            # Получаем текущий профиль студента
            profile = self.db.query(UserProfile).filter(UserProfile.user_id == student_id).first()
            if not profile:
                logger.warning(f"Профиль студента {student_id} не найден")
                return
            
            departments_to_grant_access = []
            
            # Ищем подразделения по названиям из профиля
            if profile.faculty:
                faculty_dept = self.db.query(Department).filter(
                    Department.name == profile.faculty,
                    Department.department_type == 'faculty',
                    Department.is_active == True
                ).first()
                if faculty_dept:
                    departments_to_grant_access.append(faculty_dept)
                    logger.info(f"Найден факультет: {faculty_dept.name} (ID: {faculty_dept.id})")
            
            if profile.department:
                department_dept = self.db.query(Department).filter(
                    Department.name == profile.department,
                    Department.department_type == 'department',
                    Department.is_active == True
                ).first()
                if department_dept:
                    departments_to_grant_access.append(department_dept)
                    logger.info(f"Найдена кафедра: {department_dept.name} (ID: {department_dept.id})")
            
            if not departments_to_grant_access:
                logger.warning(f"Не найдены подразделения для создания доступа к студенту {student_id}")
                return
            
            # Создаем доступ для всех сотрудников найденных подразделений
            access_created_count = 0
            
            for department in departments_to_grant_access:
                # Получаем всех сотрудников этого подразделения
                assignments = self.db.query(UserDepartmentAssignment).filter(
                    UserDepartmentAssignment.department_id == department.id,
                    UserDepartmentAssignment.is_active == True
                ).all()
                
                for assignment in assignments:
                    employee = self.db.query(User).filter(User.id == assignment.user_id).first()
                    if not employee:
                        continue
                    
                    # Проверяем, что это сотрудник или преподаватель
                    if not any(role in (employee.roles or []) for role in ['employee', 'teacher', 'admin']):
                        logger.debug(f"Пользователь {employee.id} не является сотрудником/преподавателем")
                        continue
                    
                    # Проверяем, нет ли уже доступа
                    existing_access = self.db.query(StudentAccess).filter(
                        StudentAccess.employee_id == employee.id,
                        StudentAccess.department_id == department.id,
                        StudentAccess.is_active == True
                    ).first()
                    
                    if existing_access:
                        logger.debug(f"Доступ уже существует для сотрудника {employee.id} к подразделению {department.id}")
                        continue
                    
                    # Создаем новый доступ
                    access_level = "read"  # По умолчанию только чтение
                    if 'admin' in (employee.roles or []):
                        access_level = "full"
                    elif assignment.role in ['head', 'deputy_head']:
                        access_level = "write"
                    
                    new_access = StudentAccess(
                        employee_id=employee.id,
                        department_id=department.id,
                        access_level=access_level,
                        assigned_by_id=1,  # Системное назначение (можно использовать ID системного пользователя)
                        assigned_at=datetime.utcnow(),
                        notes=f"Автоматически создан при обновлении профиля студента {user.first_name} {user.last_name}"
                    )
                    
                    self.db.add(new_access)
                    access_created_count += 1
                    
                    logger.info(f"Создан доступ уровня '{access_level}' для сотрудника {employee.first_name} {employee.last_name} к подразделению {department.name}")
            
            if access_created_count > 0:
                self.db.commit()
                logger.info(f"Создано {access_created_count} записей доступа для студента {student_id}")
            else:
                logger.info(f"Не создано ни одной записи доступа для студента {student_id}")
                
        except Exception as e:
            logger.error(f"Ошибка при создании доступа для сотрудников к студенту {student_id}: {str(e)}")
            self.db.rollback()
    
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
                    
                    # Для динамических полей факультета/кафедры получаем название по ID
                    if field.name in ['faculty', 'department'] and field_value:
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
                                Department.department_type == 'department'
                            ).first()
                            if dept:
                                field_value = dept.name
                                logger.info(f"Преобразован ID кафедры {field_value} в название: {dept.name}")
                    
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