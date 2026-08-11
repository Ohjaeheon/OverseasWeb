import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionService } from '../../../services/sessionService';
import { telegramService } from '../../../services/telegramService';
import { useDiagnosisData } from '../../../contexts/DiagnosisDataContext';
import { fmt } from '../../../utils/diagnosisMetrics';
import { ExportModal } from './ExportModal';

interface DiagnosisTopbarProps {
  onToggleSidebar: () => void;
  onShowIntro: () => void;
  showAdminBtn: boolean;
  showBackdoorBtn: boolean;
}

export const DiagnosisTopbar: React.FC<DiagnosisTopbarProps> = ({ onToggleSidebar, onShowIntro, showAdminBtn, showBackdoorBtn }) => {
  const navigate = useNavigate();
  const { months, month, setMonth, records, lang, setLang } = useDiagnosisData();
  const [query, setQuery] = useState('');
  const [showSug, setShowSug] = useState(false);

  const results = query.trim()
    ? records
      .filter((r) => r.month === month)
      .filter((r) => (r.name || '').includes(query) || (r.country || '').includes(query))
      .slice(0, 10)
    : [];

  const pickResult = (name: string) => {
    setQuery(''); setShowSug(false);
    navigate(`/diag?entity=${encodeURIComponent(name)}`);
  };

  return (
    <div className="topbar">
      <button className="menu-toggle" onClick={onToggleSidebar}>☰</button>
      <div className="logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>🌐</div>
      <div className="brandwrap" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
        <div className="brand">해외선교부 <b>업무포탈</b></div>
        <div className="brandsub">GLOBAL MISSION DASHBOARD</div>
      </div>
      <span className="spacer" />

      <div className="months">
        <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>📅 기준월</span>
        <select value={month} onChange={(e) => setMonth(e.target.value)}>
          {months.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="searchwrap">
        <span className="si">🔍</span>
        <input
          className="searchin"
          placeholder="교회명 검색…"
          autoComplete="off"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowSug(true); }}
          onFocus={() => setShowSug(true)}
          onBlur={() => setTimeout(() => setShowSug(false), 150)}
        />
        {showSug && (
          <div className="searchsug on">
            {results.length ? results.map((r) => (
              <div className="row" key={r.recordId} onClick={() => pickResult(r.name)}>
                <span className="nm">{r.name}</span>
                <span className="mt">{r.jipa || ''} · {fmt(r.registered)}명</span>
              </div>
            )) : query.trim() ? <div className="row" style={{ color: 'var(--muted)' }}>검색 결과가 없습니다</div> : null}
          </div>
        )}
      </div>

      <select className="langSel tb-langsel" value={lang} onChange={(e) => setLang(e.target.value as any)} title="Language / 语言 / 言語">
        <option value="ko">한국어</option>
        <option value="en">English</option>
        <option value="zh">中文</option>
        <option value="ja">日本語</option>
      </select>

      <ExportModal />
      <button className="repbtn" onClick={onShowIntro}>🏠 <span className="btn-txt-label">인트로</span></button>
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
