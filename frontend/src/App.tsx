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

export const App: React.FC = () => {
  return (
    <BrowserRouter basename="/OverseasPortal">
      <Routes>
        {/* User Routes */}
        <Route path="/" element={<DiagnosisPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Admin Routes (ROLE_ADMIN Only) */}
        <Route element={<AdminGuard />}>
          <Route path="/adminsetting" element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />

            {/* 교회/지역/개척지 */}
            <Route path="faith-records" element={<AdminFaithPage />} />
            <Route path="church-detail" element={<AdminFaithPage />} />

            {/* 데이터 관리 */}
            <Route path="evangelism" element={<AdminFaithPage />} />
            <Route path="center" element={<AdminFaithPage />} />
            <Route path="membership" element={<AdminFaithPage />} />
            <Route path="worship" element={<AdminFaithPage />} />
            <Route path="worship/prev-admit" element={<AdminFaithPage />} />
            <Route path="worship/all-attend" element={<AdminFaithPage />} />
            <Route path="worship/absent" element={<AdminFaithPage />} />

            {/* 회원 및 권한 */}
            <Route path="users" element={<AdminUserPage />} />
            <Route path="roles" element={<AdminRolePage />} />
            <Route path="permissions" element={<AdminPermissionPage />} />

            {/* 로그 및 시스템 */}
            <Route path="i18n" element={<AdminI18nPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="login-logs" element={<AdminDashboardPage />} />
            <Route path="access-logs" element={<AdminDashboardPage />} />
          </Route>
        </Route>

        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
