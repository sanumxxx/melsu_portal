#!/usr/bin/env python3
"""
Скрипт для инициализации системных ролей в базе данных МелГУ.

Этот скрипт создает или обновляет системные роли, необходимые для работы
университетского портала.

Использование:
    python scripts/init_system_roles.py
"""

import sys
import os
from pathlib import Path

# Добавляем корневую директорию проекта в путь
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.database import engine, get_db
from app.models.role import Role
from datetime import datetime


# Определяем системные роли
SYSTEM_ROLES = [
    {
        'name': 'admin',
        'display_name': 'Администратор',
        'description': 'Полный доступ к системе управления университетским порталом. Может управлять пользователями, ролями, структурой организации и всеми типами заявок.',
        'is_system': True,
        'is_active': True
    },
    {
        'name': 'manager',
        'display_name': 'Менеджер',
        'description': 'Управление заявками и пользователями. Может просматривать и обрабатывать заявки, назначать ответственных, управлять рабочими процессами.',
        'is_system': True,
        'is_active': True
    },
    {
        'name': 'employee',
        'display_name': 'Сотрудник',
        'description': 'Сотрудник университета. Может обрабатывать заявки в рамках своих полномочий, создавать служебные заявки.',
        'is_system': True,
        'is_active': True
    },
    {
        'name': 'student',
        'display_name': 'Студент',
        'description': 'Студент университета. Может создавать и отслеживать свои заявки, просматривать информацию об учебном процессе.',
        'is_system': True,
        'is_active': True
    },
    {
        'name': 'teacher',
        'display_name': 'Преподаватель',
        'description': 'Преподаватель университета. Может создавать и обрабатывать заявки, связанные с учебным процессом, управлять академическими вопросами.',
        'is_system': True,
        'is_active': True
    },
    {
        'name': 'guest',
        'display_name': 'Гость',
        'description': 'Гостевой доступ. Минимальные права для просмотра общедоступной информации.',
        'is_system': True,
        'is_active': True
    },
    {
        'name': 'schoolchild',
        'display_name': 'Школьник',
        'description': 'Учащийся школы. Может просматривать информацию о поступлении и подавать заявки на поступление.',
        'is_system': True,
        'is_active': True
    },
    {
        'name': 'curator',
        'display_name': 'Куратор',
        'description': 'Куратор группы или курса',
        'is_system': True,
        'is_active': True
    }
]


def init_system_roles(db: Session, force_update: bool = False) -> dict:
    """
    Инициализация системных ролей в базе данных.
    
    Args:
        db: Сессия базы данных
        force_update: Принудительное обновление существующих ролей
        
    Returns:
        dict: Статистика выполнения операции
    """
    stats = {
        'created': 0,
        'updated': 0,
        'skipped': 0,
        'errors': 0
    }
    
    print("🔧 Инициализация системных ролей...")
    print(f"📊 Всего ролей для обработки: {len(SYSTEM_ROLES)}")
    print("-" * 50)
    
    for role_data in SYSTEM_ROLES:
        try:
            # Проверяем существование роли
            existing_role = db.query(Role).filter(Role.name == role_data['name']).first()
            
            if existing_role:
                if force_update:
                    # Обновляем существующую роль
                    for key, value in role_data.items():
                        if key != 'name':  # Имя роли не меняем
                            setattr(existing_role, key, value)
                    existing_role.updated_at = datetime.utcnow()
                    
                    print(f"🔄 Обновлена роль: {role_data['display_name']} ({role_data['name']})")
                    stats['updated'] += 1
                else:
                    print(f"⏩ Пропущена роль: {role_data['display_name']} ({role_data['name']}) - уже существует")
                    stats['skipped'] += 1
            else:
                # Создаем новую роль
                new_role = Role(**role_data)
                db.add(new_role)
                
                print(f"✅ Создана роль: {role_data['display_name']} ({role_data['name']})")
                stats['created'] += 1
                
        except IntegrityError as e:
            print(f"❌ Ошибка создания роли {role_data['name']}: {e}")
            stats['errors'] += 1
            db.rollback()
        except Exception as e:
            print(f"❌ Неожиданная ошибка при обработке роли {role_data['name']}: {e}")
            stats['errors'] += 1
            db.rollback()
    
    try:
        db.commit()
        print("-" * 50)
        print("✅ Транзакция успешно завершена")
    except Exception as e:
        print(f"❌ Ошибка при сохранении в базу данных: {e}")
        db.rollback()
        stats['errors'] += len(SYSTEM_ROLES)
        stats['created'] = 0
        stats['updated'] = 0
    
    return stats


def print_current_roles(db: Session):
    """Выводит список текущих ролей в системе."""
    print("\n📋 Текущие роли в системе:")
    print("-" * 80)
    
    roles = db.query(Role).order_by(Role.is_system.desc(), Role.name).all()
    
    if not roles:
        print("   Роли не найдены")
        return
    
    print(f"{'ID':<4} {'Имя':<15} {'Отображаемое имя':<20} {'Тип':<12} {'Статус':<8}")
    print("-" * 80)
    
    for role in roles:
        role_type = "Системная" if role.is_system else "Пользов."
        status = "Активна" if role.is_active else "Неактивна"
        print(f"{role.id:<4} {role.name:<15} {role.display_name:<20} {role_type:<12} {status:<8}")


def main():
    """Главная функция скрипта."""
    print("🎓 Скрипт инициализации системных ролей МелГУ")
    print("=" * 60)
    
    # Парсим аргументы командной строки
    force_update = '--force' in sys.argv or '-f' in sys.argv
    show_help = '--help' in sys.argv or '-h' in sys.argv
    show_current = '--show' in sys.argv or '-s' in sys.argv
    
    if show_help:
        print("""
Использование: python scripts/init_system_roles.py [опции]

Опции:
  -h, --help     Показать это сообщение помощи
  -f, --force    Принудительно обновить существующие системные роли
  -s, --show     Показать текущие роли в системе
  
Примеры:
  python scripts/init_system_roles.py                # Создать недостающие роли
  python scripts/init_system_roles.py --force        # Обновить все системные роли
  python scripts/init_system_roles.py --show         # Показать текущие роли
        """)
        return
    
    try:
        # Создаем сессию базы данных
        db = next(get_db())
        
        if show_current:
            print_current_roles(db)
            return
        
        if force_update:
            print("⚠️  Режим принудительного обновления включен")
            print("   Все системные роли будут обновлены")
        
        # Выполняем инициализацию ролей
        stats = init_system_roles(db, force_update=force_update)
        
        # Выводим статистику
        print("\n📊 Результаты выполнения:")
        print(f"   ✅ Создано ролей: {stats['created']}")
        print(f"   🔄 Обновлено ролей: {stats['updated']}")
        print(f"   ⏩ Пропущено ролей: {stats['skipped']}")
        print(f"   ❌ Ошибок: {stats['errors']}")
        
        if stats['errors'] == 0:
            print("\n🎉 Инициализация системных ролей завершена успешно!")
        else:
            print(f"\n⚠️  Инициализация завершена с ошибками: {stats['errors']}")
            sys.exit(1)
            
        # Показываем текущие роли
        print_current_roles(db)
        
    except Exception as e:
        print(f"\n❌ Критическая ошибка: {e}")
        sys.exit(1)
    finally:
        if 'db' in locals():
            db.close()


if __name__ == "__main__":
    main() 