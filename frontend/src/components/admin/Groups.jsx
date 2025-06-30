import React, { useEffect, useState } from 'react';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  UserGroupIcon,
  AcademicCapIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  XMarkIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [departments, setDepartments] = useState([]); // Только кафедры
  const [faculties, setFaculties] = useState([]); // Все факультеты для отображения
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    department_id: '', // ID кафедры
    education_level: '',
    education_form: '',
    specialization: ''
  });

  // Опции для селектов
  const educationLevels = [
    { value: 'bachelor', label: 'Бакалавриат' },
    { value: 'master', label: 'Магистратура' },
    { value: 'postgraduate', label: 'Аспирантура' },
    { value: 'specialist', label: 'Специалитет' }
  ];

  const educationForms = [
    { value: 'full_time', label: 'Очная' },
    { value: 'part_time', label: 'Заочная' },
    { value: 'evening', label: 'Очно-заочная' },
    { value: 'distance', label: 'Дистанционная' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [groupsRes, departmentsRes, facultiesRes] = await Promise.all([
        api.get('/api/groups'),
        api.get('/departments?department_type=department'), // Только кафедры
        api.get('/departments?department_type=faculty') // Только факультеты
      ]);
      
      setGroups(groupsRes.data || []);
      setDepartments(departmentsRes.data || []);
      setFaculties(facultiesRes.data || []);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      toast.error('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      department_id: '',
      education_level: '',
      education_form: '',
      specialization: ''
    });
  };

  const openCreateModal = () => {
    setModalMode('create');
    resetForm();
    setSelectedGroup(null);
    setShowModal(true);
  };

  const openEditModal = (group) => {
    setModalMode('edit');
    setFormData({
      name: group.name || '',
      department_id: group.department_id || '',
      education_level: group.education_level || '',
      education_form: group.education_form || '',
      specialization: group.specialization || ''
    });
    setSelectedGroup(group);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const submitData = {
        ...formData,
        department_id: formData.department_id ? parseInt(formData.department_id) : null
      };

      if (modalMode === 'create') {
        await api.post('/api/groups', submitData);
        toast.success('Группа создана');
      } else if (modalMode === 'edit' && selectedGroup) {
        await api.put(`/api/groups/${selectedGroup.id}`, submitData);
        toast.success('Группа обновлена');
      }

      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('Ошибка сохранения группы:', error);
      const errorMessage = error.response?.data?.detail || 'Не удалось сохранить группу';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (group) => {
    if (!window.confirm(`Вы уверены, что хотите удалить группу "${group.name}"?`)) {
      return;
    }

    try {
      await api.delete(`/api/groups/${group.id}`);
      toast.success('Группа удалена');
      loadData();
    } catch (error) {
      console.error('Ошибка удаления группы:', error);
      const errorMessage = error.response?.data?.detail || 'Не удалось удалить группу';
      toast.error(errorMessage);
    }
  };

  const getDepartmentInfo = (departmentId) => {
    const department = departments.find(d => d.id === departmentId);
    if (!department) return { name: 'Не указано', faculty: 'Не указан' };
    
    // Находим факультет по parent_id кафедры
    const faculty = faculties.find(f => f.id === department.parent_id);
    
    return {
      name: department.name,
      faculty: faculty ? faculty.name : 'Не указан'
    };
  };

  const getEducationLevelLabel = (level) => {
    const option = educationLevels.find(opt => opt.value === level);
    return option ? option.label : level;
  };

  const getEducationFormLabel = (form) => {
    const option = educationForms.find(opt => opt.value === form);
    return option ? option.label : form;
  };

  // Группировка кафедр по факультетам для удобного выбора
  const getDepartmentsByFaculty = () => {
    const grouped = {};
    
    departments.forEach(dept => {
      const faculty = faculties.find(f => f.id === dept.parent_id);
      const facultyName = faculty ? faculty.name : 'Без факультета';
      
      if (!grouped[facultyName]) {
        grouped[facultyName] = [];
      }
      grouped[facultyName].push(dept);
    });
    
    return grouped;
  };

  // Функция для получения года набора из названия группы
  const getAdmissionYearFromName = (name) => {
    const match = name.match(/^(\d{2})/);
    if (match) {
      const yearSuffix = parseInt(match[1]);
      const currentYear = new Date().getFullYear();
      const currentCentury = Math.floor(currentYear / 100) * 100;
      let fullYear = currentCentury + yearSuffix;
      if (fullYear > currentYear) {
        fullYear -= 100;
      }
      return fullYear;
    }
    return null;
  };

  // Функция для вычисления курса по году набора
  const getCourseFromAdmissionYear = (admissionYear) => {
    if (!admissionYear) return null;
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // getMonth() возвращает 0-11
    
    // Если сейчас до сентября (месяц < 9), то учебный год еще не начался
    const academicYear = currentMonth < 9 ? currentYear - 1 : currentYear;
    
    // Курс = разность между текущим учебным годом и годом набора + 1
    const course = academicYear - admissionYear + 1;
    
    // Курс не может быть меньше 1 или больше 6
    if (course < 1) return null;
    if (course > 6) return 6;
    
    return course;
  };

  // Функция для получения информации об образовании из названия
  const getEducationInfoFromName = (name) => {
    const levelMatch = name.match(/^\d{2}(\d)/);
    const formMatch = name.match(/^\d{3}(\d)/);
    
    const levelMap = { 1: 'bachelor', 3: 'master' };
    const formMap = { 1: 'full_time', 2: 'evening', 3: 'part_time' };
    
    return {
      level: levelMatch ? levelMap[parseInt(levelMatch[1])] : null,
      form: formMatch ? formMap[parseInt(formMatch[1])] : null
    };
  };

  // Фильтрация групп по поисковому запросу
  const filteredGroups = groups.filter(group => {
    const deptInfo = getDepartmentInfo(group.department_id);
    return (
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.specialization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deptInfo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deptInfo.faculty.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Управление группами</h1>
          <p className="text-gray-600 mt-1">Создание и редактирование учебных групп по кафедрам</p>
          <p className="text-sm text-gray-500 mt-1">
            Курс вычисляется автоматически по году набора (формат: YYXX-XXXX.X, где YY - год набора)
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Добавить группу
        </button>
      </div>

      {/* Поиск */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-red-500 focus:border-red-500"
            placeholder="Поиск групп по названию, специализации, кафедре или факультету..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Список групп */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Список групп ({filteredGroups.length})
            </h3>
          </div>

          {filteredGroups.length === 0 ? (
            <div className="text-center py-12">
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchQuery ? 'Группы не найдены' : 'Нет групп'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery 
                  ? 'Попробуйте изменить поисковый запрос'
                  : 'Создайте первую группу для начала работы'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Группа
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Кафедра
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Факультет
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Курс/Год набора
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Образование
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Действия</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredGroups.map((group) => {
                    const deptInfo = getDepartmentInfo(group.department_id);
                    const admissionYear = getAdmissionYearFromName(group.name);
                    const course = getCourseFromAdmissionYear(admissionYear);
                    const educationInfo = getEducationInfoFromName(group.name);
                    
                    return (
                      <tr key={group.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <UserGroupIcon className="h-5 w-5 text-gray-400 mr-3" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {group.name}
                              </div>
                              {group.specialization && (
                                <div className="text-sm text-gray-500">
                                  {group.specialization}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">
                              {deptInfo.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <AcademicCapIcon className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">
                              {deptInfo.faculty}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                            <div className="text-sm text-gray-900">
                              <div>{course ? `${course} курс` : 'Не определен'}</div>
                              {admissionYear && (
                                <div className="text-gray-500">Набор {admissionYear}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            <div>
                              {educationInfo.level ? getEducationLevelLabel(educationInfo.level) : 
                               (group.education_level ? getEducationLevelLabel(group.education_level) : 'Не указан')}
                            </div>
                            <div className="text-gray-500">
                              {educationInfo.form ? getEducationFormLabel(educationInfo.form) : 
                               (group.education_form ? getEducationFormLabel(group.education_form) : 'Не указана')}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => openEditModal(group)}
                              className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                              title="Редактировать"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(group)}
                              className="text-red-600 hover:text-red-900 p-1 rounded"
                              title="Удалить"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {modalMode === 'create' ? 'Создать группу' : 'Редактировать группу'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Название группы *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Например: 2211-0101.1"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Формат: YYXX-XXXX.X (YY=год набора, 1=уровень, 1=форма обучения). Курс вычисляется автоматически.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Кафедра *
                  </label>
                  <select
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                    value={formData.department_id}
                    onChange={(e) => setFormData({...formData, department_id: e.target.value})}
                  >
                    <option value="">Выберите кафедру</option>
                    {Object.entries(getDepartmentsByFaculty()).map(([facultyName, depts]) => (
                      <optgroup key={facultyName} label={facultyName}>
                        {depts.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Факультет будет определен автоматически по выбранной кафедре
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Уровень образования
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                    value={formData.education_level}
                    onChange={(e) => setFormData({...formData, education_level: e.target.value})}
                  >
                    <option value="">Автоматически из названия</option>
                    {educationLevels.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Если не выбрано, определится автоматически (1=бакалавриат, 3=магистратура)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Форма обучения
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                    value={formData.education_form}
                    onChange={(e) => setFormData({...formData, education_form: e.target.value})}
                  >
                    <option value="">Автоматически из названия</option>
                    {educationForms.map((form) => (
                      <option key={form.value} value={form.value}>
                        {form.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Если не выбрано, определится автоматически (1=очная, 2=ОЗ, 3=заочная)
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Специализация
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                    value={formData.specialization}
                    onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                    placeholder="Например: Информационные технологии"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {submitting ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups; 