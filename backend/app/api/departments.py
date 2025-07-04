from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models.department import Department
from ..models.user import User
from ..models.user_assignment import UserDepartmentAssignment
from ..models.role import Role
from ..schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentResponse, DepartmentTree
from ..dependencies import get_current_user, UserInfo

router = APIRouter()

def build_department_tree(departments: List[Department], parent_id: Optional[int] = None) -> List[DepartmentTree]:
    """Рекурсивно строит дерево подразделений"""
    tree = []
    for dept in departments:
        if dept.parent_id == parent_id:
            dept_dict = dept.to_dict()
            dept_tree = DepartmentTree(**dept_dict)
            dept_tree.children = build_department_tree(departments, dept.id)
            tree.append(dept_tree)
    
    # Сортируем по sort_order, затем по имени
    tree.sort(key=lambda x: (x.sort_order, x.name))
    return tree

@router.get("/departments/tree", response_model=List[DepartmentTree])
async def get_departments_tree(
    include_inactive: bool = False,
    db: Session = Depends(get_db)
):
    """
    Получить структуру университета в виде дерева
    """
    query = db.query(Department)
    if not include_inactive:
        query = query.filter(Department.is_active == True)
    
    departments = query.all()
    return build_department_tree(departments)

@router.get("/departments", response_model=List[DepartmentResponse])
async def get_departments(
    parent_id: Optional[int] = None,
    department_type: Optional[str] = None,
    include_inactive: bool = False,
    db: Session = Depends(get_db)
):
    """
    Получить список подразделений с фильтрацией
    """
    query = db.query(Department)
    
    if parent_id is not None:
        query = query.filter(Department.parent_id == parent_id)
    
    if department_type:
        query = query.filter(Department.department_type == department_type)
    
    if not include_inactive:
        query = query.filter(Department.is_active == True)
    
    departments = query.order_by(Department.sort_order, Department.name).all()
    
    return [DepartmentResponse(**dept.to_dict()) for dept in departments]

@router.get("/departments/{department_id}", response_model=DepartmentResponse)
async def get_department(department_id: int, db: Session = Depends(get_db)):
    """
    Получить информацию о конкретном подразделении
    """
    department = db.query(Department).filter(Department.id == department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Подразделение не найдено")
    
    return DepartmentResponse(**department.to_dict())

@router.post("/departments", response_model=DepartmentResponse)
async def create_department(
    department_data: DepartmentCreate,
    db: Session = Depends(get_db)
):
    """
    Создать новое подразделение
    """
    # Проверяем родительское подразделение если указано
    if department_data.parent_id:
        parent = db.query(Department).filter(Department.id == department_data.parent_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Родительское подразделение не найдено")
        level = parent.level + 1
    else:
        level = 0
    
    # Создаем подразделение
    department = Department(
        **department_data.dict(),
        level=level
    )
    
    db.add(department)
    db.commit()
    db.refresh(department)
    
    return DepartmentResponse(**department.to_dict())

@router.put("/departments/{department_id}", response_model=DepartmentResponse)
async def update_department(
    department_id: int,
    department_data: DepartmentUpdate,
    db: Session = Depends(get_db)
):
    """
    Обновить подразделение
    """
    department = db.query(Department).filter(Department.id == department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Подразделение не найдено")
    
    # Обновляем только переданные поля
    update_data = department_data.dict(exclude_unset=True)
    
    # Если изменяется родитель, пересчитываем level
    if 'parent_id' in update_data:
        if update_data['parent_id']:
            parent = db.query(Department).filter(Department.id == update_data['parent_id']).first()
            if not parent:
                raise HTTPException(status_code=404, detail="Родительское подразделение не найдено")
            
            # Проверяем, что не создается циклическая зависимость
            if parent.id == department.id:
                raise HTTPException(status_code=400, detail="Подразделение не может быть родителем самому себе")
            
            update_data['level'] = parent.level + 1
        else:
            update_data['level'] = 0
    
    for field, value in update_data.items():
        setattr(department, field, value)
    
    db.commit()
    db.refresh(department)
    
    # Если изменился уровень, обновляем уровни дочерних элементов
    if 'parent_id' in update_data:
        update_children_levels(department, db)
    
    return DepartmentResponse(**department.to_dict())

@router.delete("/departments/{department_id}")
async def delete_department(department_id: int, db: Session = Depends(get_db)):
    """
    Удалить подразделение
    """
    department = db.query(Department).filter(Department.id == department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Подразделение не найдено")
    
    # Проверяем наличие дочерних подразделений
    children_count = db.query(Department).filter(Department.parent_id == department_id).count()
    if children_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Нельзя удалить подразделение с дочерними элементами ({children_count} шт.)"
        )
    
    db.delete(department)
    db.commit()
    
    return {"message": "Подразделение успешно удалено"}

@router.post("/departments/{department_id}/move")
async def move_department(
    department_id: int,
    new_parent_id: Optional[int],
    new_sort_order: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Переместить подразделение в другое место дерева
    """
    department = db.query(Department).filter(Department.id == department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Подразделение не найдено")
    
    # Проверяем новый родитель
    if new_parent_id:
        new_parent = db.query(Department).filter(Department.id == new_parent_id).first()
        if not new_parent:
            raise HTTPException(status_code=404, detail="Новое родительское подразделение не найдено")
        
        # Проверяем циклические зависимости
        if is_descendant(new_parent, department, db):
            raise HTTPException(
                status_code=400, 
                detail="Нельзя переместить подразделение в своего потомка"
            )
        
        new_level = new_parent.level + 1
    else:
        new_level = 0
    
    # Обновляем позицию
    department.parent_id = new_parent_id
    department.level = new_level
    
    if new_sort_order is not None:
        department.sort_order = new_sort_order
    
    db.commit()
    
    # Обновляем уровни всех потомков
    update_children_levels(department, db)
    
    return {"message": "Подразделение успешно перемещено"}

def update_children_levels(department: Department, db: Session):
    """Рекурсивно обновляет уровни всех дочерних подразделений"""
    children = db.query(Department).filter(Department.parent_id == department.id).all()
    for child in children:
        child.level = department.level + 1
        db.add(child)
        update_children_levels(child, db)
    db.commit()

def is_descendant(potential_ancestor: Department, potential_descendant: Department, db: Session) -> bool:
    """Проверяет, является ли potential_ancestor потомком potential_descendant"""
    if potential_ancestor.parent_id is None:
        return False
    
    if potential_ancestor.parent_id == potential_descendant.id:
        return True
    
    parent = db.query(Department).filter(Department.id == potential_ancestor.parent_id).first()
    if parent:
        return is_descendant(parent, potential_descendant, db)
    
    return False

@router.get("/departments/types")
async def get_department_types():
    """
    Получить список доступных типов подразделений
    """
    return {
        "types": [
            {"value": "university", "label": "Университет"},
            {"value": "rectorate", "label": "Ректорат"},
            {"value": "institute", "label": "Институт"},
            {"value": "faculty", "label": "Факультет"},
            {"value": "department", "label": "Кафедра"},
            {"value": "chair", "label": "Отдел"},
            {"value": "management", "label": "Управление"},
            {"value": "directorate", "label": "Департамент"},
            {"value": "lab", "label": "Лаборатория"},
            {"value": "center", "label": "Центр"},
            {"value": "service", "label": "Служба"},
            {"value": "sector", "label": "Сектор"},
            {"value": "group", "label": "Группа"}
        ]
    }

@router.get("/departments/{department_id}/employees")
async def get_department_employees(
    department_id: int, 
    db: Session = Depends(get_db)
):
    """
    Получить список сотрудников подразделения
    """
    department = db.query(Department).filter(Department.id == department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Подразделение не найдено")
    
    # Получаем сотрудников с профилями, где department_id = department_id
    employees = db.query(User, UserProfile).join(
        UserProfile, User.id == UserProfile.user_id
    ).filter(
        UserProfile.department_id == department_id,
        User.is_active == True
    ).all()
    
    employee_list = []
    for user, profile in employees:
        # Получаем название роли через отдельный запрос
                    # Старая логика роли в подразделении удалена - используйте assignments
        
        employee_data = {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "middle_name": user.middle_name,
            "roles": user.roles,
            # Старое поле department_role удалено - используйте assignments
            "position": profile.position,
            "phone": profile.phone
        }
        employee_list.append(employee_data)
    
    return {
        "department_id": department_id,
        "department_name": department.name,
        "employees": employee_list,
        "total_count": len(employee_list)
    }

@router.get("/faculties")
async def get_faculties(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получить список факультетов"""
    faculties = db.query(Department).filter(
        Department.department_type == 'faculty',
        Department.is_active == True
    ).order_by(Department.name).all()
    
    return [
        {
            "id": faculty.id,
            "name": faculty.name,
            "short_name": faculty.short_name,
            "department_type": faculty.department_type
        }
        for faculty in faculties
    ]

@router.get("/chairs")
async def get_chairs(
    faculty_id: Optional[int] = Query(None, description="Фильтр по факультету"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получить список кафедр"""
    query = db.query(Department).filter(
        Department.department_type.in_(['chair', 'department']),
        Department.is_active == True
    )
    
    if faculty_id:
        query = query.filter(Department.parent_id == faculty_id)
    
    chairs = query.order_by(Department.name).all()
    
    return [
        {
            "id": chair.id,
            "name": chair.name,
            "short_name": chair.short_name,
            "department_type": chair.department_type,
            "parent_id": chair.parent_id
        }
        for chair in chairs
    ] 