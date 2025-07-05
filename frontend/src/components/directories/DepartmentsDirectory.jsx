import React, { useState, useEffect } from 'react';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  UsersIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  EyeIcon,
  ListBulletIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import Loader from '../common/Loader';

const DepartmentsDirectory = () => {
  const [departments, setDepartments] = useState([]);
  const [departmentsTree, setDepartmentsTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('tree'); // 'tree' или 'list'
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [departmentDetails, setDepartmentDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  
  // Загрузка списка подразделений
  const loadDepartments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [listResponse, treeResponse] = await Promise.all([
        api.get('/api/directories/departments'),
        api.get('/api/directories/departments/tree')
      ]);
      
      setDepartments(listResponse.data.departments || []);
      setDepartmentsTree(treeResponse.data.departments_tree || []);
      
    } catch (error) {
      console.error('Ошибка загрузки подразделений:', error);
      setError('Ошибка при загрузке списка подразделений');
      setDepartments([]);
      setDepartmentsTree([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Загрузка детальной информации о подразделении
  const loadDepartmentDetails = async (departmentId) => {
    try {
      setLoadingDetails(true);
      const response = await api.get(`/api/directories/departments/${departmentId}`);
      setDepartmentDetails(response.data);
    } catch (error) {
      console.error('Ошибка загрузки деталей подразделения:', error);
      setDepartmentDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };
  
  // Просмотр подразделения
  const viewDepartment = (department) => {
    setSelectedDepartment(department);
    loadDepartmentDetails(department.id);
  };
  
  // Закрытие модального окна
  const closeModal = () => {
    setSelectedDepartment(null);
    setDepartmentDetails(null);
  };
  
  // Переключение развернутого состояния узла
  const toggleNode = (nodeId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };
  
  // Загрузка данных при монтировании
  useEffect(() => {
    loadDepartments();
  }, []);
  
  // Рендер узла дерева
  const renderTreeNode = (node, level = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    
    return (
      <div key={node.id} className="select-none">
        <div 
          className={`
            flex items-center py-2 px-3 hover:bg-gray-50 rounded-md cursor-pointer
            ${level > 0 ? 'ml-' + (level * 4) : ''}
          `}
          style={{ marginLeft: level * 16 }}
        >
          {/* Кнопка развертывания */}
          <div className="w-6 h-6 flex items-center justify-center">
            {hasChildren ? (
              <button
                onClick={() => toggleNode(node.id)}
                className="p-1 rounded hover:bg-gray-200"
              >
                {isExpanded ? (
                  <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                )}
              </button>
            ) : (
              <div className="w-4 h-4" />
            )}
          </div>
          
          {/* Иконка */}
          <div className="mr-3">
            <BuildingOfficeIcon 
              className={`
                h-5 w-5
                ${node.department_type === 'faculty' 
                  ? 'text-blue-600' 
                  : 'text-green-600'
                }
              `} 
            />
          </div>
          
          {/* Информация */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-900 truncate">
                {node.short_name || node.name}
              </span>
              <span 
                className={`
                  ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                  ${node.department_type === 'faculty'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                  }
                `}
              >
                {node.department_type === 'faculty' ? 'Факультет' : 'Кафедра'}
              </span>
            </div>
            {node.short_name && node.name !== node.short_name && (
              <div className="text-xs text-gray-500 truncate">
                {node.name}
              </div>
            )}
            <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
              <div className="flex items-center">
                <UserGroupIcon className="h-3 w-3 mr-1" />
                {node.groups_count} групп
              </div>
              <div className="flex items-center">
                <UsersIcon className="h-3 w-3 mr-1" />
                {node.students_count} студентов
              </div>
            </div>
          </div>
          
          {/* Кнопка просмотра */}
          <button
            onClick={() => viewDepartment(node)}
            className="ml-2 p-1 rounded hover:bg-gray-200"
          >
            <EyeIcon className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        
        {/* Дочерние элементы */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };
  
  const getDepartmentTypeLabel = (type) => {
    const types = {
      'faculty': 'Факультет',
      'department': 'Кафедра',
      'chair': 'Кафедра'
    };
    return types[type] || type;
  };
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">
          <p className="font-medium">Ошибка загрузки</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={() => loadDepartments()}
            className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <div className="space-y-6">
        {/* Заголовок и переключатель режима */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">
              Структура подразделений
              {departments.length > 0 && (
                <span className="ml-2 text-sm text-gray-500">
                  ({departments.length} подразделений)
                </span>
              )}
            </h2>
          </div>
          
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('tree')}
              className={`
                flex items-center px-3 py-2 text-sm font-medium rounded-md
                ${viewMode === 'tree'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }
              `}
            >
              <Squares2X2Icon className="h-4 w-4 mr-2" />
              Дерево
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`
                flex items-center px-3 py-2 text-sm font-medium rounded-md
                ${viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }
              `}
            >
              <ListBulletIcon className="h-4 w-4 mr-2" />
              Список
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader />
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            {viewMode === 'tree' ? (
              /* Иерархическое отображение */
              <div className="p-4">
                {departmentsTree.length === 0 ? (
                  <div className="text-center py-8">
                    <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Подразделения не найдены</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      В системе пока нет зарегистрированных подразделений
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {departmentsTree.map(node => renderTreeNode(node))}
                  </div>
                )}
              </div>
            ) : (
              /* Списочное отображение */
              <ul className="divide-y divide-gray-200">
                {departments.length === 0 ? (
                  <li className="px-6 py-8">
                    <div className="text-center">
                      <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">Подразделения не найдены</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        В системе пока нет зарегистрированных подразделений
                      </p>
                    </div>
                  </li>
                ) : (
                  departments.map((department) => (
                    <li key={department.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center min-w-0 flex-1">
                          <div className="flex-shrink-0">
                            <BuildingOfficeIcon 
                              className={`
                                h-8 w-8
                                ${department.department_type === 'faculty' 
                                  ? 'text-blue-600' 
                                  : 'text-green-600'
                                }
                              `} 
                            />
                          </div>
                          <div className="ml-4 flex-1 min-w-0">
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {department.name}
                              </span>
                              <span 
                                className={`
                                  ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                                  ${department.department_type === 'faculty'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-green-100 text-green-800'
                                  }
                                `}
                              >
                                {getDepartmentTypeLabel(department.department_type)}
                              </span>
                            </div>
                            {department.short_name && (
                              <div className="mt-1 text-sm text-gray-500">
                                Сокращение: {department.short_name}
                              </div>
                            )}
                            {department.parent_info && (
                              <div className="mt-1 text-sm text-gray-500">
                                Входит в: {department.parent_info.name}
                              </div>
                            )}
                            <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                              <div className="flex items-center">
                                <UserGroupIcon className="h-3 w-3 mr-1" />
                                {department.groups_count} групп
                              </div>
                              <div className="flex items-center">
                                <UsersIcon className="h-3 w-3 mr-1" />
                                {department.students_count} студентов
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <button
                            onClick={() => viewDepartment(department)}
                            className="ml-2 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            <EyeIcon className="h-4 w-4 mr-2" />
                            Просмотреть
                          </button>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        )}
      </div>
      
      {/* Модальное окно с информацией о подразделении */}
      {selectedDepartment && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeModal}></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
              {loadingDetails ? (
                <div className="flex justify-center py-8">
                  <Loader />
                </div>
              ) : departmentDetails ? (
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    {getDepartmentTypeLabel(departmentDetails.department_type)}: {departmentDetails.name}
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Основная информация */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Основная информация</h4>
                        <div className="space-y-2 text-sm">
                          {departmentDetails.short_name && (
                            <div>
                              <span className="font-medium text-gray-600">Сокращение:</span>
                              <span className="ml-2 text-gray-900">{departmentDetails.short_name}</span>
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-gray-600">Тип:</span>
                            <span className="ml-2 text-gray-900">{getDepartmentTypeLabel(departmentDetails.department_type)}</span>
                          </div>
                          {departmentDetails.parent_info && (
                            <div>
                              <span className="font-medium text-gray-600">Входит в:</span>
                              <span className="ml-2 text-gray-900">{departmentDetails.parent_info.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Статистика */}
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Статистика</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-blue-50 p-3 rounded-md">
                            <div className="text-2xl font-bold text-blue-600">{departmentDetails.groups_count}</div>
                            <div className="text-sm text-blue-800">Групп</div>
                          </div>
                          <div className="bg-green-50 p-3 rounded-md">
                            <div className="text-2xl font-bold text-green-600">{departmentDetails.students_count}</div>
                            <div className="text-sm text-green-800">Студентов</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Дочерние подразделения */}
                      {departmentDetails.child_departments && departmentDetails.child_departments.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">Дочерние подразделения</h4>
                          <div className="space-y-2">
                            {departmentDetails.child_departments.map((child) => (
                              <div key={child.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                <div>
                                  <span className="text-sm font-medium">{child.name}</span>
                                  <span className="ml-2 text-xs text-gray-500">
                                    ({child.groups_count} групп, {child.students_count} студентов)
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Группы и студенты */}
                    <div className="space-y-4">
                      {/* Группы */}
                      {departmentDetails.groups && departmentDetails.groups.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">Группы ({departmentDetails.groups.length})</h4>
                          <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                            <ul className="divide-y divide-gray-200">
                              {departmentDetails.groups.map((group) => (
                                <li key={group.id} className="px-3 py-2">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <span className="text-sm font-medium">{group.name}</span>
                                      {group.specialization && (
                                        <div className="text-xs text-gray-500">{group.specialization}</div>
                                      )}
                                    </div>
                                    <span className="text-xs text-gray-500">
                                      {group.students_count} студентов
                                    </span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                      
                      {/* Студенты */}
                      {departmentDetails.students && departmentDetails.students.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">
                            Студенты (показано {departmentDetails.students.length} из {departmentDetails.students_count})
                          </h4>
                          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                            <ul className="divide-y divide-gray-200">
                              {departmentDetails.students.map((student) => (
                                <li key={student.id} className="px-3 py-2">
                                  <div>
                                    <span className="text-sm font-medium">
                                      {student.last_name} {student.first_name} {student.middle_name}
                                    </span>
                                    <div className="text-xs text-gray-500">
                                      {student.email}
                                      {student.student_id && (
                                        <span className="ml-2">• {student.student_id}</span>
                                      )}
                                    </div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500">Не удалось загрузить информацию о подразделении</p>
                </div>
              )}
              
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={closeModal}
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DepartmentsDirectory; 