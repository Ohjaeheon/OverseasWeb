import React, { useEffect, useState } from 'react';
import { userService, UserProfileResponse } from '../../services/userService';
import { adminService, TelegramBotConfig } from '../../services/adminService';
import { Save, Send, Shield, Info, ArrowLeft, Bot, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const MyProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [bots, setBots] = useState<TelegramBotConfig[]>([]);
  const [telegramId, setTelegramId] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  
  // States for UX
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Password Change States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccessMsg, setPwSuccessMsg] = useState('');
  const [pwErrorMsg, setPwErrorMsg] = useState('');

  // Test Message States
  const [selectedBotId, setSelectedBotId] = useState('');
  const [testMessage, setTestMessage] = useState('해선부 업무포탈 텔레그램 연동이 정상 완료되었습니다!');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  const loadProfileAndBots = async () => {
    try {
      setProfileLoading(true);
      const profileData = await userService.getProfile();
      setProfile(profileData);
      setTelegramId(profileData.telegramId || '');
      setTelegramChatId(profileData.telegramChatId || '');

      // Load active bots to allow testing
      const botsData = await adminService.getBots();
      const activeBots = botsData.filter(b => b.isActive && b.botToken);
      setBots(activeBots);
      if (activeBots.length > 0) {
        setSelectedBotId(activeBots[0].botId);
      }
    } catch (e) {
      console.error('Failed to load profile or bots', e);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    loadProfileAndBots();
  }, []);

  // 5초 간격 프로필 자동 폴링 (텔레그램 자동 연동 상태 실시간 갱신용)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const profileData = await userService.getProfile();
        // 만약 챗 ID가 갱신되었다면 상태 업데이트 및 localStorage 동기화
        if (profileData.telegramChatId !== telegramChatId) {
          setTelegramId(profileData.telegramId || '');
          setTelegramChatId(profileData.telegramChatId || '');
          setProfile(profileData);
          
          const localUserStr = localStorage.getItem('user');
          if (localUserStr) {
            const u = JSON.parse(localUserStr);
            u.telegramChatId = profileData.telegramChatId;
            u.telegramId = profileData.telegramId;
            u.isOtpExempt = profileData.isOtpExempt;
            localStorage.setItem('user', JSON.stringify(u));
          }
        }
      } catch (e) {
        console.warn("Failed to auto-poll profile updates", e);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [telegramChatId]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      const updated = await userService.updateProfile({
        telegramId: telegramId.trim(),
        telegramChatId: telegramChatId.trim()
      });
      setProfile(updated);
      setSaveSuccess(true);

      // LocalStorage 동기화
      const localUserStr = localStorage.getItem('user');
      if (localUserStr) {
        try {
          const u = JSON.parse(localUserStr);
          u.telegramId = updated.telegramId;
          u.telegramChatId = updated.telegramChatId;
          u.isOtpExempt = updated.isOtpExempt;
          localStorage.setItem('user', JSON.stringify(u));
        } catch (err) {
          console.warn("Failed to sync localStorage user", err);
        }
      }

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || '프로필 정보 수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwSuccessMsg('');
    setPwErrorMsg('');

    if (!currentPassword) {
      setPwErrorMsg('현재 비밀번호를 입력해주세요.');
      return;
    }
    if (!newPassword) {
      setPwErrorMsg('새 비밀번호를 입력해주세요.');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setPwErrorMsg('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }
    if (newPassword.length < 4) {
      setPwErrorMsg('비밀번호는 최소 4자리 이상이어야 합니다.');
      return;
    }

    setPwSaving(true);
    try {
      const response = await userService.updatePassword({
        currentPassword,
        newPassword
      });
      setPwSuccessMsg(response || '비밀번호가 성공적으로 변경되었습니다!');
      
      // 입력창 초기화
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');

      // localStorage의 mustChangePassword 정보도 false로 동기화
      const localUserStr = localStorage.getItem('user');
      if (localUserStr) {
        const u = JSON.parse(localUserStr);
        u.mustChangePassword = false;
        localStorage.setItem('user', JSON.stringify(u));
      }
      if (profile) {
        setProfile({ ...profile, mustChangePassword: false } as any);
      }
    } catch (err: any) {
      setPwErrorMsg(err.response?.data || err.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setPwSaving(false);
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBotId || !testMessage) return;

    setTesting(true);
    setTestResult({ type: null, message: '' });

    try {
      const response = await userService.testBotMessage({
        botId: selectedBotId,
        testMessage: testMessage.trim()
      });
      setTestResult({ type: 'success', message: response || '성공적으로 테스트 메시지를 발송했습니다!' });
    } catch (err: any) {
      const errorMsg = err.response?.data || err.message || '테스트 발송에 실패했습니다.';
      setTestResult({ type: 'error', message: errorMsg });
    } finally {
      setTesting(false);
    }
  };

  if (profileLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        color: '#94a3b8',
        fontWeight: 600
      }}>
        회원 프로필 정보를 조회하는 중입니다...
      </div>
    );
  }

  const getRoleBadgeColor = (role: string) => {
    if (role === 'ROLE_ADMIN' || role === 'ADMIN') return { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.2)' };
    return { bg: 'rgba(71, 85, 105, 0.1)', text: '#64748b', border: 'rgba(71, 85, 105, 0.2)' };
  };

  const roleStyles = getRoleBadgeColor(profile?.role || '');

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', color: '#1f2a44', fontFamily: '"Pretendard", sans-serif' }}>
      
      {/* Back to Portal Button */}
      <button
        onClick={() => navigate('/')}
        style={{
          background: 'none',
          border: 'none',
          color: '#2563eb',
          fontWeight: 700,
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          padding: 0,
          marginBottom: '20px'
        }}
      >
        <ArrowLeft size={16} /> 대시보드 포탈로 돌아가기
      </button>

      {/* Title Header */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          🌍 회원 정보 및 텔레그램 연동
        </h2>
        <p style={{ color: '#6b7a99', fontSize: '0.88rem', marginTop: '4px' }}>
          본인의 기본 계정 정보를 확인하고 2차 인증(OTP) 및 알림 전송을 위한 텔레그램 연동 정보를 직접 관리합니다.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Side: Account Info & Settings Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Card 1: Basic Account Info */}
          <div className="glass-panel" style={{
            background: '#ffffff',
            border: '1px solid #e6edf8',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 15px rgba(20, 40, 90, 0.02)'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px 0', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              👤 기본 계정 정보
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span style={{ color: '#6b7a99', fontWeight: 600 }}>아이디 (아이덴티티)</span>
                <span style={{ color: '#1e293b', fontWeight: 700 }}>{profile?.username}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span style={{ color: '#6b7a99', fontWeight: 600 }}>성명 (실명)</span>
                <span style={{ color: '#1e293b', fontWeight: 700 }}>{profile?.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', alignItems: 'center' }}>
                <span style={{ color: '#6b7a99', fontWeight: 600 }}>소속 권한 그룹</span>
                <span style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  background: roleStyles.bg,
                  color: roleStyles.text,
                  border: `1px solid ${roleStyles.border}`,
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}>
                  {profile?.role === 'ROLE_ADMIN' ? '관리자' : '해외선교부 담당자'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span style={{ color: '#6b7a99', fontWeight: 600 }}>데이터 접근 범위</span>
                <span style={{ color: '#2563eb', fontWeight: 700 }}>{profile?.assignedCountry || '전체'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span style={{ color: '#6b7a99', fontWeight: 600 }}>2차 OTP 예외 설정</span>
                <span>
                  {profile?.isOtpExempt ? (
                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>예외 계정 (OTP 제외됨)</span>
                  ) : (
                    <span style={{ color: '#10b981', fontWeight: 700 }}>보안 적용 계정 (OTP 필수)</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Telegram Settings Form */}
          <div className="glass-panel" style={{
            background: '#ffffff',
            border: '1px solid #e6edf8',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 15px rgba(20, 40, 90, 0.02)'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px 0', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              ⚙️ 텔레그램 연동 설정
            </h3>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Telegram ID (@사용자명)
                </label>
                <input
                  type="text"
                  placeholder="예: @my_telegram_id"
                  value={telegramId}
                  onChange={(e) => setTelegramId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    outline: 'none',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Telegram Chat ID
                </label>
                <input
                  type="text"
                  placeholder="예: 123456789"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    outline: 'none',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {saveSuccess && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#10b981',
                  fontSize: '0.82rem',
                  fontWeight: 600
                }}>
                  성공적으로 정보가 저장되었습니다!
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="btn-primary"
                style={{
                  padding: '12px',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: saving ? 'not-allowed' : 'pointer'
                }}
              >
                <Save size={16} /> {saving ? '저장 중...' : '연동 정보 저장'}
              </button>
            </form>
          </div>

          {/* Card 3: Change Password Form */}
          <div className="glass-panel" style={{
            background: '#ffffff',
            border: '1px solid #e6edf8',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 15px rgba(20, 40, 90, 0.02)'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px 0', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              🔑 비밀번호 변경
            </h3>

            {profile?.mustChangePassword && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '16px',
                fontSize: '0.8rem',
                color: '#ef4444',
                fontWeight: 700,
                lineHeight: 1.4
              }}>
                ⚠️ 보안을 위해 임시/초기 비밀번호를 사용 중입니다. 반드시 새 비밀번호로 교체한 후 시스템을 사용해 주세요.
              </div>
            )}

            <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  현재 비밀번호
                </label>
                <input
                  type="password"
                  required
                  placeholder="현재 사용 중인 비밀번호"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    outline: 'none',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  새 비밀번호
                </label>
                <input
                  type="password"
                  required
                  placeholder="새로 사용할 비밀번호"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    outline: 'none',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  새 비밀번호 확인
                </label>
                <input
                  type="password"
                  required
                  placeholder="새 비밀번호 다시 입력"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    outline: 'none',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {pwErrorMsg && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#ef4444',
                  fontSize: '0.82rem',
                  fontWeight: 600
                }}>
                  {pwErrorMsg}
                </div>
              )}

              {pwSuccessMsg && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#10b981',
                  fontSize: '0.82rem',
                  fontWeight: 600
                }}>
                  {pwSuccessMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={pwSaving}
                className="btn-primary"
                style={{
                  padding: '12px',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: pwSaving ? 'not-allowed' : 'pointer',
                  background: '#4f46e5'
                }}
              >
                {pwSaving ? '변경 중...' : '비밀번호 변경'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Bot Integration Test Area */}
        <div className="glass-panel" style={{
          background: '#ffffff',
          border: '1px solid #e6edf8',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 15px rgba(20, 40, 90, 0.02)',
          height: '100%',
          boxSizing: 'border-box'
        }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px 0', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Send size={18} color="#10b981" /> 텔레그램 연동 테스트 발송
          </h3>

          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            background: 'rgba(59, 130, 246, 0.05)',
            border: '1px solid rgba(59, 130, 246, 0.15)',
            borderRadius: '10px',
            padding: '12px 14px',
            marginBottom: '20px',
            fontSize: '0.78rem',
            color: '#1e3a8a',
            lineHeight: 1.5
          }}>
            <Info size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#3b82f6' }} />
            <div>
              <span style={{ display: 'block', fontWeight: 700, marginBottom: '4px', color: '#2563eb' }}>💡 초간편 텔레그램 연동 팁</span>
              1. 왼쪽의 <b>Telegram ID (@사용자명)</b>를 먼저 입력 후 저장하세요.<br/>
              2. 텔레그램 앱에서 연동할 봇을 검색하여 <b>시작 (또는 /start)</b> 버튼을 누르면 <b>Chat ID가 자동으로 연동</b>됩니다!<br/>
              3. 만약 수동 입력을 원한다면, 봇에게 <b>/myid</b> 라고 메시지를 발송하여 자신의 챗 ID 번호를 즉시 조회할 수 있습니다.
            </div>
          </div>

          {!profile?.telegramChatId ? (
            <div style={{ padding: '24px 10px', textAlign: 'center', color: '#6b7a99', fontSize: '0.86rem', fontWeight: 600, lineHeight: 1.6 }}>
              현재 등록된 Chat ID가 없습니다.<br/>
              왼쪽에 <b>Telegram ID (@사용자명)</b>을 저장한 뒤,<br/>
              연동할 텔레그램 봇을 검색해 대화방에서 <b>시작 (/start)</b> 버튼을 누르시면<br/>
              <span style={{ color: '#2563eb' }}>Chat ID가 자동으로 조회되어 저장 및 연동 완료됩니다.</span>
            </div>
          ) : bots.length === 0 ? (
            <div style={{ padding: '30px 10px', textAlign: 'center', color: '#6b7a99', fontSize: '0.88rem', fontWeight: 600 }}>
              현재 활성화되거나 연동 가능한 텔레그램 봇이 시스템 설정에 등록되어 있지 않습니다.
            </div>
          ) : (
            <form onSubmit={handleSendTestMessage} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  테스트 대상 봇 선택
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {bots.map((bot) => (
                    <label
                      key={bot.botId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 14px',
                        background: selectedBotId === bot.botId ? 'rgba(37, 99, 235, 0.05)' : '#ffffff',
                        border: `1px solid ${selectedBotId === bot.botId ? '#3b82f6' : '#cbd5e1'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      <input
                        type="radio"
                        name="testBot"
                        checked={selectedBotId === bot.botId}
                        onChange={() => setSelectedBotId(bot.botId)}
                        style={{ cursor: 'pointer' }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Bot size={18} color={selectedBotId === bot.botId ? '#3b82f6' : '#64748b'} />
                        <div>
                          <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: selectedBotId === bot.botId ? '#1e3a8a' : '#334155' }}>
                            {bot.name}
                          </span>
                          <span style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8' }}>
                            {bot.botUsername ? `@${bot.botUsername.replace('@', '')}` : '사용자명 미등록'}
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  테스트 전송 메시지
                </label>
                <textarea
                  required
                  placeholder="메시지 내용 입력"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    outline: 'none',
                    fontSize: '0.9rem',
                    resize: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {testResult.type && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  background: testResult.type === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  border: `1px solid ${testResult.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  color: testResult.type === 'success' ? '#10b981' : '#ef4444',
                  lineHeight: 1.4
                }}>
                  {testResult.message}
                </div>
              )}

              <button
                type="submit"
                disabled={testing}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#10b981',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  color: 'white',
                  cursor: testing ? 'not-allowed' : 'pointer',
                  opacity: testing ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '0.88rem'
                }}
              >
                <Send size={16} /> {testing ? '메시지 발송 중...' : '테스트 메시지 발송'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
