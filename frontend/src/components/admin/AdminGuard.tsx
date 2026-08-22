import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { sessionService } from '../../services/sessionService';
import { roleService } from '../../services/roleService';

// /adminsetting/<하위경로> -> DEFAULT_MENUS의 menuKey. 여기 없는 경로는 기본 차단(추가 시 여기도 같이 추가해야 함).
const ADMIN_ROUTE_MENU_KEYS: Record<string, string> = {
  '': 'admin_dash',
  'dashboard': 'admin_dash',
  'faith-records': 'admin_faith',
  'church-detail': 'admin_detail',
  'weekly-worship': 'weekly_worship',
  'weekly-worship/history': 'weekly_worship_history',
  'evangelism-bulk': 'evangelism_bulk',
  'membership-bulk': 'membership_bulk',
  'weekly-report-status': 'weekly_report_status',
  'weekly-report-schema': 'weekly_report_schema',
  'graph-management/board': 'graph_management_board',
  'users': 'users',
  'roles': 'roles',
  'permissions': 'perm',
  'bot': 'admin_bot',
  'i18n': 'i18n',
  'settings': 'sys',
  'backdoor-ips': 'backdoor_ips',
  'messages': 'admin_messages',
  'login-logs': 'login_logs',
  'access-logs': 'access_logs',
  'file-upload-logs': 'file_upload_logs',
  'file-download-logs': 'file_download_logs',
  'org-structure': 'org_structure',
  'approval-line': 'approval_line',
  'approval-log': 'approval_log',
};

export const AdminGuard: React.FC = () => {
  const location = useLocation();

  if (!sessionService.isSessionValid()) {
    alert('로그인 세션이 만료되었거나 존재하지 않습니다. (30분 경과) 다시 로그인해주세요.');
    return <Navigate to="/login" replace />;
  }

  const userJson = localStorage.getItem('user');
  try {
    const user = JSON.parse(userJson || '{}');
    const userRole = user.role || '';

    const isAdmin = userRole === 'ROLE_ADMIN' || userRole === 'ADMIN' || userRole === '관리자' || userRole === 'ROLE_관리자';
    if (isAdmin) return <Outlet />;

    // 현재 경로에 대응하는 관리자 하위 메뉴 키만 확인한다 — "adminsetting 메뉴 중 아무거나 하나라도 있으면
    // 전체 통과"였던 예전 방식은 다른 관리자 페이지 URL을 직접 입력/링크로 접속하면 그대로 뚫렸다.
    const relPath = location.pathname.replace(/^\/adminsetting\/?/, '');
    const menuKey = ADMIN_ROUTE_MENU_KEYS[relPath];
    const hasAccess = !!menuKey && roleService.canRoleAccessMenu(userRole, menuKey).read;

    if (!hasAccess) {
      alert('관리자 설정 페이지에 접근할 수 있는 권한이 없습니다.');
      return <Navigate to="/" replace />;
    }
  } catch (e) {
    sessionService.clearSession();
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
