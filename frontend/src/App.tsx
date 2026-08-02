import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// User Pages
import { DiagnosisPage } from './pages/user/DiagnosisPage';
import { LoginPage } from './pages/auth/LoginPage';
import { MyProfilePage } from './pages/user/MyProfilePage';

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
import { AdminMessagePage } from './pages/admin/AdminMessagePage';
import { AdminLoginLogsPage } from './pages/admin/AdminLoginLogsPage';
import { AdminAccessLogsPage } from './pages/admin/AdminAccessLogsPage';
import { AdminFileUploadLogsPage } from './pages/admin/AdminFileUploadLogsPage';
import { AdminFileDownloadLogsPage } from './pages/admin/AdminFileDownloadLogsPage';
import { AdminPlaceholderPage } from './pages/admin/AdminPlaceholderPage';
import { AdminBotPage } from './pages/admin/AdminBotPage';
import { AdminWeeklyWorshipPage } from './pages/admin/AdminWeeklyWorshipPage';
import { AdminWeeklyWorshipHistoryPage } from './pages/admin/AdminWeeklyWorshipHistoryPage';

import { roleService } from './services/roleService';
import { TelegramLifecycleHandler } from './components/TelegramLifecycleHandler';

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
      <TelegramLifecycleHandler />
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
        <Route path="/membership" element={<DiagnosisPage section="membership" tab="check" />} />
        <Route path="/membership/check" element={<DiagnosisPage section="membership/check" tab="check" />} />
        <Route path="/membership/input" element={<DiagnosisPage section="membership/input" tab="input" />} />
        <Route path="/worship" element={<DiagnosisPage section="worship" />} />
        <Route path="/business" element={<DiagnosisPage section="business" tab="ledger" />} />
        <Route path="/business/ledger" element={<DiagnosisPage section="business/ledger" tab="ledger" />} />
        <Route path="/business/ledger/archive" element={<DiagnosisPage section="business/ledger/archive" tab="ledger_archive" />} />
        <Route path="/business/ledger/report" element={<DiagnosisPage section="business/ledger/report" tab="ledger_report" />} />
        <Route path="/business/fruit" element={<DiagnosisPage section="business/fruit" tab="fruit" />} />
        <Route path="/business/fruit/archive" element={<DiagnosisPage section="business/fruit/archive" tab="fruit_archive" />} />
        <Route path="/business/transport" element={<DiagnosisPage section="business/transport" tab="transport" />} />
        <Route path="/business/transport/archive" element={<DiagnosisPage section="business/transport/archive" tab="transport_archive" />} />
        <Route path="/business/mission" element={<DiagnosisPage section="business/mission" tab="mission" />} />
        <Route path="/business/mission/archive" element={<DiagnosisPage section="business/mission/archive" tab="mission_archive" />} />
        <Route path="/approvals/pending" element={<DiagnosisPage section="approvals/pending" />} />
        <Route path="/approvals/completed" element={<DiagnosisPage section="approvals/completed" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/profile" element={<DiagnosisPage section="profile" />} />

        {/* Protected Admin Routes (ROLE_ADMIN Only) */}
        <Route element={<AdminGuard />}>
          <Route path="/adminsetting" element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />

            {/* 교회/지역/개척지 */}
            <Route path="faith-records" element={<AdminFaithPage />} />
            <Route path="church-detail" element={<AdminPlaceholderPage title="교회 상세 정밀 진단" />} />

            {/* 데이터 관리 */}
            <Route path="weekly-worship" element={<AdminWeeklyWorshipPage />} />
            <Route path="weekly-worship/history" element={<AdminWeeklyWorshipHistoryPage />} />

            {/* 회원 및 권한 */}
            <Route path="users" element={<AdminUserPage />} />
            <Route path="roles" element={<AdminRolePage />} />
            <Route path="permissions" element={<AdminPermissionPage />} />

            {/* 로그 및 시스템 */}
            <Route path="bot" element={<AdminBotPage />} />
            <Route path="i18n" element={<AdminI18nPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="messages" element={<AdminMessagePage />} />
            <Route path="login-logs" element={<AdminLoginLogsPage />} />
            <Route path="access-logs" element={<AdminAccessLogsPage />} />
            <Route path="file-upload-logs" element={<AdminFileUploadLogsPage />} />
            <Route path="file-download-logs" element={<AdminFileDownloadLogsPage />} />
          </Route>
        </Route>

        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
