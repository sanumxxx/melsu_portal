import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  UserIcon, 
  UsersIcon,
  CogIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FolderIcon,
  AcademicCapIcon,
  CurrencyDollarIcon,
  BookOpenIcon,
  BuildingLibraryIcon,
  ComputerDesktopIcon,
  BanknotesIcon,
  DocumentIcon,
  ClipboardDocumentListIcon,
  ClipboardDocumentCheckIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

const Layout = ({ children, user, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});

  const toggleMenu = (menuName) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuName]: !prev[menuName]
    }));
  };

  // Функция для получения навигации без дублирования
  const getNavigation = () => {
    const baseNavigation = [
    { name: 'Профиль', href: '/profile', icon: UserIcon },
    { name: 'Расписание', href: '/schedule', icon: CalendarDaysIcon },
      ...(user?.roles?.includes('student') ? [
        { name: 'Портфолио', href: '/portfolio', icon: FolderIcon }
      ] : []),
    {
      name: 'Заявки',
      icon: DocumentTextIcon,
      children: [
        { name: 'Мои заявки', href: '/requests/my' },
          { name: 'Назначенные мне', href: '/requests/assigned' },
          ...(user?.roles?.includes('admin') ? [
            { name: 'Конструктор заявок', href: '/request-builder' }
          ] : [])
        ]
      }
    ];

    // Общие разделы для всех ролей (кроме admin)
    const hasNonAdminRole = user?.roles?.some(role => ['student', 'teacher', 'employee'].includes(role));
    if (hasNonAdminRole) {
      baseNavigation.push(
        { name: 'Мероприятия', href: '/events', icon: CalendarDaysIcon },
        { name: 'Библиотечные системы', href: '/library', icon: BuildingLibraryIcon },
        { name: 'Цифровые ресурсы', href: '/digital-resources', icon: ComputerDesktopIcon }
      );
    }

    // Специфичные студенческие разделы
    if (user?.roles?.includes('student')) {
      // Определяем путь для ведомостей в зависимости от ролей
      const gradesHref = user?.roles?.includes('teacher') ? '/teacher/grades' : '/student/grades';
      
      baseNavigation.push(
        { name: 'Ведомости', href: gradesHref, icon: ClipboardDocumentCheckIcon },
        { name: 'Стипендия', href: '/student/scholarship', icon: CurrencyDollarIcon },
        { name: 'Учебные материалы', href: '/student/materials', icon: BookOpenIcon }
      );
    }

    // Специфичные преподавательские разделы
    if (user?.roles?.includes('teacher')) {
      baseNavigation.push(
        { name: 'Учебные планы', href: '/teacher/curriculum', icon: AcademicCapIcon },
        { name: 'Учебная нагрузка', href: '/teacher/workload', icon: ClipboardDocumentListIcon }
      );
      
      // Добавляем ведомости только если нет роли студента
      if (!user?.roles?.includes('student')) {
        baseNavigation.push(
          { name: 'Ведомости', href: '/teacher/grades', icon: ClipboardDocumentCheckIcon }
        );
      }
    }

    // Специфичные сотруднические разделы
    if (user?.roles?.includes('employee')) {
      baseNavigation.push(
        { name: 'Зарплатные ведомости', href: '/employee/payroll', icon: BanknotesIcon },
        { name: 'Отпуск', href: '/employee/vacation', icon: CalendarDaysIcon },
        { name: 'Отсутствия', href: '/employee/absences', icon: ClipboardDocumentListIcon },
        { name: 'Документы', href: '/employee/documents', icon: DocumentIcon },
        { name: 'Университет', href: '/university', icon: BuildingOfficeIcon }
      );
    }

    // Административные разделы
    if (user?.roles?.includes('admin')) {
      baseNavigation.push(
        {
          name: 'Управление системой',
        icon: CogIcon,
        children: [
          { name: 'Управление ролями', href: '/admin/roles' },
          { name: 'Структура организации', href: '/admin/structure' }
        ]
      },
      {
          name: 'Управление пользователями',
        icon: UsersIcon,
        children: [
          { name: 'Все пользователи', href: '/users/all' },
          { name: 'Сотрудники', href: '/users/employees' },
          { name: 'Преподаватели', href: '/users/teachers' },
          { name: 'Школьники', href: '/users/schoolchildren' },
          { name: 'Студенты', href: '/users/students' }
        ]
      }
      );
    }

    return baseNavigation;
  };

  const navigation = getNavigation();

  const renderNavigationItem = (item, mobile = false) => {
    const baseClasses = mobile 
      ? "flex items-center px-3 py-2 text-base font-medium rounded-md"
      : "flex items-center px-2 py-2 text-sm font-medium rounded-md";
    
    const iconClasses = mobile ? "mr-4 h-6 w-6" : "mr-3 h-6 w-6";

    if (item.children) {
      return (
        <div key={item.name}>
          <button
            onClick={() => toggleMenu(item.name)}
            className={`${baseClasses} w-full text-left text-gray-600 hover:bg-gray-50 hover:text-gray-900`}
          >
            <item.icon className={`${iconClasses} flex-shrink-0`} />
            <span className="flex-1">{item.name}</span>
            {expandedMenus[item.name] ? (
              <ChevronDownIcon className="h-5 w-5" />
            ) : (
              <ChevronRightIcon className="h-5 w-5" />
            )}
          </button>
          {expandedMenus[item.name] && (
            <div className={mobile ? "ml-10 space-y-1" : "ml-8 space-y-1"}>
              {item.children.map((child) => (
                <NavLink
                  key={child.name}
                  to={child.href}
                  className={({ isActive }) =>
                    `block px-3 py-2 text-sm font-medium rounded-md ${
                      isActive
                        ? 'bg-red-100 text-red-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                  onClick={() => mobile && setMobileMenuOpen(false)}
                >
                  {child.name}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        key={item.name}
        to={item.href}
        className={({ isActive }) =>
          `${baseClasses} ${
            isActive
              ? 'bg-red-100 text-red-900'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`
        }
        onClick={() => mobile && setMobileMenuOpen(false)}
      >
        <item.icon className={`${iconClasses} flex-shrink-0`} />
        {item.name}
      </NavLink>
    );
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* ДЕСКТОПНЫЙ САЙДБАР - НОВАЯ СТРУКТУРА */}
      <div className="max-sm:hidden flex flex-col w-64 bg-white shadow-lg">
        {/* Заголовок */}
        <div className="flex items-center h-16 flex-shrink-0 px-4 bg-white border-b">
          <img className="h-8 w-auto" src="/logo.png" alt="МелГУ" />
          <h1 className="ml-2 text-xl font-bold text-gray-900">my.melsu</h1>
        </div>
        
        {/* Навигация */}
        <div className="flex-1 overflow-y-auto">
          <nav className="px-2 py-4 space-y-1">
            {/* Личные разделы */}
            {navigation.slice(0, user?.roles?.includes('student') ? 3 : 2).map((item) => renderNavigationItem(item, false))}
            
            {/* Разделитель */}
            <div className="border-t border-gray-200 my-3"></div>
            
            {/* Заявки */}
            {navigation.slice(user?.roles?.includes('student') ? 3 : 2, user?.roles?.includes('student') ? 4 : 3).map((item) => renderNavigationItem(item, false))}
            
            {/* Остальные разделы */}
            {navigation.slice(user?.roles?.includes('student') ? 4 : 3).filter(item => !item.children || !item.children.some(child => child.href.includes('/admin/'))).map((item) => renderNavigationItem(item, false))}
            
            {/* Административные разделы */}
            {user?.roles?.includes('admin') && (
              <>
                <div className="border-t border-gray-200 my-3"></div>
                <div className="px-3 py-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Администрирование
                  </p>
                </div>
                {navigation.filter(item => item.children && item.children.some(child => child.href.includes('/admin/') || child.href.includes('/users/'))).map((item) => renderNavigationItem(item, false))}
              </>
            )}
          </nav>
        </div>
        
        {/* Пользователь */}
        <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                <UserIcon className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">{user?.email}</p>
              <button
                onClick={onLogout}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* МОБИЛЬНОЕ МЕНЮ OVERLAY */}
      {mobileMenuOpen && (
                 <div className="sm:hidden fixed inset-0 z-50">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                <XMarkIcon className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <img className="h-8 w-auto" src="/logo.png" alt="МелГУ" />
                <h1 className="ml-2 text-lg font-bold text-gray-900">my.melsu</h1>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {navigation.map((item) => renderNavigationItem(item, true))}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-red-600" />
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">{user?.email}</p>
                  <button
                    onClick={() => {
                      onLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Выйти
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ОСНОВНОЙ КОНТЕНТ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Мобильный хедер */}
        <div className="sm:hidden bg-white shadow-sm border-b">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center">
              <img className="h-8 w-auto" src="/logo.png" alt="МелГУ" />
              <h1 className="ml-2 text-lg font-semibold text-gray-900">my.melsu</h1>
            </div>
            <button
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Контент */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout; 