import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../../services/api';
import { Card, CardHeader, CardContent, CardTitle } from '../common/Card';
import Button from '../common/Button';
import { Loader } from '../common/Loader';
import { Alert } from '../common/Alert';
import {
  PlusIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

const MyRequests = () => {
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
      const response = await api.get('/api/requests/my', { params });
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCreateRequest = () => {
    navigate('/requests');
  };

  const handleViewRequest = (request) => {
    navigate(`/requests/${request.id}`, { state: { from: 'my' } });
  };

  if (loading) {
    return <Loader text="Загрузка заявок..." />;
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Мои заявки</h1>
          <p className="text-gray-600 mt-1 sm:mt-2">Заявки, которые вы создали</p>
        </div>
        <Button 
          onClick={handleCreateRequest}
          variant="primary"
          disabled={loading}
          className="w-full sm:w-auto"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Создать заявку
        </Button>
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
            {['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED'].map((status) => (
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
            <div className="text-center py-8">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                {statusFilter === 'all' ? 'Нет заявок' : `Нет заявок со статусом "${getStatusLabel(statusFilter)}"`}
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Создайте свою первую заявку, чтобы начать работу с системой
              </p>
              <Button 
                onClick={handleCreateRequest}
                variant="primary"
                className="mt-4"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Создать заявку
              </Button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {requests.map((request) => (
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
                      {request.assignee && ['IN_REVIEW', 'APPROVED'].includes(request.status?.toUpperCase()) && (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                          <span className="sm:hidden">{request.assignee.first_name} {request.assignee.last_name}</span>
                          <span className="hidden sm:inline">Исполнитель: {request.assignee.first_name} {request.assignee.last_name}</span>
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-500">
                      <div>Создана: {formatDate(request.created_at)}</div>
                      {request.deadline && (
                        <div>Срок: {formatDate(request.deadline)}</div>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {request.status?.toUpperCase() === 'DRAFT' ? (
                        <Button
                          onClick={() => navigate(`/requests/edit/${request.id}`)}
                          variant="primary"
                          size="sm"
                          className="w-full sm:w-auto"
                        >
                          <PencilIcon className="h-4 w-4 mr-2" />
                          Редактировать
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleViewRequest(request)}
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto"
                        >
                          <EyeIcon className="h-4 w-4 mr-2" />
                          Открыть заявку
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyRequests; 