import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  UsersIcon, 
  UserGroupIcon, 
  BuildingOfficeIcon 
} from '@heroicons/react/24/outline';

import StudentsDirectory from './directories/StudentsDirectory';
import GroupsDirectory from './directories/GroupsDirectory';
import DepartmentsDirectory from './directories/DepartmentsDirectory';

const Directories = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Определяем активную вкладку на основе URL
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/students')) return 'students';
    if (path.includes('/groups')) return 'groups';
    if (path.includes('/departments')) return 'departments';
    return 'students'; // По умолчанию
  };
  
  const [activeTab, setActiveTab] = useState(getActiveTab());
  
  const tabs = [
    {
      id: 'students',
      name: 'Студенты',
      icon: UsersIcon,
      path: '/directories/students',
      component: StudentsDirectory
    },
    {
      id: 'groups',
      name: 'Группы',
      icon: UserGroupIcon,
      path: '/directories/groups',
      component: GroupsDirectory
    },
    {
      id: 'departments',
      name: 'Подразделения',
      icon: BuildingOfficeIcon,
      path: '/directories/departments',
      component: DepartmentsDirectory
    }
  ];
  
  const handleTabChange = (tabId, tabPath) => {
    setActiveTab(tabId);
    navigate(tabPath);
  };
  
  // Находим активную вкладку
  const currentTab = tabs.find(tab => tab.id === activeTab) || tabs[0];
  const CurrentComponent = currentTab.component;
  
  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Справочники</h1>
        <p className="mt-1 text-sm text-gray-500">
          Просмотр и управление информацией о студентах, группах и подразделениях
        </p>
      </div>
      
      {/* Навигация по вкладкам */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id, tab.path)}
                className={`
                  group inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium
                  ${isActive
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                <tab.icon
                  className={`
                    -ml-0.5 mr-2 h-5 w-5
                    ${isActive
                      ? 'text-red-500'
                      : 'text-gray-400 group-hover:text-gray-500'
                    }
                  `}
                  aria-hidden="true"
                />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>
      
      {/* Содержимое активной вкладки */}
      <div className="mt-6">
        <CurrentComponent />
      </div>
    </div>
  );
};

export default Directories; 