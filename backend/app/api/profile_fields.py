"""
API для работы с полями профиля пользователя.
Предоставляет информацию о доступных полях для связывания с полями заявок.
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, List, Any
from ..dependencies import get_current_user
from ..utils.profile_fields import (
    get_profile_fields_grouped,
    get_profile_fields_list,
    get_profile_field_info,
    validate_profile_field_mapping
)

router = APIRouter()

@router.get("/profile-fields", response_model=List[Dict[str, Any]])
async def get_profile_fields(
    current_user = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Получить список всех доступных полей профиля для связывания.
    
    Требует авторизации. Только администраторы могут настраивать связи полей.
    
    Returns:
        List со всеми доступными полями профиля
    """
    # Проверяем права доступа (только администраторы могут управлять полями)
    user_roles = current_user.roles or []
    if "admin" not in user_roles:
        raise HTTPException(
            status_code=403,
            detail="Недостаточно прав для просмотра полей профиля"
        )
    
    return get_profile_fields_list()


@router.get("/profile-fields/grouped", response_model=Dict[str, List[Dict[str, Any]]])
async def get_profile_fields_grouped_api(
    current_user = Depends(get_current_user)
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Получить поля профиля, сгруппированные по категориям.
    
    Требует авторизации. Только администраторы могут настраивать связи полей.
    
    Returns:
        Dict с полями профиля, сгруппированными по категориям
    """
    # Проверяем права доступа
    user_roles = current_user.roles or []
    if "admin" not in user_roles:
        raise HTTPException(
            status_code=403,
            detail="Недостаточно прав для просмотра полей профиля"
        )
    
    return get_profile_fields_grouped()


@router.get("/profile-fields/{field_name}", response_model=Dict[str, Any])
async def get_profile_field_info_api(
    field_name: str,
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Получить информацию о конкретном поле профиля.
    
    Args:
        field_name: Имя поля профиля
        
    Returns:
        Dict с информацией о поле
        
    Raises:
        HTTPException: Если поле не найдено или нет прав доступа
    """
    # Проверяем права доступа
    user_roles = current_user.roles or []
    if "admin" not in user_roles:
        raise HTTPException(
            status_code=403,
            detail="Недостаточно прав для просмотра полей профиля"
        )
    
    field_info = get_profile_field_info(field_name)
    if not field_info:
        raise HTTPException(
            status_code=404,
            detail=f"Поле профиля '{field_name}' не найдено"
        )
    
    return field_info


@router.post("/profile-fields/validate/{field_name}")
async def validate_profile_field(
    field_name: str,
    current_user = Depends(get_current_user)
) -> Dict[str, bool]:
    """
    Проверить, можно ли связать указанное поле профиля с полем заявки.
    
    Args:
        field_name: Имя поля профиля
        
    Returns:
        Dict с результатом валидации
    """
    # Проверяем права доступа
    user_roles = current_user.roles or []
    if "admin" not in user_roles:
        raise HTTPException(
            status_code=403,
            detail="Недостаточно прав для валидации полей профиля"
        )
    
    is_valid = validate_profile_field_mapping(field_name)
    
    return {
        "field_name": field_name,
        "is_valid": is_valid,
        "can_map": is_valid
    } 