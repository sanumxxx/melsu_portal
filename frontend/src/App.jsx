import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Profile from './components/Profile';
import Portfolio from './components/Portfolio';
import Schedule from './components/Schedule';
import Users from './components/Users';
import Structure from './components/Structure';
import Login from './components/auth/Login';
import RegisterNew from './components/auth/RegisterNew';
import RequestBuilder from './components/admin/RequestBuilder';
import RoleManagement from './components/admin/RoleManagement';
import RequestForm from './components/RequestForm';
import MyRequests from './components/requests/MyRequests';
import AssignedRequests from './components/requests/AssignedRequests';
import RequestRouter from './components/requests/RequestRouter';
 
import api from './services/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await api.getUserProfile();
        setUser(response.data);
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        {user ? (
          <Layout user={user} onLogout={handleLogout}>
            <Routes>
              <Route path="/" element={<Navigate to="/profile" replace />} />
              <Route path="/profile" element={<Profile user={user} />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/requests" element={<RequestForm />} />
              <Route path="/requests/my" element={<MyRequests />} />
              <Route path="/requests/assigned" element={<AssignedRequests />} />
              <Route path="/requests/:id" element={<RequestRouter />} />

              {/* Маршруты для админов */}
              {user?.roles?.includes('admin') && (
                <>
                  <Route path="/users/:type" element={<Users />} />
                  <Route path="/users" element={<Navigate to="/users/all" replace />} />
                  <Route path="/structure" element={<Structure />} />
                  <Route path="/admin/structure" element={<Structure />} />
                  <Route path="/request-builder" element={<RequestBuilder />} />
                  <Route path="/admin/roles" element={<RoleManagement />} />
                </>
              )}
              
              {/* Fallback для неизвестных роутов */}
              <Route path="*" element={<Navigate to="/profile" replace />} />
            </Routes>
          </Layout>
        ) : (
          <Routes>
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/register" element={<RegisterNew onLogin={handleLogin} />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        )}
        
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              theme: {
                primary: 'green',
                secondary: 'black',
              },
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App; 