import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Globe, Search, Settings, LogIn, LogOut, Share2, FileText } from 'lucide-react';
import api from '../../services/api';

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

  const userStr = localStorage.getItem('user');
  const user = React.useMemo(() => {
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch (e) {
      return null;
    }
  }, [userStr]);

  const [pendingRequests, setPendingRequests] = React.useState<any[]>([]);
  const [showApprovalDropdown, setShowApprovalDropdown] = React.useState<boolean>(false);

  const fetchPendingRequests = async () => {
    if (!token || !user) return;
    try {
      const res = await api.get(`/evangelism/edit-requests/pending?name=${encodeURIComponent(user.name || '')}&role=${user.role || ''}`);
      setPendingRequests(res.data || []);
    } catch (e) {
      console.error("Failed to fetch pending edit requests", e);
    }
  };

  React.useEffect(() => {
    fetchPendingRequests();
    const interval = setInterval(fetchPendingRequests, 10000);
    return () => clearInterval(interval);
  }, [token, user]);

  React.useEffect(() => {
    const handleRefreshRequests = () => {
      fetchPendingRequests();
    };
    window.addEventListener('refreshEditRequests', handleRefreshRequests);
    return () => window.removeEventListener('refreshEditRequests', handleRefreshRequests);
  }, [user]);

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
            해외선교부 <span style={{ color: '#3b82f6' }}>업무포탈</span>
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
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Approval Document Icon */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowApprovalDropdown(!showApprovalDropdown)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid var(--navy-border)',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}
                title="결재 대기 목록"
              >
                <FileText size={16} />
                {pendingRequests.length > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    background: '#ef4444',
                    color: '#ffffff',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    fontSize: '10px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)'
                  }}>
                    {pendingRequests.length}
                  </span>
                )}
              </button>
              
              {showApprovalDropdown && (
                <div className="glass-panel" style={{
                  position: 'absolute',
                  right: 0,
                  top: '44px',
                  width: '320px',
                  backgroundColor: '#1e293b',
                  borderRadius: '12px',
                  border: '1px solid #334155',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                  zIndex: 1000,
                  padding: '14px',
                  color: '#ffffff',
                  textAlign: 'left'
                }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.92rem', fontWeight: 800, color: '#f1f5f9', borderBottom: '1px solid #334155', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📋 결재 대기 목록
                  </h4>
                  {pendingRequests.length === 0 ? (
                    <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>
                      대기 중인 결재 요청이 없습니다.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                      {pendingRequests.map((req) => (
                        <div key={req.requestId} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '10px', fontSize: '0.8rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 800, color: '#38bdf8' }}>{req.churchName}</span>
                            <span style={{ fontWeight: 700, color: '#cbd5e1' }}>{req.weekKey}</span>
                          </div>
                          <div style={{ color: '#f1f5f9', margin: '4px 0', fontWeight: 500 }}>
                            <b>사유:</b> {req.reason}
                          </div>
                          <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginBottom: '8px' }}>
                            요청자: {req.requestedBy}
                          </div>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={async () => {
                                try {
                                  await api.post(`/evangelism/edit-requests/${req.requestId}/approve`);
                                  alert('수정 요청이 승인되었습니다.');
                                  fetchPendingRequests();
                                  window.dispatchEvent(new Event('refreshEditRequests'));
                                } catch (e) {
                                  alert('승인 처리 중 오류가 발생했습니다.');
                                }
                              }}
                              style={{ background: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '4px 10px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}
                            >
                              승인
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await api.post(`/evangelism/edit-requests/${req.requestId}/reject`);
                                  alert('수정 요청이 반려되었습니다.');
                                  fetchPendingRequests();
                                  window.dispatchEvent(new Event('refreshEditRequests'));
                                } catch (e) {
                                  alert('반려 처리 중 오류가 발생했습니다.');
                                }
                              }}
                              style={{ background: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '4px 10px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}
                            >
                              반려
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

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
