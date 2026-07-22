import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { sessionService } from '../../services/sessionService';

export const AdminGuard: React.FC = () => {
  if (!sessionService.isSessionValid()) {
    alert('로그인 세션이 만료되었거나 존재하지 않습니다. (30분 경과) 다시 로그인해주세요.');
    return <Navigate to="/login" replace />;
  }

  const userJson = localStorage.getItem('user');
  try {
    const user = JSON.parse(userJson || '{}');
    if (user.role !== 'ROLE_ADMIN' && user.role !== 'ADMIN') {
      alert('관리자 권한(ROLE_ADMIN)이 필요한 페이지입니다.');
      return <Navigate to="/" replace />;
    }
  } catch (e) {
    sessionService.clearSession();
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
