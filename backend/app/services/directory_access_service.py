from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from datetime import datetime, timedelta

from ..models.user import User
from ..models.department import Department
from ..models.group import Group
from ..models.user_profile import UserProfile
from ..models.directory_access import DirectoryAccess, DirectoryAccessTemplate, AccessType, AccessScope
from ..schemas.directory_access import CheckAccessResponse


class DirectoryAccessService:
    """
    Сервис для работы с доступом к справочникам
    
    Основные функции:
    - Проверка доступа пользователей к подразделениям
    - Наследование прав по иерархии
    - Управление шаблонами доступа
    - Массовое назначение прав
    """

    def __init__(self, db: Session):
        self.db = db

    def check_user_access(
        self, 
        user_id: int, 
        department_id: Optional[int] = None,
        scope: str = "all",
        required_access_type: str = "read"
    ) -> CheckAccessResponse:
        """
        Проверяет доступ пользователя к подразделению
        
        Args:
            user_id: ID пользователя
            department_id: ID подразделения (None = любое)
            scope: Область доступа (students, groups, departments, all)
            required_access_type: Требуемый тип доступа (read, write, admin)
            
        Returns:
            CheckAccessResponse: Результат проверки доступа
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return CheckAccessResponse(
                has_access=False,
                access_type=None,
                restrictions=None,
                source=None,
                department_info=None
            )

        # Проверяем глобальные права администратора
        if 'admin' in user.roles:
            return CheckAccessResponse(
                has_access=True,
                access_type=AccessType.ADMIN,
                restrictions=None,
                source="admin_role",
                department_info=None
            )

        # Получаем все активные права доступа пользователя
        user_accesses = self.db.query(DirectoryAccess).filter(
            DirectoryAccess.user_id == user_id,
            DirectoryAccess.is_active == True
        ).all()

        # Фильтруем действительные права
        valid_accesses = [access for access in user_accesses if access.is_valid()]

        if not valid_accesses:
            return CheckAccessResponse(
                has_access=False,
                access_type=None,
                restrictions=None,
                source=None,
                department_info=None
            )

        # Проверяем доступ к конкретному подразделению или общий доступ
        best_access = None
        best_access_level = 0

        for access in valid_accesses:
            # Проверяем область доступа
            if not access.can_access_scope(scope):
                continue

            # Проверяем доступ к подразделению
            if department_id is not None:
                if not self._can_access_department(access, department_id):
                    continue
            elif access.department_id is not None:
                # Если нужен общий доступ, а у пользователя есть только доступ к конкретному подразделению
                continue

            # Определяем уровень доступа
            access_level = self._get_access_level(access.access_type)
            
            # Выбираем наилучший доступ
            if access_level > best_access_level:
                best_access = access
                best_access_level = access_level

        if not best_access:
            return CheckAccessResponse(
                has_access=False,
                access_type=None,
                restrictions=None,
                source=None,
                department_info=None
            )

        # Проверяем, достаточен ли уровень доступа
        required_level = self._get_access_level(AccessType(required_access_type))
        has_sufficient_access = best_access_level >= required_level

        # Получаем информацию о подразделении
        department_info = None
        if best_access.department_id:
            department = self.db.query(Department).filter(
                Department.id == best_access.department_id
            ).first()
            if department:
                department_info = {
                    "id": department.id,
                    "name": department.name,
                    "short_name": department.short_name,
                    "department_type": department.department_type
                }

        return CheckAccessResponse(
            has_access=has_sufficient_access,
            access_type=best_access.access_type,
            restrictions=best_access.get_restrictions(),
            source="direct_access",
            department_info=department_info
        )

    def _can_access_department(self, access: DirectoryAccess, target_department_id: int) -> bool:
        """
        Проверяет, может ли доступ предоставить права к целевому подразделению
        с учетом наследования
        """
        # Доступ ко всем подразделениям
        if access.department_id is None:
            return True

        # Доступ к конкретному подразделению
        if access.department_id == target_department_id:
            return True

        # Проверяем наследование прав
        if access.inherit_children:
            return self._is_child_department(access.department_id, target_department_id)

        return False

    def _is_child_department(self, parent_id: int, child_id: int) -> bool:
        """
        Проверяет, является ли подразделение дочерним (прямо или косвенно)
        """
        # Получаем целевое подразделение
        child_dept = self.db.query(Department).filter(Department.id == child_id).first()
        if not child_dept:
            return False

        # Проверяем всю иерархию вверх
        current_dept = child_dept
        while current_dept and current_dept.parent_id:
            if current_dept.parent_id == parent_id:
                return True
            current_dept = self.db.query(Department).filter(
                Department.id == current_dept.parent_id
            ).first()

        return False

    def _get_access_level(self, access_type: AccessType) -> int:
        """Возвращает числовой уровень доступа для сравнения"""
        levels = {
            AccessType.READ: 1,
            AccessType.WRITE: 2,
            AccessType.ADMIN: 3
        }
        return levels.get(access_type, 0)

    def get_user_accessible_departments(
        self, 
        user_id: int, 
        scope: Optional[str] = None,
        include_inherited: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Получает список подразделений, к которым у пользователя есть доступ
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return []

        # Администраторы имеют доступ ко всем подразделениям
        if 'admin' in user.roles:
            departments = self.db.query(Department).filter(
                Department.is_active == True
            ).all()
            return [
                {
                    "id": dept.id,
                    "name": dept.name,
                    "short_name": dept.short_name,
                    "department_type": dept.department_type,
                    "access_type": "admin",
                    "scope": "all",
                    "source": "admin_role"
                }
                for dept in departments
            ]

        # Получаем права доступа пользователя
        user_accesses = self.db.query(DirectoryAccess).filter(
            DirectoryAccess.user_id == user_id,
            DirectoryAccess.is_active == True
        ).all()

        # Фильтруем действительные права
        valid_accesses = [access for access in user_accesses if access.is_valid()]

        accessible_departments = []
        processed_dept_ids = set()

        for access in valid_accesses:
            # Проверяем область доступа
            if scope and not access.can_access_scope(scope):
                continue

            # Доступ ко всем подразделениям
            if access.department_id is None:
                all_departments = self.db.query(Department).filter(
                    Department.is_active == True
                ).all()
                for dept in all_departments:
                    if dept.id not in processed_dept_ids:
                        accessible_departments.append({
                            "id": dept.id,
                            "name": dept.name,
                            "short_name": dept.short_name,
                            "department_type": dept.department_type,
                            "access_type": access.access_type.value,
                            "scope": access.scope.value,
                            "source": "global_access"
                        })
                        processed_dept_ids.add(dept.id)
                continue

            # Доступ к конкретному подразделению
            department = self.db.query(Department).filter(
                Department.id == access.department_id
            ).first()
            
            if department and department.id not in processed_dept_ids:
                accessible_departments.append({
                    "id": department.id,
                    "name": department.name,
                    "short_name": department.short_name,
                    "department_type": department.department_type,
                    "access_type": access.access_type.value,
                    "scope": access.scope.value,
                    "source": "direct_access"
                })
                processed_dept_ids.add(department.id)

            # Наследование прав на дочерние подразделения
            if include_inherited and access.inherit_children:
                child_departments = self._get_child_departments(access.department_id)
                for child_dept in child_departments:
                    if child_dept.id not in processed_dept_ids:
                        accessible_departments.append({
                            "id": child_dept.id,
                            "name": child_dept.name,
                            "short_name": child_dept.short_name,
                            "department_type": child_dept.department_type,
                            "access_type": access.access_type.value,
                            "scope": access.scope.value,
                            "source": "inherited_access"
                        })
                        processed_dept_ids.add(child_dept.id)

        return accessible_departments

    def _get_child_departments(self, parent_id: int) -> List[Department]:
        """
        Получает все дочерние подразделения (прямые и косвенные)
        """
        all_children = []
        
        # Получаем прямых детей
        direct_children = self.db.query(Department).filter(
            Department.parent_id == parent_id,
            Department.is_active == True
        ).all()
        
        for child in direct_children:
            all_children.append(child)
            # Рекурсивно получаем детей детей
            all_children.extend(self._get_child_departments(child.id))
        
        return all_children

    def create_access(
        self,
        user_id: int,
        department_id: Optional[int],
        access_type: AccessType,
        scope: AccessScope,
        granted_by: int,
        inherit_children: bool = True,
        restrictions: Optional[Dict[str, Any]] = None,
        description: Optional[str] = None,
        expires_at: Optional[datetime] = None
    ) -> DirectoryAccess:
        """
        Создает новую запись доступа
        """
        access = DirectoryAccess(
            user_id=user_id,
            department_id=department_id,
            access_type=access_type,
            scope=scope,
            inherit_children=inherit_children,
            restrictions=restrictions,
            description=description,
            expires_at=expires_at,
            granted_by=granted_by
        )
        
        self.db.add(access)
        self.db.commit()
        self.db.refresh(access)
        
        return access

    def bulk_assign_access(
        self,
        user_ids: List[int],
        department_ids: Optional[List[int]],
        access_type: AccessType,
        scope: AccessScope,
        granted_by: int,
        inherit_children: bool = True,
        restrictions: Optional[Dict[str, Any]] = None,
        description: Optional[str] = None,
        expires_at: Optional[datetime] = None
    ) -> Tuple[List[DirectoryAccess], List[str]]:
        """
        Массовое назначение доступа
        
        Returns:
            Tuple[List[DirectoryAccess], List[str]]: (созданные доступы, ошибки)
        """
        created_accesses = []
        errors = []

        # Если department_ids не указаны, создаем глобальный доступ
        if not department_ids:
            department_ids = [None]

        for user_id in user_ids:
            for department_id in department_ids:
                try:
                    # Проверяем, не существует ли уже такой доступ
                    existing_access = self.db.query(DirectoryAccess).filter(
                        DirectoryAccess.user_id == user_id,
                        DirectoryAccess.department_id == department_id,
                        DirectoryAccess.scope == scope,
                        DirectoryAccess.is_active == True
                    ).first()

                    if existing_access:
                        errors.append(f"Пользователь {user_id} уже имеет доступ к подразделению {department_id}")
                        continue

                    access = self.create_access(
                        user_id=user_id,
                        department_id=department_id,
                        access_type=access_type,
                        scope=scope,
                        granted_by=granted_by,
                        inherit_children=inherit_children,
                        restrictions=restrictions,
                        description=description,
                        expires_at=expires_at
                    )
                    created_accesses.append(access)
                    
                except Exception as e:
                    errors.append(f"Ошибка при создании доступа для пользователя {user_id}: {str(e)}")

        return created_accesses, errors

    def apply_template(
        self,
        template_id: int,
        user_ids: List[int],
        department_ids: Optional[List[int]],
        granted_by: int,
        override_settings: Optional[Dict[str, Any]] = None
    ) -> Tuple[List[DirectoryAccess], List[str]]:
        """
        Применяет шаблон доступа к пользователям
        """
        template = self.db.query(DirectoryAccessTemplate).filter(
            DirectoryAccessTemplate.id == template_id,
            DirectoryAccessTemplate.is_active == True
        ).first()

        if not template:
            return [], ["Шаблон не найден"]

        # Если department_ids не указаны, создаем глобальный доступ
        if not department_ids:
            department_ids = [None]

        # Применяем переопределения настроек
        access_type = template.access_type
        scope = template.scope
        inherit_children = template.inherit_children
        restrictions = template.restrictions

        if override_settings:
            access_type = AccessType(override_settings.get('access_type', access_type.value))
            scope = AccessScope(override_settings.get('scope', scope.value))
            inherit_children = override_settings.get('inherit_children', inherit_children)
            if 'restrictions' in override_settings:
                restrictions = override_settings['restrictions']

        return self.bulk_assign_access(
            user_ids=user_ids,
            department_ids=department_ids,
            access_type=access_type,
            scope=scope,
            granted_by=granted_by,
            inherit_children=inherit_children,
            restrictions=restrictions,
            description=f"Доступ по шаблону '{template.name}'"
        )

    def get_access_statistics(self) -> Dict[str, Any]:
        """
        Получает статистику доступа
        """
        # Общая статистика
        total_accesses = self.db.query(DirectoryAccess).count()
        active_accesses = self.db.query(DirectoryAccess).filter(
            DirectoryAccess.is_active == True
        ).count()
        
        # Просроченные доступы
        expired_accesses = self.db.query(DirectoryAccess).filter(
            DirectoryAccess.expires_at < datetime.utcnow(),
            DirectoryAccess.is_active == True
        ).count()

        # Статистика по типам доступа
        access_type_stats = {}
        for access_type in AccessType:
            count = self.db.query(DirectoryAccess).filter(
                DirectoryAccess.access_type == access_type,
                DirectoryAccess.is_active == True
            ).count()
            access_type_stats[access_type.value] = count

        # Статистика по областям доступа
        scope_stats = {}
        for scope in AccessScope:
            count = self.db.query(DirectoryAccess).filter(
                DirectoryAccess.scope == scope,
                DirectoryAccess.is_active == True
            ).count()
            scope_stats[scope.value] = count

        # Статистика по подразделениям
        department_stats = self.db.query(
            Department.name,
            Department.short_name,
            func.count(DirectoryAccess.id).label('access_count')
        ).join(
            DirectoryAccess, Department.id == DirectoryAccess.department_id
        ).filter(
            DirectoryAccess.is_active == True
        ).group_by(Department.id, Department.name, Department.short_name).all()

        # Недавние изменения
        recent_changes = self.db.query(DirectoryAccess).filter(
            DirectoryAccess.updated_at >= datetime.utcnow() - timedelta(days=7)
        ).order_by(DirectoryAccess.updated_at.desc()).limit(10).all()

        return {
            "total_accesses": total_accesses,
            "active_accesses": active_accesses,
            "expired_accesses": expired_accesses,
            "by_access_type": access_type_stats,
            "by_scope": scope_stats,
            "by_department": [
                {
                    "name": stat.name,
                    "short_name": stat.short_name,
                    "access_count": stat.access_count
                }
                for stat in department_stats
            ],
            "recent_changes": [
                {
                    "id": access.id,
                    "user_id": access.user_id,
                    "department_id": access.department_id,
                    "access_type": access.access_type.value,
                    "updated_at": access.updated_at.isoformat()
                }
                for access in recent_changes
            ]
        } 