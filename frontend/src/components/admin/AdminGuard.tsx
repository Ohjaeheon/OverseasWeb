import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { sessionService } from '../../services/sessionService';
import { roleService } from '../../services/roleService';

export const AdminGuard: React.FC = () => {
  if (!sessionService.isSessionValid()) {
    alert('로그인 세션이 만료되었거나 존재하지 않습니다. (30분 경과) 다시 로그인해주세요.');
    return <Navigate to="/login" replace />;
  }

  const userJson = localStorage.getItem('user');
  try {
    const user = JSON.parse(userJson || '{}');
    const userRole = user.role || '';

    const isAdmin = userRole === 'ROLE_ADMIN' || userRole === 'ADMIN' || userRole === '관리자' || userRole === 'ROLE_관리자';
    
    // Check if the user has read access to at least one administrative portal menu
    const hasAdminAccess = isAdmin || roleService.getMenuPermissions().some(m => {
      const isAdminMenu = m.category.includes('adminsetting') || m.path.startsWith('/adminsetting');
      return isAdminMenu && roleService.canRoleAccessMenu(userRole, m.menuKey).read;
    });

    if (!hasAdminAccess) {
      alert('관리자 설정 페이지에 접근할 수 있는 권한이 없습니다.');
      return <Navigate to="/" replace />;
    }
  } catch (e) {
    sessionService.clearSession();
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
