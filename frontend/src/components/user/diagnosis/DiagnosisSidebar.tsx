import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { roleService } from '../../../services/roleService';
import { sessionService } from '../../../services/sessionService';
import { telegramService } from '../../../services/telegramService';

interface SidebarChild { cat?: string; tab?: string; label: string; path: string; }
interface SidebarItem { s: string; ico: string; label: string; path: string; tag?: string; children?: SidebarChild[]; }
interface SidebarGroup { grp: string; }
type SidebarEntry = SidebarItem | SidebarGroup;

function isGroup(e: SidebarEntry): e is SidebarGroup { return 'grp' in e; }

// Ported 1:1 from diagnosisEngine.js const SIDEBAR — 홈/진단서/점검/관문/지도지구본/추이/센터/예배는
// 원래 내부 setSection()으로만 전환되어 URL이 동기화되지 않았으나, React 전환에 맞춰 전부 실제 경로를 부여했다.
const SIDEBAR: SidebarEntry[] = [
  { s: 'home', ico: '🏠', label: '홈 (종합 현황)', path: '/' },
  { s: 'calendar', ico: '📅', label: '캘린더', path: '/calendar' },
  { s: 'organization', ico: '🌳', label: '조직도', path: '/organization' },
  { grp: '진 단' },
  { s: 'diag', ico: '🩺', label: '교회 진단서', path: '/diag', tag: '핵심' },
  { s: 'inspect', ico: '🚨', label: '점검 (양·질)', path: '/inspect' },
  { s: 'funnel', ico: '🚦', label: '관문별 통과율', path: '/funnel' },
  { grp: '신앙 프로세스' },
  {
    s: 'p1', ico: '①', label: '전도·가개강', path: '/evangelism', children: [
      { cat: 'p1_check', label: '①-1. 교회별 데이터 확인', path: '/evangelism/check' },
      { cat: 'p1_agg', label: '①-2. 주간보고', path: '/evangelism/aggregate' },
      { cat: 'p1_plan', label: '①-3. 계획', path: '/evangelism/plan' },
      { cat: 'p1_monthly', label: '①-4. 월간보고', path: '/evangelism/monthly' },
    ],
  },
  { s: 'p2', ico: '②', label: '센터', path: '/center' },
  {
    s: 'p3', ico: '③', label: '내무', path: '/membership', children: [
      { cat: 'p3_check', label: '③-1. 교회별 데이터 확인', path: '/membership/check' },
      { cat: 'p3_input', label: '③-2. 월별 데이터 입력', path: '/membership/input' },
    ],
  },
  { s: 'p4', ico: '④', label: '예배', path: '/worship' },
  { grp: '업 무' },
  {
    s: 'business', ico: '💼', label: '재정', path: '/business', children: [
      { tab: 'ledger', label: '원장헌금', path: '/business/ledger' },
      { tab: 'ledger_archive', label: 'ㄴ 품의서 및 회의록', path: '/business/ledger/archive' },
      { tab: 'ledger_report', label: 'ㄴ 품의서 및 회의록 작성', path: '/business/ledger/report' },
      { tab: 'fruit', label: '열매헌금', path: '/business/fruit' },
      { tab: 'fruit_archive', label: 'ㄴ 품의서 및 회의록', path: '/business/fruit/archive' },
      { tab: 'transport', label: '교통비', path: '/business/transport' },
      { tab: 'transport_archive', label: 'ㄴ 품의서 및 회의록', path: '/business/transport/archive' },
      { tab: 'mission', label: '선교비', path: '/business/mission' },
      { tab: 'mission_archive', label: 'ㄴ 품의서 및 회의록', path: '/business/mission/archive' },
    ],
  },
  { grp: '보 기' },
  { s: 'map', ico: '🌍', label: '지도·지구본', path: '/map' },
  { s: 'trend', ico: '📈', label: '추이·비교', path: '/trend' },
  { grp: '결 재' },
  { s: 'approvals/pending', ico: '📥', label: '결재 대기중인 건', path: '/approvals/pending' },
  { s: 'approvals/completed', ico: '📋', label: '결재 완료 건', path: '/approvals/completed' },
];

function getCurrentUserRole(): string {
  const userStr = localStorage.getItem('user');
  if (!userStr) return 'ROLE_USER';
  try { return JSON.parse(userStr).role || 'ROLE_USER'; } catch { return 'ROLE_USER'; }
}

interface DiagnosisSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onShowIntro: () => void;
  lang: string;
  onLangChange: (l: string) => void;
  showAdminBtn: boolean;
  showBackdoorBtn: boolean;
}

export const DiagnosisSidebar: React.FC<DiagnosisSidebarProps> = ({ isOpen, onClose, onShowIntro, lang, onLangChange, showAdminBtn, showBackdoorBtn }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const userRole = getCurrentUserRole();
  const isAdmin = userRole === 'ROLE_ADMIN' || userRole === 'ADMIN' || userRole === '관리자' || userRole === 'ROLE_관리자';

  const hasAccess = (key: string) => isAdmin || roleService.canRoleAccessMenu(userRole, key).read;
  const hasChildAccess = (ch: SidebarChild, parentKey: string) => {
    const chKey = ch.cat || ch.tab;
    if (!chKey) return hasAccess(parentKey);
    return hasAccess(chKey);
  };
  const canShowItem = (it: SidebarItem) => {
    if (!it.children) return hasAccess(it.s);
    return hasAccess(it.s) || it.children.some((ch) => hasChildAccess(ch, it.s));
  };

  // 그룹 헤더는 뒤이어 보이는 항목이 하나라도 있을 때만 표시
  const filtered: SidebarEntry[] = [];
  for (let i = 0; i < SIDEBAR.length; i++) {
    const item = SIDEBAR[i];
    if (isGroup(item)) {
      let hasVisible = false;
      for (let j = i + 1; j < SIDEBAR.length; j++) {
        const next = SIDEBAR[j];
        if (isGroup(next)) break;
        if (canShowItem(next)) { hasVisible = true; break; }
      }
      if (hasVisible) filtered.push(item);
    } else if (canShowItem(item)) {
      filtered.push(item);
    }
  }

  const isItemActive = (it: SidebarItem) => location.pathname === it.path || (it.path !== '/' && location.pathname.startsWith(it.path + '/'));

  const go = (path: string) => { onClose(); navigate(path); };

  return (
    <>
      <div className="sidebar-overlay" style={{ display: isOpen ? 'block' : 'none' }} onClick={onClose} />
      <nav className={`side${isOpen ? ' open' : ''}`}>
        <div className="side-head">
          <div className="sidebrand">
            <div className="gl">🌐</div>
            <div className="tx"><b>해외선교부</b><span>GLOBAL MISSION DASHBOARD</span></div>
          </div>
          <button className="side-close" onClick={onClose} aria-label="메뉴 닫기">✕</button>
        </div>
        {filtered.map((entry, idx) => {
          if (isGroup(entry)) {
            return <div className="grp" key={`grp-${idx}`}>{entry.grp}</div>;
          }
          const it = entry;
          const active = isItemActive(it);
          const expanded = active || openMenu === it.s;
          return (
            <React.Fragment key={it.s}>
              <div
                className={`mitem ${active && !it.children ? 'on' : ''}`}
                onClick={() => {
                  if (it.children) { setOpenMenu(openMenu === it.s ? null : it.s); go(it.path); }
                  else go(it.path);
                }}
              >
                <span className="ico">{it.ico}</span>{it.label}
                {it.tag && <span className="tag">{it.tag}</span>}
                {it.children && <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: 11 }}>{expanded ? '▾' : '▸'}</span>}
              </div>
              {it.children && expanded && (
                <div className="msubwrap">
                  {it.children.filter((ch) => hasChildAccess(ch, it.s)).map((ch) => (
                    <div
                      key={ch.path}
                      className={`mitem sub ${location.pathname === ch.path ? 'on' : ''}`}
                      onClick={() => go(ch.path)}
                    >
                      {ch.label}
                    </div>
                  ))}
                </div>
              )}
            </React.Fragment>
          );
        })}

        <div className="mobile-side-actions">
          <div className="side-actions-lang">
            <select
              className="langSel"
              value={lang}
              onChange={(e) => onLangChange(e.target.value)}
            >
              <option value="ko">한국어</option>
              <option value="en">English</option>
              <option value="zh">中文</option>
              <option value="ja">日本語</option>
            </select>
          </div>
          <div className="actgrid">
            <button className="actbtn" onClick={onShowIntro}><span>🏠</span>인트로</button>
            <button className="actbtn" onClick={() => go('/profile')}><span>👤</span>회원관리</button>
            <button className="actbtn" onClick={() => window.print()}><span>📄</span>출력 · PDF</button>
            {showAdminBtn && (
              <button className="actbtn accent" onClick={() => go(roleService.getAdminEntryPath(userRole))}><span>⚙️</span>관리자 시스템</button>
            )}
          </div>
          <div className="side-actions-danger">
            {showBackdoorBtn && (
              <button className="actbtn full purple" onClick={() => { sessionService.clearSession(); window.location.href = '/OverseasPortal/login?mode=backdoor'; }}>🚪 백도어 설정</button>
            )}
            {!telegramService.isTelegramWebApp() && (
              <button
                className="actbtn full danger"
                onClick={() => {
                  if (window.confirm('정말 로그아웃 하시겠습니까?')) {
                    onClose();
                    sessionService.clearSession();
                    navigate('/login', { replace: true });
                  }
                }}
              >
                🔒 로그아웃
              </button>
            )}
          </div>
        </div>
      </nav>
    </>
  );
};
