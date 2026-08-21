import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { sessionService } from '../../../services/sessionService';
import { telegramService } from '../../../services/telegramService';
import { roleService } from '../../../services/roleService';
import { useDiagnosisData } from '../../../contexts/DiagnosisDataContext';
import { groupSidebar, filterPlainForRole, filterMajorsForRole, findActiveMajor, menuKeyForGroup, menuKeyForItem, menuKeyForChild } from './navGroups';
import { useMessageDictionary } from '../../../contexts/MessageDictionaryContext';

function getCurrentUserRole(): string {
  const userStr = localStorage.getItem('user');
  if (!userStr) return 'ROLE_USER';
  try { return JSON.parse(userStr).role || 'ROLE_USER'; } catch { return 'ROLE_USER'; }
}

interface DiagnosisTopbarProps {
  onToggleSidebar: () => void;
  onShowIntro: () => void;
  showAdminBtn: boolean;
  showBackdoorBtn: boolean;
}

export const DiagnosisTopbar: React.FC<DiagnosisTopbarProps> = ({ onToggleSidebar, showAdminBtn, showBackdoorBtn }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, setLang } = useDiagnosisData();
  const { getMsg } = useMessageDictionary();

  const userRole = getCurrentUserRole();
  const { plain, majors } = groupSidebar();
  const iconLinks = filterPlainForRole(plain, userRole).filter((it) => it.s !== 'home');
  const filteredMajors = filterMajorsForRole(majors, userRole);
  const active = findActiveMajor(filteredMajors, location.pathname);

  return (
    <div className="topbar">
      <button className="menu-toggle" onClick={onToggleSidebar}>☰</button>
      <div className="logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>🌐</div>
      <div className="brandwrap" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
        <div className="brand">해외선교부 <b>업무포탈</b></div>
        <div className="brandsub">GLOBAL MISSION DASHBOARD</div>
      </div>

      <div className="navwrap">
        {filteredMajors.map((m) => (
          <div
            key={m.key}
            className={`navitem${active?.major.key === m.key ? ' active' : ''}`}
          >
            <span className="lbl">{getMsg(menuKeyForGroup(m.key), m.label)}</span>
            <span className="car">▾</span>
            <div className="megamenu">
              {m.items.map((it) => (
                <div
                  key={it.s}
                  className="mm-row"
                  onClick={() => navigate(it.path)}
                >
                  <span>{getMsg(menuKeyForItem(it), it.label)}</span>
                  {it.tag && <span className="tag">{it.tag}</span>}
                  {it.children && <span className="mm-chevron">›</span>}
                  {it.children && (
                    <div className="mm-flyout">
                      {it.children.map((ch) => (
                        <div
                          key={ch.path}
                          className="mm-sub-row"
                          onClick={(e) => { e.stopPropagation(); navigate(ch.path); }}
                        >
                          {getMsg(menuKeyForChild(ch), ch.label)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <span className="spacer" />

      {iconLinks.map((it) => (
        <button key={it.s} className="ticon" title={getMsg(menuKeyForItem(it), it.label)} onClick={() => navigate(it.path)}>{it.ico}</button>
      ))}

      <select className="langSel tb-langsel" value={lang} onChange={(e) => setLang(e.target.value as any)} title="Language / 语言 / 言語">
        <option value="ko">한국어</option>
        <option value="en">English</option>
        <option value="zh">中文</option>
        <option value="ja">日本語</option>
      </select>

      <button className="repbtn" onClick={() => navigate('/profile')} title="회원 정보 및 텔레그램 연동을 관리합니다">👤 <span className="btn-txt-label">회원관리</span></button>

      {showAdminBtn && (
        <button
          className="repbtn"
          onClick={() => navigate(roleService.getAdminEntryPath(getCurrentUserRole()))}
          style={{ background: '#2563eb', color: 'white', border: 'none', fontWeight: 700 }}
          title="관리자 시스템으로 이동"
        >
          ⚙️ <span className="btn-txt-label">관리자 시스템</span>
        </button>
      )}

      {showBackdoorBtn && (
        <button
          className="repbtn"
          onClick={() => { sessionService.clearSession(); window.location.href = '/OverseasPortal/login?mode=backdoor'; }}
          style={{ background: '#7c3aed', color: 'white', border: 'none', fontWeight: 700 }}
          title="백도어 로그인 화면으로 이동"
        >
          🚪 <span className="btn-txt-label">백도어 설정</span>
        </button>
      )}

      {!telegramService.isTelegramWebApp() && (
        <button
          className="repbtn"
          onClick={() => {
            if (window.confirm('정말 로그아웃 하시겠습니까?')) {
              sessionService.clearSession();
              navigate('/login', { replace: true });
            }
          }}
          style={{ background: '#ef4444', color: 'white', border: 'none', fontWeight: 700 }}
          title="로그아웃"
        >
          🔒 <span className="btn-txt-label">로그아웃</span>
        </button>
      )}
    </div>
  );
};
