#!/usr/bin/env python3
"""
Настройка тестовых факультетов и кафедр
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import get_db
from app.models.department import Department
from app.models.group import Group
from app.models.user import User
from app.models.user_profile import UserProfile
from app.models.user_assignment import UserDepartmentAssignment

def setup_test_departments():
    """Создает тестовые факультеты и кафедры"""
    
    db = next(get_db())
    
    print("🏗️ Создание тестовых факультетов и кафедр...")
    
    # Создаем факультет
    faculty = db.query(Department).filter(
        Department.name == "Факультет информационных технологий",
        Department.department_type == "faculty"
    ).first()
    
    if not faculty:
        faculty = Department(
            name="Факультет информационных технологий",
            short_name="ФИТ",
            department_type="faculty",
            is_active=True
        )
        db.add(faculty)
        db.commit()
        print(f"✅ Создан факультет: {faculty.name} (ID: {faculty.id})")
    else:
        print(f"✅ Факультет уже существует: {faculty.name} (ID: {faculty.id})")
    
    # Создаем кафедру
    department = db.query(Department).filter(
        Department.name == "Кафедра программного обеспечения",
        Department.department_type == "department"
    ).first()
    
    if not department:
        department = Department(
            name="Кафедра программного обеспечения",
            short_name="КПО",
            department_type="department",
            parent_id=faculty.id,
            is_active=True
        )
        db.add(department)
        db.commit()
        print(f"✅ Создана кафедра: {department.name} (ID: {department.id})")
    else:
        print(f"✅ Кафедра уже существует: {department.name} (ID: {department.id})")
    
    # Создаем группу
    group = db.query(Group).filter(Group.name == "ПО-21").first()
    if not group:
        group = Group(
            name="ПО-21",
            specialization="Программное обеспечение",
            department_id=department.id,
            course=4,
            is_active=True
        )
        db.add(group)
        db.commit()
        print(f"✅ Создана группа: {group.name} (ID: {group.id})")
    else:
        print(f"✅ Группа уже существует: {group.name} (ID: {group.id})")
    
    # Привязываем пользователя к факультету, кафедре и группе
    user = db.query(User).filter(User.email == "sanumxxx@yandex.ru").first()
    if user and user.profile:
        print(f"\n🔗 Привязка пользователя {user.first_name} {user.last_name}...")
        
        profile = user.profile
        profile.faculty = faculty.name
        profile.department = department.name
        profile.faculty_id = faculty.id
        profile.department_id = department.id
        profile.group_id = group.id
        profile.course = 4
        profile.student_id = "21-ПО-001"
        
        db.commit()
        print(f"✅ Профиль обновлен:")
        print(f"   Факультет: {profile.faculty} (ID: {profile.faculty_id})")
        print(f"   Кафедра: {profile.department} (ID: {profile.department_id})")
        print(f"   Группа: {group.name} (ID: {profile.group_id})")
        print(f"   Курс: {profile.course}")
        print(f"   Студ. билет: {profile.student_id}")
    
    # Создаем назначение для доступа к студентам
    assignment = db.query(UserDepartmentAssignment).filter(
        UserDepartmentAssignment.user_id == user.id,
        UserDepartmentAssignment.department_id == faculty.id
    ).first()
    
    if not assignment:
        assignment = UserDepartmentAssignment(
            user_id=user.id,
            department_id=faculty.id,
            assignment_type="employee",
            notes="Тестовое назначение для доступа к студентам"
        )
        db.add(assignment)
        db.commit()
        print(f"✅ Создано назначение в факультет для доступа к студентам")
    else:
        print(f"✅ Назначение в факультет уже существует")
    
    db.close()
    print(f"\n🎉 Настройка завершена!")

if __name__ == "__main__":
    setup_test_departments() 