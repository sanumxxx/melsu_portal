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
  PaperClipIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

const MyRequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    loadRequest();
  }, [id]);

  const loadRequest = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/api/requests/${id}`);
      setRequest(response.data);
    } catch (err) {
      console.error('Ошибка загрузки заявки:', err);
      setError('Не удалось загрузить заявку: ' + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async () => {
    try {
      setSubmitLoading(true);
      setError(null);
      
      await api.post(`/api/requests/${id}/submit`);
      
      // Перезагружаем заявку
      await loadRequest();
    } catch (err) {
      console.error('Ошибка отправки заявки:', err);
      setError('Ошибка отправки заявки: ' + getErrorMessage(err));
    } finally {
      setSubmitLoading(false);
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
            onClick={() => navigate('/requests/my')}
            variant="ghost"
            size="sm"
            className="self-start"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            К моим заявкам
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{request.title}</h1>
            <p className="text-gray-600 mt-1">Моя заявка #{request.id}</p>
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
                canDelete={request.status?.toUpperCase() === 'DRAFT'}
              />
              
              {/* Информация о том, как добавлять файлы */}
              {request.status?.toUpperCase() === 'DRAFT' && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">
                      Как добавить файлы
                    </h4>
                    <p className="text-sm text-blue-700">
                      Файлы прикрепляются к конкретным полям формы. 
                      Вернитесь к редактированию заявки и найдите поля типа "Файл" 
                      для загрузки документов.
                    </p>
                  </div>
                </div>
              )}
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
                    <UserIcon className="h-8 w-8 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {request.assignee.first_name} {request.assignee.last_name}
                      </p>
                      <p className="text-sm text-gray-500">{request.assignee.email}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Статус и действия */}
          <Card>
            <CardHeader>
              <CardTitle>Статус заявки</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Кнопки для редактируемых заявок */}
              {['DRAFT', 'SUBMITTED', 'IN_REVIEW'].includes(request.status?.toUpperCase()) && (
                <div className="space-y-3">
                  <Button
                    onClick={() => navigate(`/requests/edit/${request.id}`)}
                    variant="outline"
                    className="w-full"
                  >
                    <PencilIcon className="h-4 w-4 mr-2" />
                    Редактировать заявку
                  </Button>
                  
                  {/* Кнопка отправки для черновиков */}
                  {request.status?.toUpperCase() === 'DRAFT' && (
                    <>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-700 mb-3">
                          Заявка в статусе черновика.<br/>
                          Нажмите кнопку ниже, чтобы отправить её на рассмотрение.
                        </p>
                      </div>
                      <Button
                        onClick={handleSubmitRequest}
                        variant="primary"
                        className="w-full"
                        disabled={submitLoading}
                      >
                        {submitLoading ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Отправка...
                          </div>
                        ) : (
                          <>
                            <DocumentTextIcon className="h-4 w-4 mr-2" />
                            Отправить заявку
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Информационные сообщения для других статусов */}
              {request.status?.toUpperCase() === 'IN_REVIEW' && (
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <ClockIcon className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-sm text-blue-700">
                    Заявка отправлена на рассмотрение.<br/>
                    Ожидайте решения ответственного.
                  </p>
                  {request.assignee && (
                    <p className="text-xs text-blue-600 mt-2">
                      Ответственный: {request.assignee.first_name} {request.assignee.last_name}
                    </p>
                  )}
                </div>
              )}

              {request.status?.toUpperCase() === 'APPROVED' && (
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <CheckCircleIcon className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-green-700">
                    Заявка взята в работу!<br/>
                    Выполняется ответственным.
                  </p>
                </div>
              )}

              {request.status?.toUpperCase() === 'REJECTED' && (
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <XCircleIcon className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <p className="text-sm text-red-700">
                    Заявка отклонена.<br/>
                    Обратитесь к ответственному за подробностями.
                  </p>
                </div>
              )}

              {request.status?.toUpperCase() === 'COMPLETED' && (
                <div className="text-center p-4 bg-emerald-50 rounded-lg">
                  <CheckCircleIcon className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm text-emerald-700">
                    Заявка выполнена!<br/>
                    Спасибо за обращение.
                  </p>
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
        </div>
      </div>
    </div>
  );
};

export default MyRequestDetail; 