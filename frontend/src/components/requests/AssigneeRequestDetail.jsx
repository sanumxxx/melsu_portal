import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../../services/api';
import { Card, CardHeader, CardContent, CardTitle } from '../common/Card';
import Button from '../common/Button';
import { Loader } from '../common/Loader';
import { Alert } from '../common/Alert';
import RequestFilesDisplay from '../common/RequestFilesDisplay';
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  CogIcon,
  PaperClipIcon
} from '@heroicons/react/24/outline';

const AssigneeRequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadRequestAndUser();
  }, [id]);

  const loadRequestAndUser = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [requestResponse, userResponse] = await Promise.all([
        api.get(`/api/requests/${id}`),
        api.getCurrentUser()
      ]);
      
      setRequest(requestResponse.data);
      setCurrentUser(userResponse.data);
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
      setError('Не удалось загрузить данные: ' + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const loadRequest = async () => {
    try {
      setError(null);
      const response = await api.get(`/api/requests/${id}`);
      setRequest(response.data);
    } catch (err) {
      console.error('Ошибка загрузки заявки:', err);
      setError('Не удалось загрузить заявку: ' + getErrorMessage(err));
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      setActionLoading(true);
      setError(null);
      
      await api.put(`/api/requests/${id}`, {
        status: newStatus
      });
      
      await loadRequest();
    } catch (err) {
      console.error('Ошибка изменения статуса:', err);
      setError('Ошибка изменения статуса: ' + getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleTakeRequest = async () => {
    try {
      setActionLoading(true);
      setError(null);
      
      await api.post(`/api/requests/${id}/take`);
      
      await loadRequest();
    } catch (err) {
      console.error('Ошибка взятия заявки в работу:', err);
      setError('Ошибка взятия заявки в работу: ' + getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    const normalizedStatus = status?.toUpperCase();
    switch (normalizedStatus) {
      case 'DRAFT':
        return <DocumentTextIcon className="h-6 w-6 text-gray-500" />;
      case 'IN_REVIEW':
        return <ClockIcon className="h-6 w-6 text-blue-500" />;
      case 'APPROVED':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'REJECTED':
        return <XCircleIcon className="h-6 w-6 text-red-500" />;
      case 'COMPLETED':
        return <CheckCircleIcon className="h-6 w-6 text-emerald-600" />;
      default:
        return <DocumentTextIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  const getStatusLabel = (status) => {
    const normalizedStatus = status?.toUpperCase();
    switch (normalizedStatus) {
      case 'DRAFT':
        return 'Черновик';
      case 'IN_REVIEW':
        return 'На рассмотрении';
      case 'APPROVED':
        return 'Взят в работу';
      case 'REJECTED':
        return 'Отклонена';
      case 'COMPLETED':
        return 'Выполнена';
      default:
        return status;
    }
  };

  const getStatusColor = (status) => {
    const normalizedStatus = status?.toUpperCase();
    switch (normalizedStatus) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800 border border-gray-200';
      case 'IN_REVIEW':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'APPROVED':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderFormData = (formData) => {
    if (!formData || typeof formData !== 'object') {
      return <p className="text-gray-500">Нет данных формы</p>;
    }

    return (
      <div className="space-y-4">
        {Object.entries(formData).map(([key, value]) => {
          // Пропускаем поля с файлами, так как они отображаются в отдельном разделе
          if (key.toLowerCase().includes('file') || key.toLowerCase().includes('файл')) {
            return null;
          }

          return (
            <div key={key} className="border-b border-gray-200 pb-2">
              <dt className="text-sm font-medium text-gray-500 capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {Array.isArray(value) ? value.join(', ') : 
                 typeof value === 'object' ? JSON.stringify(value) : 
                 String(value)}
              </dd>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return <Loader text="Загрузка заявки..." />;
  }

  if (!request) {
    return (
      <div className="p-6">
        <Alert variant="error" message="Заявка не найдена" />
        <Button 
          onClick={() => navigate(-1)}
          variant="outline"
          className="mt-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Назад
        </Button>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <Button 
            onClick={() => navigate('/requests/assigned')}
            variant="ghost"
            size="sm"
            className="self-start"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            К рассмотрению заявок
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{request.title}</h1>
            <p className="text-gray-600 mt-1">Рассмотрение заявки #{request.id}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {getStatusIcon(request.status)}
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
            {getStatusLabel(request.status)}
          </span>
        </div>
      </div>

      {error && (
        <Alert variant="error" message={error} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Основная информация */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Детали заявки */}
          <Card>
            <CardHeader>
              <CardTitle>Информация о заявке</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Описание</label>
                <p className="mt-1 text-gray-900">
                  {request.description || 'Описание не указано'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Шаблон</label>
                <p className="mt-1 text-gray-900">{request.template?.name}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Создана</label>
                  <p className="mt-1 text-gray-900 flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                    {formatDate(request.created_at)}
                  </p>
                </div>
                
                {request.deadline && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Срок выполнения</label>
                    <p className="mt-1 text-gray-900 flex items-center">
                      <ClockIcon className="h-4 w-4 mr-2 text-gray-400" />
                      {formatDate(request.deadline)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Данные формы */}
          <Card>
            <CardHeader>
              <CardTitle>Данные формы</CardTitle>
            </CardHeader>
            <CardContent>
              {renderFormData(request.form_data)}
            </CardContent>
          </Card>

          {/* Прикрепленные файлы */}
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center">
                  <PaperClipIcon className="h-5 w-5 mr-2" />
                  Прикрепленные файлы
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RequestFilesDisplay 
                requestId={request.id} 
                canDelete={false} // Проверяющие не могут удалять файлы
              />
            </CardContent>
          </Card>
        </div>

        {/* Боковая панель */}
        <div className="space-y-4 sm:space-y-6">
          {/* Участники */}
          <Card>
            <CardHeader>
              <CardTitle>Участники</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Автор заявки</label>
                <div className="mt-2 flex items-center space-x-3">
                  <UserIcon className="h-8 w-8 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {request.author.first_name} {request.author.last_name}
                    </p>
                    <p className="text-sm text-gray-500">{request.author.email}</p>
                  </div>
                </div>
              </div>

              {request.assignee && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Ответственный</label>
                  <div className="mt-2 flex items-center space-x-3">
                    <UserIcon className="h-8 w-8 text-blue-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {request.assignee.first_name} {request.assignee.last_name}
                      </p>
                      <p className="text-sm text-gray-500">{request.assignee.email}</p>
                      {currentUser && currentUser.id === request.assignee.id ? (
                        <p className="text-xs text-blue-600 font-medium">Это вы</p>
                      ) : (
                        <p className="text-xs text-gray-500 font-medium">Взято другим пользователем</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Действия */}
          <Card>
            <CardHeader>
              <CardTitle>Действия по заявке</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Действия для заявок на рассмотрении */}
              {request.status?.toUpperCase() === 'IN_REVIEW' && (
                <>
                  <div className="text-center p-3 bg-blue-50 rounded-lg mb-4">
                    <p className="text-sm text-blue-700">
                      {request.assignee_id ? 
                        (currentUser && currentUser.id === request.assignee_id ? 
                          'Заявка ожидает вашего решения' : 
                          'Заявка взята другим пользователем'
                        ) : 
                        'Заявка доступна для взятия в работу'
                      }
                    </p>
                  </div>
                  
                  {!request.assignee_id ? (
                    // Заявка еще не взята - показываем кнопку "Взять в работу"
                    <Button
                      onClick={() => handleTakeRequest()}
                      variant="success"
                      className="w-full"
                      disabled={actionLoading}
                    >
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      Взять в работу
                    </Button>
                  ) : (
                    // Заявка уже взята
                    currentUser && currentUser.id === request.assignee_id ? (
                      // Взята текущим пользователем - показываем кнопки действий
                      <>
                        <div className="space-y-2">
                          <Button
                            onClick={() => handleStatusChange('approved')}
                            variant="success"
                            className="w-full"
                            disabled={actionLoading}
                          >
                            <CheckCircleIcon className="h-4 w-4 mr-2" />
                            Подтвердить выполнение
                          </Button>
                          <Button
                            onClick={() => handleStatusChange('rejected')}
                            variant="danger"
                            className="w-full"
                            disabled={actionLoading}
                          >
                            <XCircleIcon className="h-4 w-4 mr-2" />
                            Отклонить заявку
                          </Button>
                        </div>
                      </>
                    ) : (
                      // Взята другим пользователем - показываем информационное сообщение
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <UserIcon className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                        <p className="text-sm text-orange-700">
                          Заявка уже взята в работу пользователем:<br/>
                          <strong>{request.assignee.first_name} {request.assignee.last_name}</strong>
                        </p>
                      </div>
                    )
                  )}
                </>
              )}
              
              {/* Кнопка завершения для взятых в работу заявок */}
              {request.status?.toUpperCase() === 'APPROVED' && (
                <>
                  {currentUser && currentUser.id === request.assignee_id ? (
                    // Заявка взята текущим пользователем
                    <>
                      <div className="text-center p-3 bg-green-50 rounded-lg mb-4">
                        <p className="text-sm text-green-700">
                          Заявка взята в работу. Выполните необходимые действия и завершите заявку.
                        </p>
                      </div>
                      <Button
                        onClick={() => handleStatusChange('completed')}
                        variant="success"
                        className="w-full"
                        disabled={actionLoading}
                      >
                        <CheckCircleIcon className="h-4 w-4 mr-2" />
                        Завершить заявку
                      </Button>
                    </>
                  ) : (
                    // Заявка взята другим пользователем
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <CheckCircleIcon className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-green-700">
                        Заявка взята в работу пользователем:<br/>
                        <strong>{request.assignee?.first_name} {request.assignee?.last_name}</strong>
                      </p>
                      <p className="text-xs text-green-600 mt-2">
                        Ожидайте завершения работы
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Информационные сообщения для других статусов */}
              {request.status?.toUpperCase() === 'DRAFT' && (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Заявка в статусе черновика.<br/>
                    Ожидается отправка автором.
                  </p>
                </div>
              )}

              {request.status?.toUpperCase() === 'REJECTED' && (
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <XCircleIcon className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <p className="text-sm text-red-700">
                    {currentUser && currentUser.id === request.assignee_id ? 
                      'Заявка отклонена вами.' : 
                      `Заявка отклонена пользователем: ${request.assignee?.first_name} ${request.assignee?.last_name}`
                    }
                  </p>
                </div>
              )}

              {request.status?.toUpperCase() === 'COMPLETED' && (
                <div className="text-center p-4 bg-emerald-50 rounded-lg">
                  <CheckCircleIcon className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm text-emerald-700">
                    Заявка успешно выполнена!
                  </p>
                </div>
              )}

              {actionLoading && (
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
                    <span className="text-sm text-yellow-700">Обработка...</span>
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full"
                disabled
              >
                <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
                Комментарии (скоро)
              </Button>
            </CardContent>
          </Card>

          {/* Дополнительные функции */}
          <Card>
            <CardHeader>
              <CardTitle>Дополнительно</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                disabled
              >
                <CogIcon className="h-4 w-4 mr-2" />
                Переназначить ответственного
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled
              >
                <DocumentTextIcon className="h-4 w-4 mr-2" />
                Запросить дополнительную информацию
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AssigneeRequestDetail; 