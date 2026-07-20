import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Globe, Search, Settings, LogIn, LogOut, Share2 } from 'lucide-react';

interface TopNavProps {
  months: string[];
  selectedMonth: string;
  onSelectMonth: (m: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenShareModal: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  months,
  selectedMonth,
  onSelectMonth,
  searchQuery,
  onSearchChange,
  onOpenShareModal
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const token = localStorage.getItem('accessToken');

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    navigate('/login');
  };

  return (
    <header className="glass-panel" style={{
      margin: '16px 24px',
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      borderRadius: '12px'
    }}>
      {/* Brand Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate('/')}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Globe size={22} color="white" />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.3px' }}>
            해외선교부 <span style={{ color: '#3b82f6' }}>교회 진단서</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>GLOBAL MISSION DASHBOARD</div>
        </div>
      </div>

      {/* Month Selector Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px' }}>
        {months.map((m) => (
          <button
            key={m}
            onClick={() => onSelectMonth(m)}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: 'none',
              background: selectedMonth === m ? 'var(--primary-blue)' : 'transparent',
              color: selectedMonth === m ? 'white' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Search Input & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ position: 'relative', width: '220px' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--navy-border)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
        </div>

        {/* Share Button */}
        <button
          onClick={onOpenShareModal}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid var(--navy-border)',
            color: 'white',
            padding: '8px 14px',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.85rem'
          }}
        >
          <Share2 size={16} /> 공유/출력
        </button>

        {/* Language Selector */}
        <select
          value={i18n.language}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.08)',
            color: 'white',
            border: '1px solid var(--navy-border)',
            borderRadius: '8px',
            padding: '8px 12px',
            cursor: 'pointer',
            fontSize: '0.85rem'
          }}
        >
          <option value="ko" style={{ color: 'black' }}>한국어</option>
          <option value="en" style={{ color: 'black' }}>English</option>
        </select>

        {/* Admin Link or Login/Logout */}
        {token ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => navigate('/adminsetting/dashboard')}
              className="btn-primary"
              style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            >
              <Settings size={16} /> 관리자
            </button>
            <button
              onClick={handleLogout}
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#f87171',
                padding: '8px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="btn-primary"
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            <LogIn size={16} /> 로그인
          </button>
        )}
      </div>
    </header>
  );
};
