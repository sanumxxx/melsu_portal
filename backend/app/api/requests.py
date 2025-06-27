from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, cast, text
from typing import List, Optional
from datetime import datetime, timedelta
import json
from ..database import get_db
from ..models import Request, RequestTemplate, User, RequestComment, RequestStatus
from ..schemas import (
    Request as RequestSchema, 
    RequestCreate, 
    RequestUpdate, 
    RequestAssign,
    RequestList,
    RequestComment as RequestCommentSchema,
    RequestCommentCreate
)
from ..dependencies import get_current_user, UserInfo
from ..services.profile_update_service import ProfileUpdateService

# WebSocket уведомления
from .websocket import notify_request_assigned, notify_request_updated

router = APIRouter()

# ===========================================
# ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ===========================================

def apply_routing_rules(template, form_data):
    """
    Применяет правила маршрутизации к данным формы
    Возвращает список подходящих ответственных или None
    """
    if not template.routing_rules:
        return None
    
    # Проходим по всем правилам
    for rule in template.routing_rules:
        field_name = rule.get('field')
        expected_value = rule.get('value')
        assignees = rule.get('assignees', [])
        
        # Получаем значение поля из данных формы
        actual_value = form_data.get(field_name)
        
        # Проверяем совпадение (приводим к строке для сравнения)
        if str(actual_value).lower() == str(expected_value).lower():
            return assignees
    
    return None

# ===========================================
# СОЗДАНИЕ И ПРОСМОТР ЗАЯВОК
# ===========================================

@router.get("/my", response_model=List[RequestList])
async def get_my_requests(
    status: Optional[str] = Query(None, description="Фильтр по статусу"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получение заявок текущего пользователя"""
    query = db.query(Request).options(
        joinedload(Request.author),
        joinedload(Request.assignee),
        joinedload(Request.template)
    ).filter(Request.author_id == current_user.id)
    
    if status:
        try:
            status_enum = RequestStatus(status)
            query = query.filter(Request.status == status_enum.value)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Недопустимый статус: {status}"
            )
    
    requests = query.order_by(Request.created_at.desc()).all()
    
    # Преобразуем в RequestList schema с template_name
    result = []
    for req in requests:
        req_dict = req.__dict__.copy()
        # Удаляем поля, которые будем передавать отдельно
        req_dict.pop('author', None)
        req_dict.pop('assignee', None) 
        req_dict.pop('template', None)
        req_dict['template_name'] = req.template.name
        result.append(RequestList(**req_dict, author=req.author, assignee=req.assignee))
    
    return result

@router.get("/assigned", response_model=List[RequestList])
async def get_assigned_requests(
    status: Optional[str] = Query(None, description="Фильтр по статусу"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получение заявок назначенных текущему пользователю"""
    query = db.query(Request).options(
        joinedload(Request.author),
        joinedload(Request.assignee),
        joinedload(Request.template)
    ).filter(
        or_(
            Request.assignee_id == current_user.id,  # Назначенные заявки
            text(f"requests.possible_assignees::jsonb @> '[{current_user.id}]'::jsonb")  # Возможные заявки (JSON contains)
        )
    )
    
    if status:
        try:
            status_enum = RequestStatus(status)
            query = query.filter(Request.status == status_enum.value)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Недопустимый статус: {status}"
            )
    
    requests = query.order_by(Request.created_at.desc()).all()
    
    # Преобразуем в RequestList schema с template_name
    result = []
    for req in requests:
        req_dict = req.__dict__.copy()
        # Удаляем поля, которые будем передавать отдельно
        req_dict.pop('author', None)
        req_dict.pop('assignee', None)
        req_dict.pop('template', None)
        req_dict['template_name'] = req.template.name
        result.append(RequestList(**req_dict, author=req.author, assignee=req.assignee))
    
    return result

@router.post("/", response_model=RequestSchema)
async def create_request(
    request_data: RequestCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Создание новой заявки"""
    # Проверяем существование шаблона
    template = db.query(RequestTemplate).filter(
        RequestTemplate.id == request_data.template_id,
        RequestTemplate.is_active == True
    ).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Шаблон заявки не найден или неактивен"
        )
    
    # Вычисляем дедлайн
    deadline = datetime.utcnow() + timedelta(days=template.deadline_days)
    
    # Создаем заявку всегда как черновик
    db_request = Request(
        template_id=request_data.template_id,
        author_id=current_user.id,
        assignee_id=None,  # При создании ответственный не назначается
        title=request_data.title,
        description=request_data.description,
        form_data=request_data.form_data,
        deadline=deadline,
        status=RequestStatus.DRAFT.value,  # Всегда черновик при создании
        submitted_at=None  # Время отправки не устанавливается
    )
    
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    
    # Загружаем связанные данные
    db_request = db.query(Request).options(
        joinedload(Request.author),
        joinedload(Request.assignee),
        joinedload(Request.comments).joinedload(RequestComment.user)
    ).filter(Request.id == db_request.id).first()
    
    return db_request

@router.get("/{request_id}", response_model=RequestSchema)
async def get_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получение заявки по ID"""
    request = db.query(Request).options(
        joinedload(Request.author),
        joinedload(Request.assignee),
        joinedload(Request.comments).joinedload(RequestComment.user),
        joinedload(Request.template)
    ).filter(Request.id == request_id).first()
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Заявка не найдена"
        )
    
    # Проверяем права доступа
    has_access = (
        request.author_id == current_user.id or  # Автор заявки
        request.assignee_id == current_user.id or  # Текущий исполнитель
        (request.possible_assignees and current_user.id in request.possible_assignees) or  # Возможный исполнитель
        "admin" in (current_user.roles if hasattr(current_user, 'roles') else [])  # Админ
    )
    
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ запрещен"
        )
    
    return request

# ===========================================
# УПРАВЛЕНИЕ ЗАЯВКАМИ
# ===========================================

@router.put("/{request_id}", response_model=RequestSchema)
async def update_request(
    request_id: int,
    request_update: RequestUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Обновление заявки"""
    request = db.query(Request).filter(Request.id == request_id).first()
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Заявка не найдена"
        )
    
    # Проверяем права на редактирование
    can_edit = (
        request.author_id == current_user.id or  # Автор
        request.assignee_id == current_user.id or  # Исполнитель
        "admin" in (current_user.roles if hasattr(current_user, 'roles') else [])  # Админ
    )
    
    if not can_edit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для редактирования заявки"
        )
    
    # Проверяем, изменяется ли статус на IN_REVIEW из DRAFT
    old_status = request.status
    
    is_submitting = (
        hasattr(request_update, 'status') and 
        request_update.status == RequestStatus.IN_REVIEW.value and 
        old_status == RequestStatus.DRAFT.value
    )
    
    # Проверяем, завершается ли заявка
    is_completing = (
        hasattr(request_update, 'status') and 
        (request_update.status == RequestStatus.COMPLETED.value or 
         request_update.status == RequestStatus.COMPLETED) and 
        old_status != RequestStatus.COMPLETED.value
    )
    
    # Обновляем поля
    update_data = request_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        # Специальная обработка для enum статуса
        if field == 'status' and isinstance(value, RequestStatus):
            value = value.value
        setattr(request, field, value)
    
    request.updated_at = datetime.utcnow()
    
    # Если заявка отправляется (DRAFT -> SUBMITTED)
    if is_submitting:
        request.submitted_at = datetime.utcnow()
        
        # Автоназначение ответственного если настроено
        template = db.query(RequestTemplate).filter(RequestTemplate.id == request.template_id).first()
        if template and template.auto_assign_enabled and template.default_assignees:
            routing_type = template.routing_type
            
            if routing_type == "auto_assign":
                # Случайное назначение из списка
                import random
                request.assignee_id = random.choice(template.default_assignees)
                
            elif routing_type == "round_robin":
                # Назначение по очереди (упрощенная версия - берем первого)
                # В реальной системе здесь должна быть логика подсчета нагрузки
                request.assignee_id = template.default_assignees[0]
    
    # Если заявка завершается - обновляем профиль
    if is_completing:
        try:
            profile_service = ProfileUpdateService(db)
            result = profile_service.update_profile_on_approve(request.id)
            if result.get('updated_fields'):
                print(f"DEBUG: Обновлены поля профиля при завершении заявки: {result['updated_fields']}")
            if result.get('errors'):
                print(f"WARNING: Ошибки при обновлении профиля при завершении заявки: {result['errors']}")
        except Exception as e:
            print(f"ERROR: Ошибка при обновлении профиля при завершении заявки: {str(e)}")
    
    db.commit()
    db.refresh(request)
    
    # Загружаем связанные данные
    request = db.query(Request).options(
        joinedload(Request.author),
        joinedload(Request.assignee),
        joinedload(Request.comments).joinedload(RequestComment.user)
    ).filter(Request.id == request.id).first()
    
    return request

@router.post("/{request_id}/submit", response_model=RequestSchema)
async def submit_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Отправка заявки на рассмотрение"""
    request = db.query(Request).filter(Request.id == request_id).first()
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Заявка не найдена"
        )
    
    # Проверяем права на отправку (только автор)
    if request.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Только автор может отправить заявку"
        )
    
    # Проверяем, что заявка в статусе черновика
    if request.status != RequestStatus.DRAFT.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Можно отправлять только заявки в статусе черновика"
        )
    
    # Отправляем заявку сразу на рассмотрение
    request.status = RequestStatus.IN_REVIEW.value
    request.submitted_at = datetime.utcnow()
    request.updated_at = datetime.utcnow()
    
    # Автоназначение ответственного
    template = db.query(RequestTemplate).filter(RequestTemplate.id == request.template_id).first()
    
    if template and template.auto_assign_enabled:
        # Шаг 1: Проверяем правила условной маршрутизации
        routing_assignees = apply_routing_rules(template, request.form_data)
        
        if routing_assignees:
            # Используем ответственных из правил маршрутизации
            request.possible_assignees = routing_assignees
            request.assignee_id = None  # Не назначаем конкретного, оставляем всем
            
        elif template.default_assignees:
            # Fallback на стандартную логику если правила не сработали
            request.possible_assignees = template.default_assignees
            request.assignee_id = None  # Не назначаем конкретного, оставляем всем
        else:
            print("DEBUG: Нет ни правил маршрутизации, ни default_assignees")
    else:
        print("DEBUG: Автоназначение НЕ активировано")
    
    # Обновляем профиль пользователя на основе полей с update_profile_on_submit=true
    try:
        profile_service = ProfileUpdateService(db)
        result = profile_service.update_profile_on_submit(request.id, request.form_data)
        if result.get('updated_fields'):
            print(f"DEBUG: Обновлены поля профиля при подаче заявки: {result['updated_fields']}")
        if result.get('errors'):
            print(f"WARNING: Ошибки при обновлении профиля при подаче заявки: {result['errors']}")
    except Exception as e:
        print(f"ERROR: Ошибка при обновлении профиля при подаче заявки: {str(e)}")
    
    db.commit()
    db.refresh(request)
    
    # Отправляем WebSocket уведомления возможным исполнителям
    if request.possible_assignees:
        request_data = {
            'id': request.id,
            'title': request.title,
            'description': request.description,
            'status': request.status,
            'priority': getattr(request, 'priority', 'medium'),
            'author_name': f"{request.author.first_name} {request.author.last_name}" if request.author else "Неизвестный",
            'created_at': request.created_at.isoformat() if request.created_at else None
        }
        
        for assignee_id in request.possible_assignees:
            # Отправляем уведомление асинхронно (не блокируем основной поток)
            try:
                import asyncio
                asyncio.create_task(notify_request_assigned(request.id, assignee_id, request_data))
            except Exception as e:
                print(f"Ошибка отправки WebSocket уведомления для пользователя {assignee_id}: {e}")
    
    # Загружаем связанные данные
    request = db.query(Request).options(
        joinedload(Request.author),
        joinedload(Request.assignee),
        joinedload(Request.comments).joinedload(RequestComment.user)
    ).filter(Request.id == request.id).first()
    
    return request

@router.post("/{request_id}/assign", response_model=RequestSchema)
async def assign_request(
    request_id: int,
    assign_data: RequestAssign,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Назначение ответственного за заявку"""
    request = db.query(Request).filter(Request.id == request_id).first()
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Заявка не найдена"
        )
    
    # Проверяем права на назначение (только админы или текущий исполнитель)
    can_assign = (
        request.assignee_id == current_user.id or  # Текущий исполнитель
        "admin" in (current_user.roles if hasattr(current_user, 'roles') else [])  # Админ
    )
    
    if not can_assign:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для назначения исполнителя"
        )
    
    # Проверяем существование пользователя
    assignee = db.query(User).filter(User.id == assign_data.assignee_id).first()
    if not assignee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    # Назначаем исполнителя
    request.assignee_id = assign_data.assignee_id
    request.updated_at = datetime.utcnow()
    
    # Заявка остается в том же статусе при смене ответственного
    # (логика изменена - заявки сразу идут в IN_REVIEW при отправке)
    
    db.commit()
    db.refresh(request)
    
    # Загружаем связанные данные
    request = db.query(Request).options(
        joinedload(Request.author),
        joinedload(Request.assignee),
        joinedload(Request.comments).joinedload(RequestComment.user)
    ).filter(Request.id == request.id).first()
    
    return request

@router.post("/{request_id}/take", response_model=RequestSchema)
async def take_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Взять заявку в работу"""
    request = db.query(Request).filter(Request.id == request_id).first()
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Заявка не найдена"
        )
    
    # Проверяем, что пользователь может взять заявку
    can_take = (
        # Пользователь в списке возможных исполнителей
        (request.possible_assignees and current_user.id in request.possible_assignees) or
        # Или уже назначенный исполнитель (для повторных действий)
        request.assignee_id == current_user.id or
        # Или админ
        "admin" in (current_user.roles if hasattr(current_user, 'roles') else [])
    )
    
    if not can_take:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="У вас нет прав для взятия этой заявки в работу"
        )
    
    # Проверяем статус заявки
    if request.status not in [RequestStatus.IN_REVIEW.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя взять в работу заявку в текущем статусе"
        )
    
    # Проверяем, что заявка еще не взята кем-то другим
    if request.assignee_id and request.assignee_id != current_user.id:
        assigned_user = db.query(User).filter(User.id == request.assignee_id).first()
        assigned_name = f"{assigned_user.first_name} {assigned_user.last_name}" if assigned_user else "Неизвестный"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Заявка уже взята в работу пользователем: {assigned_name}"
        )
    
    # Берем заявку в работу
    request.assignee_id = current_user.id
    request.status = RequestStatus.APPROVED.value  # Меняем статус на "Взят в работу"
    request.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(request)
    
    # Отправляем WebSocket уведомление автору заявки
    if request.author_id:
        request_data = {
            'id': request.id,
            'title': request.title,
            'description': request.description,
            'status': request.status,
            'assignee_name': f"{current_user.first_name} {current_user.last_name}" if current_user.first_name else current_user.email,
            'updated_at': request.updated_at.isoformat() if request.updated_at else None
        }
        
        try:
            import asyncio
            asyncio.create_task(notify_request_updated(
                request.id, 
                [request.author_id], 
                request_data, 
                old_status=RequestStatus.IN_REVIEW.value, 
                new_status=RequestStatus.APPROVED.value
            ))
        except Exception as e:
            print(f"Ошибка отправки WebSocket уведомления автору заявки {request.author_id}: {e}")
    
    # Загружаем связанные данные
    request = db.query(Request).options(
        joinedload(Request.author),
        joinedload(Request.assignee),
        joinedload(Request.comments).joinedload(RequestComment.user)
    ).filter(Request.id == request.id).first()
    
    return request

@router.post("/{request_id}/complete", response_model=RequestSchema)
async def complete_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Завершить заявку"""
    request = db.query(Request).filter(Request.id == request_id).first()
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Заявка не найдена"
        )
    
    # Проверяем права на завершение (только исполнитель или админ)
    can_complete = (
        request.assignee_id == current_user.id or  # Исполнитель
        "admin" in (current_user.roles if hasattr(current_user, 'roles') else [])  # Админ
    )
    
    if not can_complete:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для завершения заявки"
        )
    
    # Проверяем статус заявки
    if request.status not in [RequestStatus.APPROVED.value, RequestStatus.IN_REVIEW.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Можно завершать только заявки в работе или на рассмотрении"
        )
    
    # Завершаем заявку
    old_status = request.status
    request.status = RequestStatus.COMPLETED.value
    request.updated_at = datetime.utcnow()
    
    # Обновляем профиль пользователя на основе полей с update_profile_on_approve=true
    try:
        profile_service = ProfileUpdateService(db)
        result = profile_service.update_profile_on_approve(request.id)
        if result.get('updated_fields'):
            print(f"DEBUG: Обновлены поля профиля при завершении заявки: {result['updated_fields']}")
        if result.get('errors'):
            print(f"WARNING: Ошибки при обновлении профиля при завершении заявки: {result['errors']}")
    except Exception as e:
        print(f"ERROR: Ошибка при обновлении профиля при завершении заявки: {str(e)}")
    
    db.commit()
    db.refresh(request)
    
    # Отправляем WebSocket уведомление автору заявки о завершении
    if request.author_id:
        request_data = {
            'id': request.id,
            'title': request.title,
            'description': request.description,
            'status': request.status,
            'assignee_name': f"{current_user.first_name} {current_user.last_name}" if current_user.first_name else current_user.email,
            'completed_at': request.updated_at.isoformat() if request.updated_at else None
        }
        
        try:
            import asyncio
            asyncio.create_task(notify_request_updated(
                request.id, 
                [request.author_id], 
                request_data, 
                old_status=old_status, 
                new_status=RequestStatus.COMPLETED.value
            ))
        except Exception as e:
            print(f"Ошибка отправки WebSocket уведомления автору заявки {request.author_id}: {e}")
    
    # Загружаем связанные данные
    request = db.query(Request).options(
        joinedload(Request.author),
        joinedload(Request.assignee),
        joinedload(Request.comments).joinedload(RequestComment.user)
    ).filter(Request.id == request.id).first()
    
    return request

# ===========================================
# КОММЕНТАРИИ
# ===========================================

@router.post("/{request_id}/comments", response_model=RequestCommentSchema)
async def add_comment(
    request_id: int,
    comment_data: RequestCommentCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Добавление комментария к заявке"""
    request = db.query(Request).filter(Request.id == request_id).first()
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Заявка не найдена"
        )
    
    # Проверяем права доступа
    can_comment = (
        request.author_id == current_user.id or  # Автор
        request.assignee_id == current_user.id or  # Исполнитель
        "admin" in (current_user.roles if hasattr(current_user, 'roles') else [])  # Админ
    )
    
    if not can_comment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ запрещен"
        )
    
    # Создаем комментарий
    db_comment = RequestComment(
        request_id=request_id,
        user_id=current_user.id,
        text=comment_data.text,
        is_internal=comment_data.is_internal
    )
    
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    
    # Загружаем с пользователем
    db_comment = db.query(RequestComment).options(
        joinedload(RequestComment.user)
    ).filter(RequestComment.id == db_comment.id).first()
    
    return db_comment

# ===========================================
# ПОЛЬЗОВАТЕЛИ
# ===========================================

@router.get("/users/search")
async def search_users(
    q: str = Query(..., min_length=2, description="Поисковый запрос"),
    limit: int = Query(10, ge=1, le=50, description="Количество результатов"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Поиск пользователей для назначения на заявку"""
    # Поиск по email, имени и фамилии
    search_term = f"%{q.lower()}%"
    
    users = db.query(User).filter(
        or_(
            User.email.ilike(search_term),
            User.first_name.ilike(search_term),
            User.last_name.ilike(search_term)
        )
    ).limit(limit).all()
    
    # Возвращаем упрощенную информацию о пользователях
    return [
        {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "display_name": f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email
        }
        for user in users
    ]

@router.post("/users/by-ids")
async def get_users_by_ids(
    user_ids: List[int],
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получение пользователей по массиву ID"""
    users = db.query(User).filter(User.id.in_(user_ids)).all()
    
    return [
        {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "display_name": f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email
        }
        for user in users
    ] 