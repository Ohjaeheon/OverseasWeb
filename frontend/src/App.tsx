import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// User Pages
import { DiagnosisPage } from './pages/user/DiagnosisPage';
import { LoginPage } from './pages/auth/LoginPage';

// Admin Protection & Pages
import { AdminGuard } from './components/admin/AdminGuard';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUserPage } from './pages/admin/AdminUserPage';
import { AdminFaithPage } from './pages/admin/AdminFaithPage';
import { AdminRolePage } from './pages/admin/AdminRolePage';
import { AdminPermissionPage } from './pages/admin/AdminPermissionPage';
import { AdminI18nPage } from './pages/admin/AdminI18nPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminLoginLogsPage } from './pages/admin/AdminLoginLogsPage';
import { AdminAccessLogsPage } from './pages/admin/AdminAccessLogsPage';
import { AdminPlaceholderPage } from './pages/admin/AdminPlaceholderPage';

import { roleService } from './services/roleService';

export const App: React.FC = () => {
  React.useEffect(() => {
    const syncPermissions = async () => {
      try {
        await roleService.fetchMenuPermissionsFromDb();
      } catch (e) {
        console.warn("Failed to sync permissions on app start", e);
      }
    };

    const token = localStorage.getItem('token');
    if (token) {
      syncPermissions();
    }
  }, []);

  return (
    <BrowserRouter basename="/OverseasPortal">
      <Routes>
        {/* User Routes (Diagnosis Portal Sub-views with Explicit Route Links) */}
        <Route path="/" element={<DiagnosisPage section="home" />} />
        <Route path="/diag" element={<DiagnosisPage section="diag" />} />
        <Route path="/inspect" element={<DiagnosisPage section="inspect" />} />
        <Route path="/funnel" element={<DiagnosisPage section="funnel" />} />
        <Route path="/trend" element={<DiagnosisPage section="trend" />} />
        <Route path="/map" element={<DiagnosisPage section="map" />} />
        <Route path="/globe" element={<DiagnosisPage section="globe" />} />
        <Route path="/evangelism" element={<DiagnosisPage section="evangelism" tab="check" />} />
        <Route path="/evangelism/check" element={<DiagnosisPage section="evangelism/check" tab="check" />} />
        <Route path="/evangelism/aggregate" element={<DiagnosisPage section="evangelism/aggregate" tab="aggregate" />} />
        <Route path="/center" element={<DiagnosisPage section="center" />} />
        <Route path="/membership" element={<DiagnosisPage section="membership" />} />
        <Route path="/worship" element={<DiagnosisPage section="worship" />} />
        <Route path="/approvals/pending" element={<DiagnosisPage section="approvals/pending" />} />
        <Route path="/approvals/completed" element={<DiagnosisPage section="approvals/completed" />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Admin Routes (ROLE_ADMIN Only) */}
        <Route element={<AdminGuard />}>
          <Route path="/adminsetting" element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />

            {/* 교회/지역/개척지 */}
            <Route path="faith-records" element={<AdminFaithPage />} />
            <Route path="church-detail" element={<AdminPlaceholderPage title="교회 상세 정밀 진단" />} />

            {/* 데이터 관리 (구현예정 모듈) */}
            <Route path="evangelism" element={<AdminPlaceholderPage title="① 전도 및 가개강 관리" />} />
            <Route path="center" element={<AdminPlaceholderPage title="② 센터 운영 및 수강 관리" />} />
            <Route path="membership" element={<AdminPlaceholderPage title="③ 내무(재적/입교) 관리" />} />
            <Route path="worship" element={<AdminPlaceholderPage title="④ 예배 및 출석 통합 관리" />} />
            <Route path="worship/prev-admit" element={<AdminPlaceholderPage title="④-1 전월 입교자 출석 관리" />} />
            <Route path="worship/all-attend" element={<AdminPlaceholderPage title="④-2 전성도 출석률 집계" />} />
            <Route path="worship/absent" element={<AdminPlaceholderPage title="④-3 장기/원거리 결석 관리" />} />

            {/* 회원 및 권한 */}
            <Route path="users" element={<AdminUserPage />} />
            <Route path="roles" element={<AdminRolePage />} />
            <Route path="permissions" element={<AdminPermissionPage />} />

            {/* 로그 및 시스템 */}
            <Route path="i18n" element={<AdminI18nPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="login-logs" element={<AdminLoginLogsPage />} />
            <Route path="access-logs" element={<AdminAccessLogsPage />} />
          </Route>
        </Route>

        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
