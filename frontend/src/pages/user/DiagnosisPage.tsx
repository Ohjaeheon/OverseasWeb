import React, { useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
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
  tab?: 'check' | 'aggregate' | 'plan' | 'monthly' | 'report' | 'input' | 'ledger' | 'ledger_archive' | 'ledger_report' | 'fruit' | 'fruit_archive' | 'transport' | 'transport_archive' | 'mission' | 'mission_archive' | 'business_calendar';
}

function normalizeRole(role: string): string {
  const cleanRole = role.toUpperCase().startsWith('ROLE_') ? role.toUpperCase() : `ROLE_${role.toUpperCase()}`;
  if (cleanRole === 'ROLE_해외선교부 담당자' || cleanRole === 'ROLE_USER') return 'ROLE_USER';
  if (cleanRole === 'ROLE_지파 담당자' || cleanRole === 'ROLE_JIPA') return 'ROLE_JIPA';
  if (cleanRole === 'ROLE_일반 회원' || cleanRole === 'ROLE_GUEST') return 'ROLE_GUEST';
  return cleanRole;
}

const SECTION_TO_MENU_KEY: Record<string, string> = {
  'home': 'home', 'calendar': 'calendar', 'diag': 'diag', 'inspect': 'inspect', 'funnel': 'funnel',
  'trend': 'trend', 'map': 'map', 'globe': 'globe',
  'evangelism': 'p1', 'evangelism/check': 'p1_check', 'evangelism/aggregate': 'p1_agg', 'evangelism/plan': 'p1_plan', 'evangelism/monthly': 'p1_monthly', 'evangelism/report': 'p1_report',
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

interface AccessDecision {
  ok: boolean;
  /** ok가 false일 때 같은 앱 내 라우트로 즉시 이동(React Router <Navigate>). 연관 하위 페이지로 조용히
   * 보내는 경우와, 접근 가능한 메뉴가 전혀 없어 대체 화면으로 보내는 경우 모두 여기로 통일한다. */
  redirectTo?: string;
  /** ok가 false이고 redirectTo도 없을 때만 사용 — adminsetting처럼 완전한 페이지 이동이 필요한 드문
   * 경우로, useEffect에서 window.location으로만 처리 가능하다. */
  externalUrl?: string;
  /** ok가 false이고 redirectTo/externalUrl도 없을 때 — 접근 가능한 메뉴가 전혀 없어 세션을 정리하고
   * 로그인 화면으로 보내야 하는 경우. */
  forceLogout?: boolean;
  /** true면 이동 전에 "권한 없음" 경고를 보여준다(연관 하위 페이지로 조용히 보내는 경우는 false). */
  showDeniedAlert?: boolean;
}

/** 접근 가능한 메뉴가 전혀 없을 때 갈 곳을 찾는다 — 완전 차단 시 이 결과를 그대로 쓴다. */
function resolveFallback(userRole: string): AccessDecision {
  const permissions = roleService.getMenuPermissions();
  const accessible = permissions.find(m => roleService.canRoleAccessMenu(userRole, m.menuKey).read);
  if (accessible) {
    if (accessible.path.startsWith('/adminsetting')) {
      return { ok: false, externalUrl: '/OverseasPortal' + accessible.path, showDeniedAlert: true };
    }
    return { ok: false, redirectTo: accessible.path, showDeniedAlert: true };
  }
  return { ok: false, forceLogout: true, showDeniedAlert: true };
}

/** 현재 section을 그릴 수 있는지 순수 계산 — 렌더 경로(콘텐츠를 그릴지 결정, 필요하면 그 자리에서
 * <Navigate>로 즉시 이동)와 useEffect(경고 표시라는 side effect) 양쪽에서 동일하게 호출해, 차단 대상
 * 콘텐츠는 물론 전체 화면 셸조차 한 프레임도 그려지지 않도록 한다. */
function resolveAccess(section: string): AccessDecision {
  const userStr = localStorage.getItem('user');
  let userRole = 'ROLE_USER';
  if (userStr) {
    try { userRole = JSON.parse(userStr).role || 'ROLE_USER'; } catch { /* ignore */ }
  }
  const normRole = normalizeRole(userRole);
  const isAdmin = normRole === 'ROLE_ADMIN' || normRole === 'ADMIN' || normRole === 'ROLE_관리자';
  if (isAdmin) return { ok: true };

  if (section === 'evangelism') {
    if (!roleService.canRoleAccessMenu(userRole, 'p1').read) {
      if (roleService.canRoleAccessMenu(userRole, 'p1_check').read) return { ok: false, redirectTo: '/evangelism/check' };
      if (roleService.canRoleAccessMenu(userRole, 'p1_agg').read) return { ok: false, redirectTo: '/evangelism/aggregate' };
      return resolveFallback(userRole);
    }
    return { ok: true };
  }

  if (section === 'membership') {
    if (!roleService.canRoleAccessMenu(userRole, 'p3').read) {
      if (roleService.canRoleAccessMenu(userRole, 'p3_check').read) return { ok: false, redirectTo: '/membership/check' };
      if (roleService.canRoleAccessMenu(userRole, 'p3_input').read) return { ok: false, redirectTo: '/membership/input' };
      return resolveFallback(userRole);
    }
    return { ok: true };
  }

  if (section === 'business') {
    if (!roleService.canRoleAccessMenu(userRole, 'business').read) {
      if (roleService.canRoleAccessMenu(userRole, 'business_ledger').read) return { ok: false, redirectTo: '/business/ledger' };
      if (roleService.canRoleAccessMenu(userRole, 'business_ledger_report').read) return { ok: false, redirectTo: '/business/ledger/report' };
      if (roleService.canRoleAccessMenu(userRole, 'business_fruit').read) return { ok: false, redirectTo: '/business/fruit' };
      if (roleService.canRoleAccessMenu(userRole, 'business_transport').read) return { ok: false, redirectTo: '/business/transport' };
      if (roleService.canRoleAccessMenu(userRole, 'business_mission').read) return { ok: false, redirectTo: '/business/mission' };
      return resolveFallback(userRole);
    }
    return { ok: true };
  }

  const targetKey = SECTION_TO_MENU_KEY[section] || section;
  if (targetKey === 'profile') return { ok: true };
  if (!roleService.canRoleAccessMenu(userRole, targetKey).read) return resolveFallback(userRole);
  return { ok: true };
}

export const DiagnosisPage: React.FC<DiagnosisPageProps> = ({ section = 'home', tab = 'check' }) => {
  const navigate = useNavigate();
  const [showBackdoorBtn, setShowBackdoorBtn] = React.useState(false);
  // 렌더 시점에 동기적으로 판정 — access.ok가 아니면 아래 return에서 renderContent()를 아예 호출하지 않는다.
  const access = resolveAccess(section);

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

    // 권한 판정은 resolveAccess()가 렌더 시점에 이미 동기적으로 수행했다. redirectTo가 있는 경우는
    // 렌더 경로에서 <Navigate>로 이미 즉시 이동 처리되므로, 여기서는 그걸로 처리 안 되는 나머지
    // (경고 표시, adminsetting 전체 페이지 이동, 완전 차단 시 세션 정리)만 side effect로 수행한다.
    const decision = resolveAccess(section);
    if (!decision.ok) {
      if (decision.showDeniedAlert) alert("해당 메뉴에 대한 접근 권한이 없습니다.");
      if (decision.externalUrl) { window.location.href = decision.externalUrl; return; }
      if (decision.forceLogout) { sessionService.clearSession(); navigate('/login', { replace: true }); return; }
      return;
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
    if (section === 'evangelism/check' || section === 'evangelism/aggregate' || section === 'evangelism/plan' || section === 'evangelism/monthly' || section === 'evangelism/report') {
      const evangelismTab = section === 'evangelism/aggregate' ? 'aggregate' : section === 'evangelism/plan' ? 'plan' : section === 'evangelism/monthly' ? 'monthly' : section === 'evangelism/report' ? 'report' : 'check';
      return <EvangelismModule initialTab={evangelismTab} />;
    }
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

  // 접근 가능한 같은 앱 내 경로가 정해져 있으면(연관 하위 페이지 또는 대체 화면) 그 자리에서 즉시
  // <Navigate>로 바꿔치기한다 — DiagnosisShell/사이드바조차 잘못된 콘텐츠로 마운트되지 않고, URL도
  // 곧바로 바뀐다(예전엔 useEffect의 navigate() 호출을 기다려야 해서, 그 사이에 빈 화면인 채로
  // 원래 URL에 그대로 "접속된" 것처럼 보였다).
  if (!access.ok && access.redirectTo) {
    return <Navigate to={access.redirectTo} replace />;
  }

  // 사이드바/탑바(검색·월선택 등)가 모든 화면에서 진단 데이터를 공유해야 하므로 항상 Provider로 감싼다.
  // access.ok가 아니면 renderContent()를 아예 호출하지 않는다 — externalUrl/forceLogout 같은 드문
  // 경우만 위 useEffect가 곧이어 처리한다.
  return (
    <DiagnosisDataProvider section={section}>
      <DiagnosisShell showAdminBtn={showAdminBtn} showBackdoorBtn={showBackdoorBtn}>
        {access.ok ? renderContent() : null}
      </DiagnosisShell>
    </DiagnosisDataProvider>
  );
};
