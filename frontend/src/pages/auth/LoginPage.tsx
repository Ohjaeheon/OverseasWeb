import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { logService } from '../../services/logService';
import { sessionService } from '../../services/sessionService';
import { roleService } from '../../services/roleService';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  // 1차 로그인 정보
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // 2차 OTP 정보
  const [isOtpRequired, setIsOtpRequired] = useState(false);
  const [preAuthToken, setPreAuthToken] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpTimeLeft, setOtpTimeLeft] = useState(180); // 3분 타임아웃 (180초)
  
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    logService.addAccessLog('🔑 로그인 페이지', '/login', 'guest');
  }, []);

  // OTP Countdown Timer
  useEffect(() => {
    if (!isOtpRequired) return;
    if (otpTimeLeft <= 0) {
      setErrorMsg('인증시간이 만료되었습니다. 다시 로그인해주세요.');
      setIsOtpRequired(false);
      setPreAuthToken('');
      setOtpCode('');
      return;
    }

    const timer = setInterval(() => {
      setOtpTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isOtpRequired, otpTimeLeft]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

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

      if (response.requireOtp && response.preAuthToken) {
        // OTP 인증 대기 화면으로 전환
        setIsOtpRequired(true);
        setPreAuthToken(response.preAuthToken);
        setOtpTimeLeft(180); // 3분
        setOtpCode('');
      } else if (response.accessToken) {
        const userInfo = {
          username: response.username,
          name: response.name,
          role: response.role,
          assignedCountry: response.assignedCountry,
          mustChangePassword: response.mustChangePassword || false,
          isOtpExempt: response.isOtpExempt || false,
          telegramChatId: response.telegramChatId || ''
        };
        sessionService.startSession(userInfo, response.accessToken);

        try {
          await roleService.fetchMenuPermissionsFromDb();
        } catch (e) {
          console.warn("Failed to fetch menu permissions from DB on login", e);
        }

        logService.addLoginLog(response.username, 'SUCCESS', '192.168.0.53', '로그인 성공');

        if (response.mustChangePassword) {
          alert("초기 계정 로그인에 성공하였습니다. 안전한 시스템 이용을 위해 먼저 비밀번호를 변경해주시기 바랍니다.");
          window.location.href = '/OverseasPortal/profile';
        } else {
          // 역할(Role) 및 세부 권한별 페이지 자동 분기
          const redirectPath = roleService.getLoginRedirectPath(response.role);
          navigate(redirectPath);
        }
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

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.length !== 6) {
      setErrorMsg('6자리 인증번호를 정확히 입력해주세요.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const response = await authService.verifyOtp({
        preAuthToken: preAuthToken,
        otpCode: otpCode.trim()
      });

      if (response.accessToken) {
        const userInfo = {
          username: response.username,
          name: response.name,
          role: response.role,
          assignedCountry: response.assignedCountry,
          mustChangePassword: response.mustChangePassword || false,
          isOtpExempt: response.isOtpExempt || false,
          telegramChatId: response.telegramChatId || ''
        };
        sessionService.startSession(userInfo, response.accessToken);

        try {
          await roleService.fetchMenuPermissionsFromDb();
        } catch (e) {
          console.warn("Failed to fetch menu permissions from DB on login", e);
        }

        logService.addLoginLog(response.username, 'SUCCESS', '192.168.0.53', '2차 OTP 로그인 성공');

        if (response.mustChangePassword) {
          alert("초기 계정 로그인에 성공하였습니다. 안전한 시스템 이용을 위해 먼저 비밀번호를 변경해주시기 바랍니다.");
          window.location.href = '/OverseasPortal/profile';
        } else {
          const redirectPath = roleService.getLoginRedirectPath(response.role);
          navigate(redirectPath);
        }
      } else {
        const msg = response.message || '인증에 실패했습니다.';
        setErrorMsg(msg);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || '인증번호가 일치하지 않거나 오류가 발생했습니다.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setIsOtpRequired(false);
    setPreAuthToken('');
    setOtpCode('');
    setErrorMsg('');
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
          {isOtpRequired ? '🤖' : '✈️'}
        </div>

        {/* Title & Subtitle */}
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', marginBottom: '6px' }}>
          {isOtpRequired ? '2차 OTP 인증' : '해선부 업무포탈'}
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '32px' }}>
          {isOtpRequired ? '텔레그램으로 전송된 인증번호를 입력하세요' : '인증사용자만 가능'}
        </p>

        {/* Dynamic Forms */}
        {!isOtpRequired ? (
          /* 1. Login Form (ID/PW) */
          <form onSubmit={handleLoginSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
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
        ) : (
          /* 2. OTP Form (6 Digits & Timer) */
          <form onSubmit={handleOtpSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.875rem', color: '#94a3b8', fontWeight: 600 }}>
                  인증번호 (6자리 숫자)
                </label>
                <span style={{ fontSize: '0.875rem', color: '#f59e0b', fontWeight: 800 }}>
                  ⏱️ {formatTimer(otpTimeLeft)}
                </span>
              </div>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: '#17233d',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  letterSpacing: '6px',
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

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={handleBackToLogin}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: '#17233d',
                  color: '#94a3b8',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                이전으로
              </button>
              <button
                type="submit"
                disabled={loading || otpTimeLeft <= 0}
                style={{
                  flex: 2,
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: (loading || otpTimeLeft <= 0) ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? '인증 중...' : '인증 완료'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
