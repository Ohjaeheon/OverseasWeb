import React, { useEffect, useState } from 'react';
import { authService } from '../../services/authService';

export const BackdoorIpSettingPage: React.FC = () => {
  const [clientIp, setClientIp] = useState('');
  const [allowedIps, setAllowedIps] = useState<string[]>([]);
  const [newIp, setNewIp] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchIpInfo = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Check IP first
      const ipCheck = await authService.checkBackdoorIp();
      setClientIp(ipCheck.clientIp);

      // Check if user is logged in as admin
      const userStr = localStorage.getItem('user');
      let isAdmin = false;
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          isAdmin = u.role === 'ROLE_ADMIN' || u.role === 'ADMIN' || u.role === '관리자' || u.role === 'ROLE_관리자';
        } catch (e) {}
      }

      const isAllowedToView = ipCheck.isLocalhost || (ipCheck.isBackdoorAllowed && isAdmin);

      if (!isAllowedToView) {
        setErrorMsg('이 페이지는 localhost 접속자 또는 인가된 IP의 관리자만 접근할 수 있습니다.');
        setLoading(false);
        return;
      }

      // 2. Fetch allowed IPs
      const ips = await authService.getBackdoorIps();
      setAllowedIps(ips);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.response?.data || '서버 오류로 인해 IP 목록을 조회하지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIpInfo();
  }, []);

  const handleAddIp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIp.trim()) {
      alert('추가할 IP 주소를 입력해주세요.');
      return;
    }

    // IP validation regex (IPv4 / IPv6 simple check)
    const ipRegex = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$|^([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}$|^::1$|^localhost$/;
    if (!ipRegex.test(newIp.trim())) {
      alert('올바른 IP 형식이 아닙니다.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    try {
      const updatedList = await authService.addBackdoorIp(newIp.trim());
      setAllowedIps(updatedList);
      setSuccessMsg(`IP [${newIp.trim()}]가 성공적으로 등록되었습니다.`);
      setNewIp('');
    } catch (e: any) {
      setErrorMsg(e.response?.data || 'IP 등록에 실패했습니다.');
    }
  };

  const handleDeleteIp = async (ipToDelete: string) => {
    if (['127.0.0.1', '0:0:0:0:0:0:0:1', '::1', 'localhost'].includes(ipToDelete)) {
      alert('로컬 루프백 IP(localhost)는 삭제할 수 없습니다.');
      return;
    }

    if (!window.confirm(`IP [${ipToDelete}]를 백도어 허용 리스트에서 삭제하시겠습니까?`)) {
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    try {
      const updatedList = await authService.deleteBackdoorIp(ipToDelete);
      setAllowedIps(updatedList);
      setSuccessMsg(`IP [${ipToDelete}]가 삭제되었습니다.`);
    } catch (e: any) {
      setErrorMsg(e.response?.data || 'IP 삭제에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '300px', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        데이터 조회 중...
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <style>{`
        .backdoor-table th, .backdoor-table td {
          background: transparent !important;
          position: static !important;
          color: #f8fafc !important;
        }
        .backdoor-table tr:hover td {
          background: rgba(255, 255, 255, 0.02) !important;
        }
        .backdoor-table th {
          color: #94a3b8 !important;
        }
      `}</style>
      <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        🚪 개발자 백도어 IP 설정
      </h2>
      <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '24px' }}>
        패스워드 없이 로그인이 가능한 특정 IP 목록을 관리합니다. (이 페이지는 127.0.0.1 로컬 접속자만 이용 가능합니다.)
      </p>

      {errorMsg && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '12px',
          padding: '16px',
          color: '#f87171',
          marginBottom: '20px',
          fontSize: '0.9rem',
          fontWeight: 600
        }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {successMsg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '12px',
          padding: '16px',
          color: '#34d399',
          marginBottom: '20px',
          fontSize: '0.9rem',
          fontWeight: 600
        }}>
          ✅ {successMsg}
        </div>
      )}

      {/* Info card */}
      <div className="glass-panel" style={{
        padding: '20px',
        borderRadius: '16px',
        background: '#17233d',
        border: '1px solid rgba(255,255,255,0.05)',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>현재 내 접속 IP</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#60a5fa' }}>{clientIp}</div>
        </div>
        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '0.8rem',
          color: '#93c5fd',
          fontWeight: 600
        }}>
          Localhost 접속 인증 완료
        </div>
      </div>

      {/* IP Registration Form */}
      <div className="glass-panel" style={{
        padding: '24px',
        borderRadius: '16px',
        background: '#111a2e',
        border: '1px solid rgba(255,255,255,0.08)',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '16px' }}>새로운 IP 추가 허용</h3>
        <form onSubmit={handleAddIp} style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            required
            placeholder="IP 주소 입력 (예: 192.168.0.22)"
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: '#17233d',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              color: '#ffffff',
              fontSize: '0.95rem',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: '#ffffff',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
            }}
          >
            허용 추가
          </button>
        </form>
      </div>

      {/* Allowed IPs List */}
      <div className="glass-panel" style={{
        padding: '24px',
        borderRadius: '16px',
        background: '#111a2e',
        border: '1px solid rgba(255,255,255,0.08)'
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '16px' }}>현재 허용된 IP 리스트</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="backdoor-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '0.85rem' }}>
                <th style={{ padding: '12px 8px' }}>IP 주소</th>
                <th style={{ padding: '12px 8px' }}>유형</th>
                <th style={{ padding: '12px 8px', textAlign: 'right' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {allowedIps.map((ip) => {
                const isLocal = ['127.0.0.1', '0:0:0:0:0:0:0:1', '::1', 'localhost'].includes(ip);
                return (
                  <tr key={ip} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc', fontSize: '0.95rem' }}>
                    <td style={{ padding: '14px 8px', fontWeight: 600 }}>{ip}</td>
                    <td style={{ padding: '14px 8px' }}>
                      {isLocal ? (
                        <span style={{ fontSize: '0.75rem', background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                          로컬 루프백
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                          인가된 외부 IP
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDeleteIp(ip)}
                        disabled={isLocal}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: isLocal ? '#475569' : '#f87171',
                          cursor: isLocal ? 'not-allowed' : 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          transition: 'color 0.2s'
                        }}
                      >
                        {isLocal ? '삭제불가' : '허용 해제'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {allowedIps.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: '20px 8px', textAlign: 'center', color: '#94a3b8' }}>
                    등록된 허용 IP 주소가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
