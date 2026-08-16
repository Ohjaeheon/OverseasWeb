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
import { AdminWeeklyWorshipSettingsPage } from './pages/admin/AdminWeeklyWorshipSettingsPage';
import { AdminEvangelismBulkPage } from './pages/admin/AdminEvangelismBulkPage';
import { AdminEvangelismReportTemplatePage } from './pages/admin/AdminEvangelismReportTemplatePage';
import { AdminMembershipBulkPage } from './pages/admin/AdminMembershipBulkPage';
import { AdminWeeklyReportSchemaPage } from './pages/admin/AdminWeeklyReportSchemaPage';
import { AdminWeeklyReportStatusPage } from './pages/admin/AdminWeeklyReportStatusPage';
import { AdminMetricColumnConfigPage } from './pages/admin/AdminMetricColumnConfigPage';
import { AdminOverseasBoardManualPage } from './pages/admin/AdminOverseasBoardManualPage';

import { roleService } from './services/roleService';
import { CountryFlagProvider } from './contexts/CountryFlagContext';
import { TelegramLifecycleHandler } from './components/TelegramLifecycleHandler';
import { BackdoorIpSettingPage } from './pages/admin/BackdoorIpSettingPage';
import { authService } from './services/authService';
import { sessionService } from './services/sessionService';

const AdminSettingRootRoute: React.FC = () => {
  const [ipInfo, setIpInfo] = React.useState<{ clientIp: string; isLocalhost: boolean; isBackdoorAllowed: boolean } | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkIp = async () => {
      try {
        const info = await authService.checkBackdoorIp();
        setIpInfo(info);
      } catch (e) {
        console.error("Failed to check backdoor IP", e);
      } finally {
        setLoading(false);
      }
    };
    checkIp();
  }, []);

  if (loading) {
    return (
      <div style={{
        background: '#0b1120',
        color: '#94a3b8',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.95rem',
        fontWeight: 600
      }}>
        보안 채널 연결 및 IP 검증 중...
      </div>
    );
  }

  if (ipInfo && ipInfo.isLocalhost) {
    return <BackdoorIpSettingPage />;
  }

  return <Navigate to="/adminsetting/dashboard" replace />;
};

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

  // 10초마다 세션 유효성을 체크하는 백그라운드 타이머 추가
  React.useEffect(() => {
    const interval = setInterval(() => {
      const token = localStorage.getItem('accessToken');
      if (token && !sessionService.isSessionValid()) {
        window.location.href = '/OverseasPortal/login';
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <BrowserRouter basename="/OverseasPortal">
      <TelegramLifecycleHandler />
      <CountryFlagProvider>
      <Routes>
        {/* User Routes (Diagnosis Portal Sub-views with Explicit Route Links) */}
        <Route path="/" element={<DiagnosisPage section="home" />} />
        <Route path="/calendar" element={<DiagnosisPage section="calendar" />} />
        <Route path="/organization" element={<DiagnosisPage section="organization" />} />
        <Route path="/diag" element={<DiagnosisPage section="diag" />} />
        <Route path="/inspect" element={<DiagnosisPage section="inspect" />} />
        <Route path="/funnel" element={<DiagnosisPage section="funnel" />} />
        <Route path="/trend" element={<DiagnosisPage section="trend" />} />
        <Route path="/map" element={<DiagnosisPage section="map" />} />
        <Route path="/globe" element={<DiagnosisPage section="globe" />} />
        <Route path="/evangelism" element={<DiagnosisPage section="evangelism" tab="check" />} />
        <Route path="/evangelism/check" element={<DiagnosisPage section="evangelism/check" tab="check" />} />
        <Route path="/evangelism/aggregate" element={<DiagnosisPage section="evangelism/aggregate" tab="aggregate" />} />
        <Route path="/evangelism/plan" element={<DiagnosisPage section="evangelism/plan" tab="plan" />} />
        <Route path="/evangelism/monthly" element={<DiagnosisPage section="evangelism/monthly" tab="monthly" />} />
        <Route path="/evangelism/report" element={<DiagnosisPage section="evangelism/report" tab="report" />} />
        <Route path="/center" element={<DiagnosisPage section="center" />} />
        <Route path="/membership" element={<DiagnosisPage section="membership" tab="check" />} />
        <Route path="/membership/check" element={<DiagnosisPage section="membership/check" tab="check" />} />
        <Route path="/membership/input" element={<DiagnosisPage section="membership/input" tab="input" />} />
        <Route path="/worship" element={<DiagnosisPage section="worship" />} />
        <Route path="/business" element={<DiagnosisPage section="business" tab="business_calendar" />} />
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
        <Route path="/weekly-report" element={<DiagnosisPage section="weekly-report" />} />
        <Route path="/weekly-report/input" element={<DiagnosisPage section="weekly-report/input" />} />
        <Route path="/adminsetting" element={<AdminSettingRootRoute />} />

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
            <Route path="weekly-worship/settings" element={<AdminWeeklyWorshipSettingsPage />} />
            <Route path="evangelism-bulk" element={<AdminEvangelismBulkPage />} />
            <Route path="evangelism-bulk/report-template" element={<AdminEvangelismReportTemplatePage />} />
            <Route path="membership-bulk" element={<AdminMembershipBulkPage />} />
            <Route path="weekly-report-status" element={<AdminWeeklyReportStatusPage />} />
            <Route path="weekly-report-schema" element={<AdminWeeklyReportSchemaPage />} />
            <Route path="dashboard-config" element={<AdminMetricColumnConfigPage />} />
            <Route path="overseas-board-manual" element={<AdminOverseasBoardManualPage />} />

            {/* 회원 및 권한 */}
            <Route path="users" element={<AdminUserPage />} />
            <Route path="roles" element={<AdminRolePage />} />
            <Route path="permissions" element={<AdminPermissionPage />} />

            {/* 로그 및 시스템 */}
            <Route path="bot" element={<AdminBotPage />} />
            <Route path="i18n" element={<AdminI18nPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="backdoor-ips" element={<BackdoorIpSettingPage />} />
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
      </CountryFlagProvider>
    </BrowserRouter>
  );
};
