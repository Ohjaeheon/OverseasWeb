import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export const AdminGuard: React.FC = () => {
  const userJson = localStorage.getItem('user');
  const token = localStorage.getItem('accessToken');

  if (!token || !userJson) {
    alert('로그인이 필요한 페이지입니다.');
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userJson);
    if (user.role !== 'ROLE_ADMIN' && user.role !== 'ADMIN') {
      alert('관리자 권한(ROLE_ADMIN)이 필요한 페이지입니다.');
      return <Navigate to="/" replace />;
    }
  } catch (e) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
