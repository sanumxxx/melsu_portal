import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import api from '../../services/api';
import MyRequestDetail from './MyRequestDetail';
import AssigneeRequestDetail from './AssigneeRequestDetail';
import { Loader } from '../common/Loader';

const RequestRouter = () => {
  const { id } = useParams();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [componentToRender, setComponentToRender] = useState(null);

  useEffect(() => {
    loadUserAndRequest();
  }, [id]);

  const loadUserAndRequest = async () => {
    try {
      setLoading(true);
      
      // Проверяем контекст навигации из state и URL параметров
      const fromAssigned = location.state?.from === 'assigned';
      const fromMy = location.state?.from === 'my';
      const searchParams = new URLSearchParams(location.search);
      const fromNotification = searchParams.get('from') === 'notification';
      const notificationType = searchParams.get('type');
      
      console.log('Navigation context:', { fromAssigned, fromMy, fromNotification, notificationType, locationState: location.state });
      
      // Если есть явный контекст - используем его
      if (fromAssigned) {
        console.log('Using assignee component based on navigation context');
        setComponentToRender('assignee');
        setLoading(false);
        return;
      }
      
      if (fromMy) {
        console.log('Using my component based on navigation context');
        setComponentToRender('my');
        setLoading(false);
        return;
      }
      
      // Если переход из уведомления - проверяем тип уведомления
      if (fromNotification) {
        console.log('Navigation from notification:', notificationType);
        
        // Для уведомлений о новых заявках (назначение) - показываем интерфейс исполнителя
        if (notificationType === 'new_request') {
          console.log('Using assignee component - new request notification');
          setComponentToRender('assignee');
          setLoading(false);
          return;
        }
        
        // Для уведомлений об изменении статуса - показываем интерфейс автора
        if (notificationType === 'status_change' || notificationType === 'request_updated') {
          console.log('Using my component - status change notification');
          setComponentToRender('my');
          setLoading(false);
          return;
        }
        
        // Если тип неизвестен - загружаем данные и определяем роль
        console.log('Unknown notification type - loading data to determine role');
      }
      
      // Если контекста нет - пытаемся загрузить данные для определения по ролям
      try {
        const [userResponse, requestResponse] = await Promise.all([
          api.getCurrentUser(),
          api.get(`/api/requests/${id}`)
        ]);
        
        setCurrentUser(userResponse.data);
        setRequest(requestResponse.data);
        
        // Определяем по ролям
        determineComponentByRoles(userResponse.data, requestResponse.data);
      } catch (dataErr) {
        console.error('Ошибка загрузки данных пользователя/заявки:', dataErr);
        // Если не удалось загрузить данные - показываем компонент по умолчанию
        console.log('Using my component as fallback');
        setComponentToRender('my');
      }
      
    } catch (err) {
      console.error('Ошибка в loadUserAndRequest:', err);
      setComponentToRender('my');
    } finally {
      setLoading(false);
    }
  };

  const determineComponentByRoles = (user, requestData) => {
    // Проверяем роли пользователя
    const isAuthor = user && requestData && user.id === requestData.author_id;
    
    // Проверяем является ли пользователь назначенным (либо assignee_id, либо в possible_assignees)
    const isDirectAssignee = user && requestData && requestData.assignee_id && user.id === requestData.assignee_id;
    const isPossibleAssignee = user && requestData && requestData.possible_assignees && 
                               Array.isArray(requestData.possible_assignees) && 
                               requestData.possible_assignees.includes(user.id);
    const isAssignee = isDirectAssignee || isPossibleAssignee;

    console.log('Determining by roles:', {
      isAuthor,
      isAssignee,
      isDirectAssignee,
      isPossibleAssignee,
      userId: user?.id,
      authorId: requestData?.author_id,
      assigneeId: requestData?.assignee_id,
      possibleAssignees: requestData?.possible_assignees
    });

    // Если пользователь только ответственный - показываем интерфейс ответственного
    if (isAssignee && !isAuthor) {
      console.log('Showing assignee component - user is assignee only');
      setComponentToRender('assignee');
      return;
    }
    


    // Если пользователь только автор - показываем интерфейс автора
    if (isAuthor && !isAssignee) {
      console.log('Showing my component - user is author only');
      setComponentToRender('my');
      return;
    }

    // Если пользователь одновременно автор и ответственный - пытаемся определить контекст
    if (isAuthor && isAssignee) {
      
      const referrer = document.referrer;
      
      if (referrer.includes('/requests/assigned')) {
        console.log('Showing assignee component - came from assigned (referrer)');
        setComponentToRender('assignee');
        return;
      }
      
      if (referrer.includes('/requests/my')) {
        console.log('Showing my component - came from my requests (referrer)');
        setComponentToRender('my');
        return;
      }
      
      // По умолчанию для автора-ответственного показываем интерфейс ответственного
      console.log('Showing assignee component - default for author+assignee');
      setComponentToRender('assignee');
      return;
    }

    // По умолчанию показываем компонент для своих заявок
    console.log('Showing my component - default fallback by roles');
    setComponentToRender('my');
  };

  if (loading) {
    return <Loader text="Загрузка заявки..." />;
  }

  // Рендерим выбранный компонент
  if (componentToRender === 'assignee') {
    return <AssigneeRequestDetail />;
  } else {
    return <MyRequestDetail />;
  }
};

export default RequestRouter; 