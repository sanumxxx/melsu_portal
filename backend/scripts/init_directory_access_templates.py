#!/usr/bin/env python3
"""
Скрипт для создания дефолтных шаблонов доступа к справочникам

Создает готовые шаблоны для типичных ролей:
- Работник факультета
- Работник кафедры  
- Куратор группы
- Преподаватель
- Декан
- Заведующий кафедрой
"""

import sys
import os

# Добавляем путь к корню проекта
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.directory_access import DirectoryAccessTemplate, AccessType, AccessScope
from app.models.user import User

def create_default_templates():
    """Создает дефолтные шаблоны доступа"""
    db = SessionLocal()
    
    try:
        # Ищем первого админа для создания шаблонов
        admin_user = db.query(User).filter(
            User._roles.contains('admin')
        ).first()
        
        if not admin_user:
            print("❌ Админ пользователь не найден. Создайте сначала админа.")
            return False
        
        print(f"👤 Создание шаблонов от имени: {admin_user.email}")
        
        # Список шаблонов для создания
        templates = [
            {
                "name": "Работник факультета",
                "description": "Полный доступ ко всем студентам и группам факультета с правом просмотра",
                "access_type": AccessType.READ,
                "scope": AccessScope.ALL,
                "inherit_children": True,
                "restrictions": None,
                "for_roles": ["employee", "teacher"],
                "department_types": ["faculty"]
            },
            {
                "name": "Работник кафедры",
                "description": "Полный доступ ко всем студентам и группам кафедры с правом просмотра",
                "access_type": AccessType.READ,
                "scope": AccessScope.ALL,
                "inherit_children": True,
                "restrictions": None,
                "for_roles": ["employee", "teacher"],
                "department_types": ["department"]
            },
            {
                "name": "Куратор группы",
                "description": "Доступ к студентам конкретной группы с правом просмотра",
                "access_type": AccessType.READ,
                "scope": AccessScope.STUDENTS,
                "inherit_children": False,
                "restrictions": {"max_groups": 1},
                "for_roles": ["curator", "teacher"],
                "department_types": ["department"]
            },
            {
                "name": "Преподаватель кафедры",
                "description": "Доступ к студентам и группам кафедры для учебной деятельности",
                "access_type": AccessType.READ,
                "scope": AccessScope.ALL,
                "inherit_children": True,
                "restrictions": {"education_only": True},
                "for_roles": ["teacher"],
                "department_types": ["department"]
            },
            {
                "name": "Декан факультета",
                "description": "Административный доступ ко всем ресурсам факультета",
                "access_type": AccessType.ADMIN,
                "scope": AccessScope.ALL,
                "inherit_children": True,
                "restrictions": None,
                "for_roles": ["employee"],
                "department_types": ["faculty"]
            },
            {
                "name": "Заведующий кафедрой",
                "description": "Административный доступ ко всем ресурсам кафедры",
                "access_type": AccessType.ADMIN,
                "scope": AccessScope.ALL,
                "inherit_children": True,
                "restrictions": None,
                "for_roles": ["employee"],
                "department_types": ["department"]
            },
            {
                "name": "Секретарь деканата",
                "description": "Доступ к студентам и группам факультета с правом редактирования",
                "access_type": AccessType.WRITE,
                "scope": AccessScope.ALL,
                "inherit_children": True,
                "restrictions": {"secretarial_access": True},
                "for_roles": ["employee"],
                "department_types": ["faculty"]
            },
            {
                "name": "Сотрудник учебного отдела",
                "description": "Глобальный доступ ко всем справочникам для ведения учебного процесса",
                "access_type": AccessType.WRITE,
                "scope": AccessScope.ALL,
                "inherit_children": True,
                "restrictions": {"department_scope": "academic"},
                "for_roles": ["employee"],
                "department_types": None
            },
            {
                "name": "Ответственный за портфолио",
                "description": "Доступ к студентам для работы с портфолио",
                "access_type": AccessType.READ,
                "scope": AccessScope.STUDENTS,
                "inherit_children": True,
                "restrictions": {"portfolio_focus": True},
                "for_roles": ["employee", "teacher"],
                "department_types": ["faculty", "department"]
            },
            {
                "name": "Супервайзер справочников",
                "description": "Полный административный доступ ко всем справочникам",
                "access_type": AccessType.ADMIN,
                "scope": AccessScope.ALL,
                "inherit_children": True,
                "restrictions": None,
                "for_roles": ["employee"],
                "department_types": None
            }
        ]
        
        created_count = 0
        
        for template_data in templates:
            # Проверяем, не существует ли уже такой шаблон
            existing = db.query(DirectoryAccessTemplate).filter(
                DirectoryAccessTemplate.name == template_data["name"]
            ).first()
            
            if existing:
                print(f"⚠️  Шаблон '{template_data['name']}' уже существует, пропускаем")
                continue
            
            # Создаем новый шаблон
            template = DirectoryAccessTemplate(
                name=template_data["name"],
                description=template_data["description"],
                access_type=template_data["access_type"],
                scope=template_data["scope"],
                inherit_children=template_data["inherit_children"],
                restrictions=template_data["restrictions"],
                for_roles=template_data["for_roles"],
                department_types=template_data["department_types"],
                created_by=admin_user.id,
                is_active=True
            )
            
            db.add(template)
            created_count += 1
            print(f"✅ Создан шаблон: {template_data['name']}")
        
        # Сохраняем все изменения
        db.commit()
        
        print(f"\n🎉 Успешно создано {created_count} шаблонов доступа!")
        print("\n📋 Доступные шаблоны:")
        
        all_templates = db.query(DirectoryAccessTemplate).filter(
            DirectoryAccessTemplate.is_active == True
        ).all()
        
        for template in all_templates:
            print(f"  • {template.name} ({template.access_type.value}, {template.scope.value})")
            if template.for_roles:
                print(f"    └─ Роли: {', '.join(template.for_roles)}")
            if template.department_types:
                print(f"    └─ Типы подразделений: {', '.join(template.department_types)}")
            print()
        
        return True
        
    except Exception as e:
        print(f"❌ Ошибка создания шаблонов: {e}")
        db.rollback()
        return False
    finally:
        db.close()

def show_usage_examples():
    """Показывает примеры использования шаблонов"""
    print("\n" + "="*60)
    print("📖 ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ ШАБЛОНОВ")
    print("="*60)
    
    examples = [
        {
            "scenario": "Назначение декана факультета",
            "template": "Декан факультета", 
            "steps": [
                "1. Выберите шаблон 'Декан факультета'",
                "2. Укажите пользователя с ролью 'employee'",
                "3. Выберите соответствующий факультет",
                "4. Деканат получит полный административный доступ к факультету"
            ]
        },
        {
            "scenario": "Назначение куратора группы",
            "template": "Куратор группы",
            "steps": [
                "1. Выберите шаблон 'Куратор группы'",
                "2. Укажите преподавателя",
                "3. Выберите кафедру, к которой относится группа",
                "4. Куратор получит доступ к студентам группы"
            ]
        },
        {
            "scenario": "Назначение сотрудника учебного отдела",
            "template": "Сотрудник учебного отдела",
            "steps": [
                "1. Выберите шаблон 'Сотрудник учебного отдела'",
                "2. Укажите сотрудника",
                "3. Не указывайте конкретное подразделение (глобальный доступ)",
                "4. Сотрудник получит доступ ко всем справочникам"
            ]
        }
    ]
    
    for example in examples:
        print(f"\n🎯 {example['scenario']}")
        print(f"   Шаблон: {example['template']}")
        for step in example['steps']:
            print(f"   {step}")
    
    print("\n" + "="*60)

if __name__ == "__main__":
    print("🚀 Инициализация шаблонов доступа к справочникам")
    print("-" * 50)
    
    if create_default_templates():
        show_usage_examples()
        print("\n✨ Система готова к работе!")
    else:
        print("\n💥 Не удалось инициализировать шаблоны")
        sys.exit(1) 