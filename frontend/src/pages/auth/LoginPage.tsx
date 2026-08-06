import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { logService } from '../../services/logService';
import { sessionService } from '../../services/sessionService';
import { roleService } from '../../services/roleService';
import { telegramService } from '../../services/telegramService';

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
  const [telegramInitData, setTelegramInitData] = useState<string | undefined>(undefined);

  // 백도어 관련 상태
  const [isBackdoorAllowed, setIsBackdoorAllowed] = useState(false);
  const [isBackdoorMode, setIsBackdoorMode] = useState(false);
  const [backdoorUsername, setBackdoorUsername] = useState('');
  const [backdoorUserResults, setBackdoorUserResults] = useState<Array<{ username: string; name: string; role: string }>>([]);

  useEffect(() => {
    logService.addAccessLog('🔑 로그인 페이지', '/login');

    console.log("[Telegram WebApp Debug] isTelegramWebApp:", telegramService.isTelegramWebApp());
    const debugTg = telegramService.getWebApp();
    console.log("[Telegram WebApp Debug] WebApp object present:", !!debugTg);
    if (debugTg) {
      console.log("[Telegram WebApp Debug] initData length:", debugTg.initData ? debugTg.initData.length : 0);
    }

    // 백도어 사용 가능 IP인지 체크
    const checkBackdoor = async () => {
      try {
        const info = await authService.checkBackdoorIp();
        if (info.isBackdoorAllowed) {
          setIsBackdoorAllowed(true);
          const params = new URLSearchParams(window.location.search);
          if (params.get('mode') === 'backdoor') {
            setIsBackdoorMode(true);
          }
        }
      } catch (e) {
        console.warn("Backdoor IP check failed or disabled", e);
      }
    };
    checkBackdoor();

    // 세션이 이미 유효한 경우 로그인 생략 및 바로 대시보드로 이동
    if (sessionService.isSessionValid()) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          const redirectPath = roleService.getLoginRedirectPath(u.role);
          navigate(redirectPath);
          return;
        } catch (e) {}
      }
    }

    // 텔레그램 웹앱 자동 로그인 확인
    const checkTelegramAutoLogin = async () => {
      if (telegramService.isTelegramWebApp()) {
        const tg = telegramService.getWebApp();
        if (tg && tg.initData) {
          setTelegramInitData(tg.initData);
          setLoading(true);
          try {
            const response = await authService.telegramLogin(tg.initData);
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
                console.warn("Failed to fetch menu permissions on tg auto login", e);
              }
              
              const redirectPath = roleService.getLoginRedirectPath(response.role);
              navigate(redirectPath);
            } else if (response.message === 'NOT_LINKED') {
              setErrorMsg('이 텔레그램 계정은 본 시스템에 등록되지 않았습니다. 관리자에게 문의하여 연동을 진행해 주세요.');
            } else {
              setErrorMsg(response.message || '텔레그램 자동 로그인 실패');
            }
          } catch (err: any) {
            const msg = err.response?.data?.message || err.message || '텔레그램 자동 로그인 중 오류가 발생했습니다.';
            setErrorMsg(msg);
          } finally {
            setLoading(false);
          }
        }
      }
    };

    checkTelegramAutoLogin();
  }, [navigate]);

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
      const isTg = telegramService.isTelegramWebApp();
      const response = await authService.login({
        username: username.trim(),
        password: password.trim(),
        isTelegramWebApp: isTg,
        telegramInitData: telegramInitData
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
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || '아이디 또는 비밀번호가 일치하지 않습니다.';
      setErrorMsg(msg);
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

  const handleBackdoorUserChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setBackdoorUsername(val);
    if (!val.trim()) {
      setBackdoorUserResults([]);
      return;
    }

    try {
      const results = await authService.searchBackdoorUsers(val);
      setBackdoorUserResults(results);
    } catch (err) {
      console.error("Backdoor user search failed", err);
    }
  };

  const handleSelectBackdoorUser = async (user: string) => {
    setBackdoorUsername(user);
    setBackdoorUserResults([]);
    await executeBackdoorLogin(user);
  };

  const handleBackdoorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backdoorUsername.trim()) {
      setErrorMsg('아이디를 입력해주세요.');
      return;
    }
    await executeBackdoorLogin(backdoorUsername.trim());
  };

  const executeBackdoorLogin = async (user: string) => {
    setErrorMsg('');
    setLoading(true);
    try {
      const response = await authService.backdoorLogin(user);
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
          console.warn("Failed to fetch menu permissions from DB on backdoor login", e);
        }

        if (response.mustChangePassword) {
          alert("초기 계정 로그인에 성공하였습니다. 안전한 시스템 이용을 위해 먼저 비밀번호를 변경해주시기 바랍니다.");
          window.location.href = '/OverseasPortal/profile';
        } else {
          const redirectPath = roleService.getLoginRedirectPath(response.role);
          navigate(redirectPath);
        }
      } else {
        setErrorMsg(response.message || '백도어 로그인 실패');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data || err.message || '백도어 로그인 오류가 발생했습니다.');
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
          {isOtpRequired ? '🤖' : '✈️'}
        </div>

        {/* Title & Subtitle */}
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', marginBottom: '6px' }}>
          {telegramService.isTelegramWebApp()
            ? (errorMsg ? '접근 제한됨' : '텔레그램 간편 로그인')
            : (isOtpRequired ? '2차 OTP 인증' : (isBackdoorMode ? '개발자 백도어 로그인' : '해선부 업무포탈'))}
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '32px' }}>
          {telegramService.isTelegramWebApp()
            ? (errorMsg ? '보안 정책에 따라 접속이 불가합니다' : '텔레그램 앱 보안 인증 진행 중')
            : (isOtpRequired ? '텔레그램으로 전송된 인증번호를 입력하세요' : (isBackdoorMode ? '아이디 또는 이름을 입력하여 즉시 로그인합니다' : '인증사용자만 가능'))}
        </p>

        {/* Dynamic Forms / Telegram WebApp Status Card */}
        {telegramService.isTelegramWebApp() ? (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', margin: '20px 0' }}>
                <div className="telegram-loading-spinner" style={{
                  width: '40px',
                  height: '40px',
                  border: '3px solid rgba(59, 110, 245, 0.2)',
                  borderTop: '3px solid #3b6ef5',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                <p style={{ color: '#94a3b8', fontSize: '0.95rem', fontWeight: 600 }}>
                  텔레그램 계정 정보 인증 중...
                </p>
              </div>
            ) : errorMsg ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                <div style={{ fontSize: '48px', color: '#f87171', marginBottom: '8px' }}>⚠️</div>
                <div style={{
                  background: '#17233d',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'left',
                  fontSize: '0.875rem',
                  color: '#94a3b8',
                  lineHeight: '1.6'
                }}>
                  <div style={{ marginBottom: '8px', color: '#f8fafc', fontWeight: 600 }}>감지된 텔레그램 계정:</div>
                  {(() => {
                    const tg = telegramService.getWebApp();
                    const username = tg?.initDataUnsafe?.user?.username;
                    const firstName = tg?.initDataUnsafe?.user?.first_name;
                    const lastName = tg?.initDataUnsafe?.user?.last_name;
                    const fullName = [firstName, lastName].filter(Boolean).join(' ') || '이름 없음';
                    return (
                      <>
                        <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>• <b>사용자 ID:</b> {username ? `@${username}` : 'Username 없음'}</div>
                        <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>• <b>이름:</b> {fullName}</div>
                        <div>• <b>Chat ID:</b> {tg?.initDataUnsafe?.user?.id || '알 수 없음'}</div>
                      </>
                    );
                  })()}
                </div>
                <p style={{ color: '#f87171', fontSize: '0.85rem', lineHeight: '1.6', margin: 0, textAlign: 'center', fontWeight: 600 }}>
                  {errorMsg}
                </p>
                <p style={{ color: '#94a3b8', fontSize: '0.8rem', lineHeight: '1.5', margin: '4px 0 0', textAlign: 'center' }}>
                  본 포탈 시스템을 이용하시려면 관리자에게 이 텔레그램 정보를 전달하여 계정 등록/연동을 요청하시기 바랍니다.
                </p>
              </div>
            ) : (
              <div style={{ color: '#94a3b8', fontSize: '0.95rem' }}>인증 절차를 시작하고 있습니다...</div>
            )}
          </div>
        ) : (
          !isOtpRequired ? (
            isBackdoorMode ? (
              /* 3. Backdoor Form */
              <form onSubmit={handleBackdoorSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', color: '#94a3b8', marginBottom: '8px', fontWeight: 600 }}>
                    백도어 대상 아이디/이름 검색
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="아이디 또는 이름 입력"
                    value={backdoorUsername}
                    onChange={handleBackdoorUserChange}
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

                {/* Search Results Dropdown/List */}
                {backdoorUserResults.length > 0 && (
                  <div style={{
                    background: '#17233d',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    marginTop: '-10px',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    {backdoorUserResults.map((user) => (
                      <button
                        key={user.username}
                        type="button"
                        onClick={() => handleSelectBackdoorUser(user.username)}
                        style={{
                          padding: '12px 16px',
                          background: 'none',
                          border: 'none',
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          color: '#f8fafc',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          width: '100%',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                      >
                        <span>
                          <b style={{ color: '#60a5fa' }}>{user.name}</b> ({user.username})
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px' }}>
                          {user.role}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

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
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    fontSize: '1rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {loading ? '백도어 로그인 중...' : '즉시 로그인'}
                </button>
              </form>
            ) : (
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
          )
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
          )
        )}
        {isBackdoorAllowed && (
          <div style={{ marginTop: '20px', width: '100%', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
            <button
              type="button"
              onClick={() => {
                setIsBackdoorMode(!isBackdoorMode);
                setErrorMsg('');
                setBackdoorUsername('');
                setBackdoorUserResults([]);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#60a5fa',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                margin: '0 auto'
              }}
            >
              {isBackdoorMode ? '🔑 일반 로그인으로 전환' : '🚪 개발자 백도어 로그인'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
