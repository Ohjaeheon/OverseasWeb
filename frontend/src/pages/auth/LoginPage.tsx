import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { logService } from '../../services/logService';
import { sessionService } from '../../services/sessionService';
import { roleService } from '../../services/roleService';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    logService.addAccessLog('🔑 로그인 페이지', '/login', 'guest');
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('아이디와 비밀번호를 모두 입력해주세요.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const response = await authService.login({
        username: username.trim(),
        password: password.trim(),
        isTelegramWebApp: false
      });

      if (response.accessToken) {
        const userInfo = {
          username: response.username,
          name: response.name,
          role: response.role,
          assignedCountry: response.assignedCountry
        };
        sessionService.startSession(userInfo, response.accessToken);

        logService.addLoginLog(response.username, 'SUCCESS', '192.168.0.53', '로그인 성공');

        // 역할(Role) 및 세부 권한별 페이지 자동 분기
        const redirectPath = roleService.getLoginRedirectPath(response.role);
        navigate(redirectPath);
      } else {
        const msg = response.message || '로그인에 실패했습니다.';
        setErrorMsg(msg);
        logService.addLoginLog(username.trim(), 'FAILED', '192.168.0.53', msg);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || '아이디 또는 비밀번호가 일치하지 않습니다.';
      setErrorMsg(msg);
      logService.addLoginLog(username.trim(), 'FAILED', '192.168.0.53', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: '#0b1120',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      {/* Sleek Dark Login Card matching user image 2 */}
      <div style={{
        maxWidth: '410px',
        width: '100%',
        background: '#111a2e',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '24px',
        padding: '44px 36px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center'
      }}>
        {/* Top Icon */}
        <div style={{ fontSize: '42px', marginBottom: '16px', lineHeight: 1 }}>
          ✈️
        </div>

        {/* Title & Subtitle */}
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', marginBottom: '6px' }}>
          해선부 업무포탈
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '32px' }}>
          인증사용자만 가능
        </p>

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
          {/* Username Field */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: '#94a3b8', marginBottom: '8px', fontWeight: 600 }}>
              아이디
            </label>
            <input
              type="text"
              required
              placeholder="아이디 입력"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 16px',
                background: '#17233d',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                color: '#ffffff',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Password Field */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: '#94a3b8', marginBottom: '8px', fontWeight: 600 }}>
              비밀번호
            </label>
            <input
              type="password"
              required
              placeholder="비밀번호 입력"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 16px',
                background: '#17233d',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                color: '#ffffff',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {errorMsg && (
            <div style={{ color: '#f87171', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }}>
              {errorMsg}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '15px',
              marginTop: '8px',
              borderRadius: '14px',
              border: 'none',
              background: 'linear-gradient(135deg, #5b5cf6, #4f46e5)',
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(91, 92, 246, 0.4)',
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
};
