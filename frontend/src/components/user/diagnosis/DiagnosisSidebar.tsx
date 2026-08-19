import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { roleService } from '../../../services/roleService';
import { sessionService } from '../../../services/sessionService';
import { telegramService } from '../../../services/telegramService';
import { SIDEBAR, isGroup, SidebarChild, SidebarItem, SidebarEntry } from './navGroups';

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
      <nav className={`side mobile-drawer${isOpen ? ' open' : ''}`}>
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
