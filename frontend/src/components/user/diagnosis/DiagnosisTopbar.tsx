import React from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionService } from '../../../services/sessionService';
import { telegramService } from '../../../services/telegramService';
import { useDiagnosisData } from '../../../contexts/DiagnosisDataContext';

interface DiagnosisTopbarProps {
  onToggleSidebar: () => void;
  onShowIntro: () => void;
  showAdminBtn: boolean;
  showBackdoorBtn: boolean;
}

export const DiagnosisTopbar: React.FC<DiagnosisTopbarProps> = ({ onToggleSidebar, showAdminBtn, showBackdoorBtn }) => {
  const navigate = useNavigate();
  const { lang, setLang } = useDiagnosisData();

  return (
    <div className="topbar">
      <button className="menu-toggle" onClick={onToggleSidebar}>☰</button>
      <div className="logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>🌐</div>
      <div className="brandwrap" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
        <div className="brand">해외선교부 <b>업무포탈</b></div>
        <div className="brandsub">GLOBAL MISSION DASHBOARD</div>
      </div>
      <span className="spacer" />

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
          onClick={() => navigate('/adminsetting/dashboard')}
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
