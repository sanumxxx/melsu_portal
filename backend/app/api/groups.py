from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from ..database import get_db
from ..models.group import Group
from ..models.department import Department
from ..schemas.group import GroupCreate, GroupUpdate, GroupResponse
from ..dependencies import get_current_user, UserInfo

router = APIRouter(prefix="/groups", tags=["Groups"])

@router.post("/", response_model=GroupResponse)
async def create_group(
    group: GroupCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Создать новую группу"""
    if 'admin' not in current_user.roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав")
    
    # Проверяем существование подразделения, если указано
    if group.department_id:
        department = db.query(Department).filter(Department.id == group.department_id).first()
        if not department:
            raise HTTPException(status_code=404, detail="Подразделение не найдено")
    
    db_group = Group(**group.dict())
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return db_group

@router.get("/", response_model=List[GroupResponse])
async def get_groups(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получить список всех групп"""
    groups = db.query(Group).options(joinedload(Group.department)).order_by(Group.name).all()
    return groups

@router.get("/{group_id}", response_model=GroupResponse)
async def get_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получить группу по ID"""
    group = db.query(Group).options(joinedload(Group.department)).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Группа не найдена")
    return group

@router.put("/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: int,
    group_update: GroupUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Обновить группу"""
    if 'admin' not in current_user.roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав")
    
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Группа не найдена")
    
    # Проверяем существование подразделения, если оно изменяется
    if group_update.department_id is not None:
        department = db.query(Department).filter(Department.id == group_update.department_id).first()
        if not department:
            raise HTTPException(status_code=404, detail="Подразделение не найдено")
    
    for key, value in group_update.dict(exclude_unset=True).items():
        setattr(group, key, value)
    
    db.commit()
    db.refresh(group)
    return group

@router.delete("/{group_id}")
async def delete_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Удалить группу"""
    if 'admin' not in current_user.roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав")
    
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Группа не найдена")
    
    # Проверяем, есть ли студенты в этой группе
    from ..models.user_profile import UserProfile
    students_count = db.query(UserProfile).filter(UserProfile.group_id == group_id).count()
    if students_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Нельзя удалить группу: в ней состоит {students_count} студентов"
        )
    
    db.delete(group)
    db.commit()
    return {"message": "Группа удалена"} 