import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../../services/api';
import { Card, CardHeader, CardContent, CardTitle } from '../common/Card';
import Button from '../common/Button';
import { Loader } from '../common/Loader';
import { Alert } from '../common/Alert';
import {
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  UserIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

const AssignedRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = statusFilter !== 'all' ? { status: statusFilter.toLowerCase() } : {};
      const response = await api.get('/api/requests/assigned', { params });
      setRequests(response.data);
    } catch (err) {
      console.error('Ошибка загрузки заявок:', err);
      setError('Не удалось загрузить заявки: ' + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    const normalizedStatus = status?.toUpperCase();
    switch (normalizedStatus) {
      case 'DRAFT':
        return <DocumentTextIcon className="h-5 w-5 text-gray-500" />;
      case 'SUBMITTED':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'IN_REVIEW':
        return <ClockIcon className="h-5 w-5 text-blue-500" />;
      case 'APPROVED':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'REJECTED':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'COMPLETED':
        return <CheckCircleIcon className="h-5 w-5 text-emerald-600" />;
      default:
        return <DocumentTextIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusLabel = (status) => {
    const normalizedStatus = status?.toUpperCase();
    switch (normalizedStatus) {
      case 'DRAFT':
        return 'Черновик';
      case 'SUBMITTED':
        return 'Подана';
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
      case 'SUBMITTED':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
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

  const getPriorityByDeadline = (deadline) => {
    if (!deadline) return 'normal';
    
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const daysUntilDeadline = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDeadline < 1) return 'overdue';
    if (daysUntilDeadline <= 2) return 'urgent';
    if (daysUntilDeadline <= 5) return 'soon';
    return 'normal';
  };



  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDeadline = (deadline) => {
    if (!deadline) return null;
    
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const daysUntilDeadline = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDeadline < 0) {
      return `Просрочено на ${Math.abs(daysUntilDeadline)} дн.`;
    } else if (daysUntilDeadline === 0) {
      return 'Сегодня';
    } else if (daysUntilDeadline === 1) {
      return 'Завтра';
    } else {
      return `Через ${daysUntilDeadline} дн.`;
    }
  };

  const handleViewRequest = (request) => {
    navigate(`/requests/${request.id}`, { state: { from: 'assigned' } });
  };

  if (loading) {
    return <Loader text="Загрузка заявок..." />;
  }

  // Сортируем заявки по статусу и дате создания
  const sortedRequests = [...requests].sort((a, b) => {
    // Определяем приоритет по статусу
    const getStatusPriority = (status) => {
      const normalizedStatus = status?.toUpperCase();
      switch (normalizedStatus) {
        case 'IN_REVIEW':
          return 0; // Высший приоритет - можно взять в работу
        case 'APPROVED':
          return 1; // Второй приоритет - взято в работу
        case 'DRAFT':
        case 'SUBMITTED':
        case 'REJECTED':
          return 2; // Обычный приоритет
        case 'COMPLETED':
          return 3; // Низший приоритет - выполненные заявки в конце
        default:
          return 2;
      }
    };

    const priorityA = getStatusPriority(a.status);
    const priorityB = getStatusPriority(b.status);
    
    // Сначала сортируем по приоритету статуса
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Если статус одинаковый, сортируем по дате создания (новые сначала)
    return new Date(b.created_at) - new Date(a.created_at);
  });

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Назначенные мне</h1>
          <p className="text-gray-600 mt-1 sm:mt-2">Заявки, которые назначены на вас для рассмотрения и выполнения</p>
        </div>
      </div>

      {error && (
        <Alert variant="error" message={error} />
      )}

      {/* Фильтры */}
      <Card>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Все заявки
            </button>
            {['IN_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {getStatusLabel(status)}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Статистика */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-red-50 border-red-200 hover:bg-red-100 transition-colors cursor-pointer" onClick={() => setStatusFilter('all')}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600 mb-2 sm:mb-0 sm:mr-3 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-red-600">Просроченные</p>
                <p className="text-2xl font-bold text-red-700">
                  {requests.filter(r => getPriorityByDeadline(r.deadline) === 'overdue').length}
                </p>
                <p className="text-xs text-red-500 mt-1">требуют внимания</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200 hover:bg-orange-100 transition-colors cursor-pointer" onClick={() => setStatusFilter('all')}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <ClockIcon className="h-8 w-8 text-orange-600 mb-2 sm:mb-0 sm:mr-3 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-orange-600">Срочные</p>
                <p className="text-2xl font-bold text-orange-700">
                  {requests.filter(r => getPriorityByDeadline(r.deadline) === 'urgent').length}
                </p>
                <p className="text-xs text-orange-500 mt-1">до 2 дней</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer" onClick={() => setStatusFilter('IN_REVIEW')}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <DocumentTextIcon className="h-8 w-8 text-blue-600 mb-2 sm:mb-0 sm:mr-3 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-blue-600">На рассмотрении</p>
                <p className="text-2xl font-bold text-blue-700">
                  {requests.filter(r => r.status?.toUpperCase() === 'IN_REVIEW').length}
                </p>
                <p className="text-xs text-blue-500 mt-1">ожидают решения</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200 hover:bg-green-100 transition-colors cursor-pointer" onClick={() => setStatusFilter('COMPLETED')}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <CheckCircleIcon className="h-8 w-8 text-green-600 mb-2 sm:mb-0 sm:mr-3 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-green-600">Завершенные</p>
                <p className="text-2xl font-bold text-green-700">
                  {requests.filter(r => r.status?.toUpperCase() === 'COMPLETED').length}
                </p>
                <p className="text-xs text-green-500 mt-1">выполнено</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Список заявок */}
      <Card>
        <CardHeader>
          <CardTitle>
            {statusFilter === 'all' ? 'Все заявки' : `Заявки: ${getStatusLabel(statusFilter)}`}
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({requests.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <DocumentTextIcon className="mx-auto h-16 w-16 text-gray-400" />
                <h3 className="mt-6 text-xl font-medium text-gray-900">
                  {statusFilter === 'all' ? 'Нет назначенных заявок' : `Нет заявок со статусом "${getStatusLabel(statusFilter)}"`}
                </h3>
                <p className="mt-3 text-sm text-gray-500 leading-relaxed">
                  {statusFilter === 'all' 
                    ? 'В данный момент на вас не назначено ни одной заявки. Как только появятся новые заявки для рассмотрения, они отобразятся здесь.'
                    : `Заявки со статусом "${getStatusLabel(statusFilter)}" отсутствуют. Попробуйте выбрать другой фильтр.`
                  }
                </p>
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    <DocumentTextIcon className="h-4 w-4 mr-2" />
                    Показать все заявки
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {sortedRequests.map((request) => {
                const priority = getPriorityByDeadline(request.deadline);
                const deadlineText = formatDeadline(request.deadline);
                
                return (
                  <div
                    key={request.id}
                    className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        {getStatusIcon(request.status)}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 leading-5">
                            {request.title}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {request.template_name}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(request.status)}`}>
                          {getStatusLabel(request.status)}
                        </span>
                        {priority !== 'normal' && deadlineText && (
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                            priority === 'overdue' ? 'bg-red-100 text-red-800' :
                            priority === 'urgent' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {deadlineText}
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-500">
                        <div className="flex items-center">
                          <UserIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                          <span className="truncate">От: {request.author.first_name} {request.author.last_name}</span>
                        </div>
                        <div>Создана: {formatDate(request.created_at)}</div>
                        {request.deadline && (
                          <div>Срок: {formatDate(request.deadline)}</div>
                        )}
                      </div>
                      
                      <Button
                        onClick={() => handleViewRequest(request)}
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                      >
                        <EyeIcon className="h-4 w-4 mr-2" />
                        Открыть заявку
                      </Button>
                    </div>
                  </div>
                );
                              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AssignedRequests; 