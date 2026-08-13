import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logService } from '../../services/logService';
import { sessionService } from '../../services/sessionService';
import { telegramService } from '../../services/telegramService';
import { authService } from '../../services/authService';
import { roleService } from '../../services/roleService';
import { EvangelismModule } from '../../components/user/EvangelismModule';
import { MembershipModule } from '../../components/user/MembershipModule';
import { ApprovalModule } from '../../components/user/ApprovalModule';
import { BusinessModule } from '../../components/user/BusinessModule';
import { MyProfilePage } from './MyProfilePage';
import { WeeklyReportPage } from './WeeklyReportPage';
import { CalendarPage } from '../../components/user/CalendarPage';
import { OrganizationPage } from '../../components/user/OrganizationPage';

import { DiagnosisDataProvider } from '../../contexts/DiagnosisDataContext';
import { DiagnosisShell } from '../../components/user/diagnosis/DiagnosisShell';
import { HomePage } from '../../components/user/diagnosis/HomePage';
import { DiagPage } from '../../components/user/diagnosis/DiagPage';
import { InspectPage } from '../../components/user/diagnosis/InspectPage';
import { FunnelPage } from '../../components/user/diagnosis/FunnelPage';
import { TrendPage } from '../../components/user/diagnosis/TrendPage';
import { MapPage } from '../../components/user/diagnosis/MapPage';
import { GlobePage } from '../../components/user/diagnosis/GlobePage';
import { ProcessCategoryPage } from '../../components/user/diagnosis/ProcessCategoryPage';

interface DiagnosisPageProps {
  section?: string;
  tab?: 'check' | 'aggregate' | 'input' | 'ledger' | 'ledger_archive' | 'ledger_report' | 'fruit' | 'fruit_archive' | 'transport' | 'transport_archive' | 'mission' | 'mission_archive' | 'business_calendar';
}

export const DiagnosisPage: React.FC<DiagnosisPageProps> = ({ section = 'home', tab = 'check' }) => {
  const navigate = useNavigate();
  const [showBackdoorBtn, setShowBackdoorBtn] = React.useState(false);

  const userStrForBtn = localStorage.getItem('user');
  const showAdminBtn = React.useMemo(() => {
    if (!userStrForBtn) return false;
    try {
      const u = JSON.parse(userStrForBtn);
      const role = u.role || '';
      const isAdmin = role === 'ROLE_ADMIN' || role === 'ADMIN' || role === '관리자' || role === 'ROLE_관리자';
      return isAdmin || roleService.getMenuPermissions().some(m => {
        const isAdminMenu = m.category.includes('adminsetting') || m.path.startsWith('/adminsetting');
        return isAdminMenu && roleService.canRoleAccessMenu(role, m.menuKey).read;
      });
    } catch (e) {
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userStrForBtn]);

  useEffect(() => {
    // 0-1. Strict 30-Minute Session Guard: Redirect to /login if unauthenticated or expired
    if (!sessionService.isSessionValid()) {
      navigate('/login', { replace: true });
      return;
    }

    const userStr = localStorage.getItem('user');

    // OTP 연동 강제 차단 가드 (예외계정 제외)
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        const isOtpExempt = u.isOtpExempt || false;
        if (!isOtpExempt && (!u.telegramChatId || u.telegramChatId.trim() === '') && section !== 'profile') {
          alert("보안 정책상 2차 인증 텔레그램 연동이 필수입니다. 회원관리(프로필) 페이지로 이동합니다.");
          window.location.href = '/OverseasPortal/profile';
          return;
        }
      } catch (e) { /* ignore */ }
    }

    let userRole = 'ROLE_USER';
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        userRole = u.role || 'ROLE_USER';
      } catch (e) { /* ignore */ }
    }

    const normalizeRole = (role: string) => {
      const cleanRole = role.toUpperCase().startsWith('ROLE_') ? role.toUpperCase() : `ROLE_${role.toUpperCase()}`;
      if (cleanRole === 'ROLE_해외선교부 담당자' || cleanRole === 'ROLE_USER') return 'ROLE_USER';
      if (cleanRole === 'ROLE_지파 담당자' || cleanRole === 'ROLE_JIPA') return 'ROLE_JIPA';
      if (cleanRole === 'ROLE_일반 회원' || cleanRole === 'ROLE_GUEST') return 'ROLE_GUEST';
      return cleanRole;
    };

    // Redirect /evangelism to /evangelism/check or /evangelism/aggregate ONLY IF user lacks access to the main p1 dashboard
    if (section === 'evangelism') {
      const normRole = normalizeRole(userRole);
      const isAdmin = normRole === 'ROLE_ADMIN' || normRole === 'ADMIN' || normRole === 'ROLE_관리자';
      const hasMainAccess = isAdmin || roleService.canRoleAccessMenu(userRole, 'p1').read;
      if (!hasMainAccess) {
        const canCheck = roleService.canRoleAccessMenu(userRole, 'p1_check').read;
        const canAgg = roleService.canRoleAccessMenu(userRole, 'p1_agg').read;
        if (canCheck) navigate('/evangelism/check', { replace: true });
        else if (canAgg) navigate('/evangelism/aggregate', { replace: true });
        else { alert("해당 메뉴에 대한 접근 권한이 없습니다."); navigate('/', { replace: true }); }
        return;
      }
    }

    // Redirect /membership to /membership/check or /membership/input ONLY IF user lacks access to the main p3 dashboard
    if (section === 'membership') {
      const normRole = normalizeRole(userRole);
      const isAdmin = normRole === 'ROLE_ADMIN' || normRole === 'ADMIN' || normRole === 'ROLE_관리자';
      const hasMainAccess = isAdmin || roleService.canRoleAccessMenu(userRole, 'p3').read;
      if (!hasMainAccess) {
        const canCheck = roleService.canRoleAccessMenu(userRole, 'p3_check').read;
        const canInput = roleService.canRoleAccessMenu(userRole, 'p3_input').read;
        if (canCheck) navigate('/membership/check', { replace: true });
        else if (canInput) navigate('/membership/input', { replace: true });
        else { alert("해당 메뉴에 대한 접근 권한이 없습니다."); navigate('/', { replace: true }); }
        return;
      }
    }

    // Redirect /business to /business/ledger ... ONLY IF user lacks access to the main business dashboard
    if (section === 'business') {
      const normRole = normalizeRole(userRole);
      const isAdmin = normRole === 'ROLE_ADMIN' || normRole === 'ADMIN' || normRole === 'ROLE_관리자';
      const hasMainAccess = isAdmin || roleService.canRoleAccessMenu(userRole, 'business').read;
      if (!hasMainAccess) {
        const canLedger = roleService.canRoleAccessMenu(userRole, 'business_ledger').read;
        const canLedgerReport = roleService.canRoleAccessMenu(userRole, 'business_ledger_report').read;
        const canFruit = roleService.canRoleAccessMenu(userRole, 'business_fruit').read;
        const canTransport = roleService.canRoleAccessMenu(userRole, 'business_transport').read;
        const canMission = roleService.canRoleAccessMenu(userRole, 'business_mission').read;
        if (canLedger) navigate('/business/ledger', { replace: true });
        else if (canLedgerReport) navigate('/business/ledger/report', { replace: true });
        else if (canFruit) navigate('/business/fruit', { replace: true });
        else if (canTransport) navigate('/business/transport', { replace: true });
        else if (canMission) navigate('/business/mission', { replace: true });
        else { alert("해당 메뉴에 대한 접근 권한이 없습니다."); navigate('/', { replace: true }); }
        return;
      }
    }

    const sectionToMenuKey: Record<string, string> = {
      'home': 'home', 'calendar': 'calendar', 'diag': 'diag', 'inspect': 'inspect', 'funnel': 'funnel',
      'trend': 'trend', 'map': 'map', 'globe': 'globe',
      'evangelism': 'p1', 'evangelism/check': 'p1_check', 'evangelism/aggregate': 'p1_agg',
      'center': 'p2',
      'membership': 'p3', 'membership/check': 'p3_check', 'membership/input': 'p3_input',
      'worship': 'p4',
      'business': 'business',
      'business/ledger': 'business_ledger', 'business/ledger/archive': 'business_ledger_archive', 'business/ledger/report': 'business_ledger_report',
      'business/fruit': 'business_fruit', 'business/fruit/archive': 'business_fruit_archive',
      'business/transport': 'business_transport', 'business/transport/archive': 'business_transport_archive',
      'business/mission': 'business_mission', 'business/mission/archive': 'business_mission_archive',
      'approvals/pending': 'approvals_pending', 'approvals/completed': 'approvals_completed',
      'weekly-report': 'weekly_report_input',
    };

    const targetKey = sectionToMenuKey[section] || section;
    const normRole = normalizeRole(userRole);

    if (normRole !== 'ROLE_ADMIN' && normRole !== 'ADMIN' && normRole !== 'ROLE_관리자' && targetKey !== 'profile') {
      const access = roleService.canRoleAccessMenu(userRole, targetKey);
      if (!access.read) {
        alert("해당 메뉴에 대한 접근 권한이 없습니다.");
        const permissions = roleService.getMenuPermissions();
        const accessible = permissions.find(m => roleService.canRoleAccessMenu(userRole, m.menuKey).read);
        if (accessible) {
          if (accessible.path.startsWith('/adminsetting')) window.location.href = '/OverseasPortal' + accessible.path;
          else navigate(accessible.path, { replace: true });
        } else {
          sessionService.clearSession();
          navigate('/login', { replace: true });
        }
        return;
      }
    }

    // Record Access Log for User Diagnosis Portal Section Page
    const sectionLabels: Record<string, string> = {
      home: '🏠 해외 총괄 요약', calendar: '📅 캘린더', diag: '🩺 교회 진단서', inspect: '🚨 점검 (양·질)',
      funnel: '🚦 관문별 통과율', trend: '📈 12개월 추이', map: '🗺️ 지리적 분포 (지도)', globe: '🌐 3D 지구본',
      evangelism: '① 전도 · 가개강 종합 포탈', center: '② 센터', membership: '③ 내무', worship: '④ 예배 · 전성도',
      business: '💼 업무 종합 포탈',
      'business/ledger': '💼 원장헌금', 'business/ledger/archive': '💼 원장헌금 품의서 및 회의록 보관함', 'business/ledger/report': '💼 품의서 및 회의록 작성',
      'business/fruit': '💼 열매헌금', 'business/fruit/archive': '💼 열매헌금 품의서 및 회의록 보관함',
      'business/transport': '💼 교통비', 'business/transport/archive': '💼 교통비 품의서 및 회의록 보관함',
      'business/mission': '💼 선교비', 'business/mission/archive': '💼 선교비 품의서 및 회의록 보관함',
    };
    const currentLabel = sectionLabels[section] || '🏠 사용자 진단서 포탈';
    const currentPath = section === 'home' ? '/' : `/${section}`;
    logService.addAccessLog(currentLabel, currentPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, section]);

  // Backdoor(로컬/사내망) 설정 버튼 노출 여부
  useEffect(() => {
    let cancelled = false;
    authService.checkBackdoorIp().then((info) => {
      if (!cancelled && info.isBackdoorAllowed) setShowBackdoorBtn(true);
    }).catch((e) => console.warn('Failed to check backdoor IP', e));
    return () => { cancelled = true; };
  }, []);

  const renderContent = () => {
    if (section === 'profile') return <MyProfilePage />;
    if (section === 'calendar') return <CalendarPage mode="MAIN" />;
    if (section === 'organization') return <OrganizationPage />;
    if (section === 'business' && tab === 'business_calendar') return <CalendarPage mode="BUSINESS" />;
    if (section === 'evangelism/check' || section === 'evangelism/aggregate') return <EvangelismModule initialTab={section === 'evangelism/aggregate' ? 'aggregate' : 'check'} />;
    if (section === 'membership' || section === 'membership/check' || section === 'membership/input') return <MembershipModule initialTab={section === 'membership/input' ? 'input' : 'check'} />;
    if (section === 'business' || section.startsWith('business/')) return <BusinessModule initialTab={tab as any} />;
    if (section === 'weekly-report') return <WeeklyReportPage />;
    if (section === 'approvals/pending' || section === 'approvals/completed') return <ApprovalModule mode={section === 'approvals/pending' ? 'pending' : 'completed'} />;

    if (section === 'home') return <HomePage />;
    if (section === 'diag') return <DiagPage />;
    if (section === 'inspect') return <InspectPage />;
    if (section === 'funnel') return <FunnelPage />;
    if (section === 'trend') return <TrendPage />;
    if (section === 'map') return <MapPage />;
    if (section === 'globe') return <GlobePage />;
    if (section === 'evangelism') return <ProcessCategoryPage categories={['①전도']} sectionKey="p1" />;
    if (section === 'center') return <ProcessCategoryPage categories={['②센터']} sectionKey="p2" />;
    if (section === 'worship') return <ProcessCategoryPage categories={['④예배·전월입교자', '④예배·전성도', '④예배·결석']} sectionKey="p4" />;

    return <HomePage />;
  };

  // 사이드바/탑바(검색·월선택 등)가 모든 화면에서 진단 데이터를 공유해야 하므로 항상 Provider로 감싼다.
  return (
    <DiagnosisDataProvider section={section}>
      <DiagnosisShell showAdminBtn={showAdminBtn} showBackdoorBtn={showBackdoorBtn}>
        {renderContent()}
      </DiagnosisShell>
    </DiagnosisDataProvider>
  );
};
