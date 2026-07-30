import React, { useEffect, useState } from 'react';
import { adminService, TelegramBotConfig } from '../../services/adminService';
import { userService } from '../../services/userService';
import { Save, Play, Edit2, Trash2, Plus, X, ToggleLeft, ToggleRight, Info } from 'lucide-react';

export const AdminBotPage: React.FC = () => {
  const [bots, setBots] = useState<TelegramBotConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  
  // Form State
  const [currentBot, setCurrentBot] = useState<Partial<TelegramBotConfig> | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Test Message Form State
  const [testBotId, setTestBotId] = useState('');
  const [testMessage, setTestMessage] = useState('봇 연결이 정상적으로 작동하고 있습니다. [해선부 업무포탈]');
  const [testSending, setTestSending] = useState(false);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  // Profile info for current user to notify test availability
  const [myProfile, setMyProfile] = useState<any>(null);

  const fetchBots = async () => {
    try {
      setLoading(true);
      const data = await adminService.getBots();
      setBots(data);
    } catch (e) {
      console.error('Failed to load bots config', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyProfile = async () => {
    try {
      const data = await userService.getProfile();
      setMyProfile(data);
    } catch (e) {
      console.warn('Failed to load current admin profile for bot testing', e);
    }
  };

  useEffect(() => {
    fetchBots();
    fetchMyProfile();
  }, []);

  const handleToggleActive = async (botId: string, currentStatus: boolean) => {
    const updatedBots = bots.map((b) =>
      b.botId === botId ? { ...b, isActive: !currentStatus } : b
    );
    try {
      await adminService.updateBots(updatedBots);
      setBots(updatedBots);
    } catch (e) {
      alert('봇 활성화 상태 변경 실패');
    }
  };

  const handleOpenAddModal = () => {
    setCurrentBot({
      botId: '',
      name: '',
      botToken: '',
      botUsername: '',
      isActive: true,
      description: '',
    });
    setIsEditMode(false);
    setShowModal(true);
  };

  const handleOpenEditModal = (bot: TelegramBotConfig) => {
    setCurrentBot({ ...bot });
    setIsEditMode(true);
    setShowModal(true);
  };

  const handleOpenTestModal = (botId: string) => {
    setTestBotId(botId);
    setTestStatus({ type: null, message: '' });
    setShowTestModal(true);
  };

  const handleSaveBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBot) return;

    if (!currentBot.botId || !currentBot.name || !currentBot.botToken) {
      alert('봇 ID, 봇 이름, 토큰은 필수값입니다.');
      return;
    }

    let updatedBots = [...bots];
    if (isEditMode) {
      updatedBots = updatedBots.map((b) => (b.botId === currentBot.botId ? (currentBot as TelegramBotConfig) : b));
    } else {
      if (bots.some((b) => b.botId === currentBot.botId)) {
        alert('이미 존재하는 봇 ID입니다.');
        return;
      }
      updatedBots.push(currentBot as TelegramBotConfig);
    }

    try {
      await adminService.updateBots(updatedBots);
      setBots(updatedBots);
      setShowModal(false);
      setCurrentBot(null);
    } catch (e) {
      alert('봇 정보 저장 실패');
    }
  };

  const handleDeleteBot = async (botId: string) => {
    if (botId === 'otp_bot' || botId === 'approval_bot') {
      alert('시스템 기본 봇(OTP봇, 결재관리봇)은 삭제할 수 없습니다.');
      return;
    }

    if (!window.confirm('정말 이 봇 설정을 삭제하시겠습니까?')) return;

    const updatedBots = bots.filter((b) => b.botId !== botId);
    try {
      await adminService.updateBots(updatedBots);
      setBots(updatedBots);
    } catch (e) {
      alert('봇 삭제 실패');
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testBotId || !testMessage) return;

    setTestSending(true);
    setTestStatus({ type: null, message: '' });

    try {
      const response = await userService.testBotMessage({
        botId: testBotId,
        testMessage: testMessage,
      });
      setTestStatus({ type: 'success', message: response || '성공적으로 테스트 메시지가 발송되었습니다!' });
    } catch (err: any) {
      const errorMsg = err.response?.data || err.message || '테스트 메시지 발송에 실패했습니다.';
      setTestStatus({ type: 'error', message: errorMsg });
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div>
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#1f2a44', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🤖 봇 연결 관리
          </h2>
          <p style={{ color: '#6b7a99', fontSize: '0.85rem', marginTop: '4px' }}>
            시스템 내 텔레그램 봇(결재 알림, 2차 로그인 OTP 등) 목록 및 연결 토큰을 관리합니다.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 18px',
            fontSize: '0.88rem',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
          }}
        >
          <Plus size={16} /> 봇 연결 추가
        </button>
      </div>

      {/* Info Warning Banner */}
      {!myProfile?.telegramChatId && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: '12px',
          padding: '14px 20px',
          marginBottom: '24px',
          color: '#d97706',
          fontSize: '0.85rem',
          fontWeight: 600
        }}>
          <Info size={20} style={{ flexShrink: 0 }} />
          <div>
            현재 관리자님의 계정에 <b>텔레그램 Chat ID</b>가 등록되어 있지 않습니다.
            연동된 봇의 작동 상태를 테스트하기 위해 먼저 <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => (window as any).reactNavigate('/profile')}>마이프로필(회원관리)</span> 페이지나 <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => (window as any).reactNavigate('/adminsetting/users')}>회원 관리</span>에서 본인의 텔레그램 Chat ID를 연동해주세요.
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7a99', fontWeight: 600 }}>
          봇 설정을 로딩하고 있습니다...
        </div>
      ) : bots.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7a99', borderRadius: '12px' }}>
          등록된 봇이 없습니다. 우측 상단의 "봇 연결 추가"를 눌러 봇 설정을 생성해주세요.
        </div>
      ) : (
        /* Bots Grid Layout */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {bots.map((bot) => (
            <div
              key={bot.botId}
              className="glass-panel"
              style={{
                position: 'relative',
                background: '#ffffff',
                border: '1px solid #e6edf8',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 4px 15px rgba(20, 40, 90, 0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '100%',
                boxSizing: 'border-box'
              }}
            >
              <div>
                {/* Header within Card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: bot.botId === 'otp_bot' || bot.botId === 'approval_bot' ? '#3b82f6' : '#8b5cf6',
                      background: bot.botId === 'otp_bot' || bot.botId === 'approval_bot' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(139, 92, 246, 0.08)',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {bot.botId === 'otp_bot' || bot.botId === 'approval_bot' ? 'System Default' : 'Custom'}
                    </span>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1f2a44', margin: '6px 0 2px 0' }}>
                      {bot.name}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                      ID: {bot.botId}
                    </span>
                  </div>

                  {/* Active Toggle Switch */}
                  <div
                    onClick={() => handleToggleActive(bot.botId, bot.isActive)}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
                    title={bot.isActive ? '비활성화' : '활성화'}
                  >
                    {bot.isActive ? (
                      <ToggleRight size={38} color="#10b981" style={{ filter: 'drop-shadow(0 2px 4px rgba(16, 185, 129, 0.15))' }} />
                    ) : (
                      <ToggleLeft size={38} color="#cbd5e1" />
                    )}
                  </div>
                </div>

                {/* Description */}
                <p style={{ fontSize: '0.85rem', color: '#6b7a99', lineHeight: 1.5, margin: '0 0 20px 0', minHeight: '38px' }}>
                  {bot.description || '설명이 작성되어 있지 않은 봇입니다.'}
                </p>

                {/* Info Fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: '#94a3b8', fontWeight: 600 }}>봇 사용자명</span>
                    <span style={{ color: '#475569', fontWeight: 700 }}>
                      {bot.botUsername ? `@${bot.botUsername.replace('@', '')}` : '미등록'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: '#94a3b8', fontWeight: 600 }}>봇 토큰</span>
                    <span
                      style={{ color: '#475569', fontWeight: 600, fontFamily: 'monospace' }}
                      title={bot.botToken}
                    >
                      {bot.botToken
                        ? `${bot.botToken.slice(0, 10)}...${bot.botToken.slice(-6)}`
                        : '토큰 없음'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <button
                  onClick={() => handleOpenTestModal(bot.botId)}
                  disabled={!bot.botToken || !bot.isActive}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: bot.botToken && bot.isActive ? '#0f172a' : '#cbd5e1',
                    cursor: bot.botToken && bot.isActive ? 'pointer' : 'not-allowed',
                    transition: 'all 0.15s'
                  }}
                >
                  <Play size={14} /> 테스트 발송
                </button>

                <button
                  onClick={() => handleOpenEditModal(bot)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    background: '#3b82f6',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <Edit2 size={14} /> 수정
                </button>

                {bot.botId !== 'otp_bot' && bot.botId !== 'approval_bot' && (
                  <button
                    onClick={() => handleDeleteBot(bot.botId)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.15)',
                      borderRadius: '8px',
                      padding: '8px',
                      color: '#ef4444',
                      cursor: 'pointer'
                    }}
                    title="봇 삭제"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Bot Modal */}
      {showModal && currentBot && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '500px',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            padding: '28px',
            color: '#1f2a44',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                {isEditMode ? '🤖 봇 연결 정보 수정' : '🤖 신규 봇 연결 등록'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveBot} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  봇 식별자 ID (수정불가)
                </label>
                <input
                  type="text"
                  required
                  disabled={isEditMode}
                  placeholder="예: log_bot"
                  value={currentBot.botId}
                  onChange={(e) => setCurrentBot({ ...currentBot, botId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    background: isEditMode ? '#f8fafc' : '#ffffff',
                    outline: 'none',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  봇 이름
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 로그 알림 봇"
                  value={currentBot.name}
                  onChange={(e) => setCurrentBot({ ...currentBot, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    outline: 'none',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  텔레그램 봇 Access Token (봇 토큰)
                </label>
                <input
                  type="password"
                  required
                  placeholder="HTTP API Token (예: 123456:ABC-DEF...)"
                  value={currentBot.botToken}
                  onChange={(e) => setCurrentBot({ ...currentBot, botToken: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    outline: 'none',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  봇 계정 사용자명 (Username)
                </label>
                <input
                  type="text"
                  placeholder="예: OverseasLog_Bot (@ 제외)"
                  value={currentBot.botUsername}
                  onChange={(e) => setCurrentBot({ ...currentBot, botUsername: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    outline: 'none',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  봇 설명
                </label>
                <textarea
                  placeholder="이 봇이 하는 역할 및 설명"
                  value={currentBot.description}
                  onChange={(e) => setCurrentBot({ ...currentBot, description: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    outline: 'none',
                    fontSize: '0.9rem',
                    resize: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#3b82f6',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  저장하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test Send Message Modal */}
      {showTestModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '460px',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            padding: '28px',
            color: '#1f2a44',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Play size={18} color="#10b981" /> 텔레그램 연동 테스트 발송
              </h3>
              <button
                onClick={() => setShowTestModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Warning when Chat ID is not set */}
            {!myProfile?.telegramChatId ? (
              <div>
                <p style={{ fontSize: '0.88rem', color: '#ef4444', lineHeight: 1.5, margin: '12px 0 20px 0', fontWeight: 600 }}>
                  경고: 본인 관리자 계정에 등록된 텔레그램 Chat ID가 존재하지 않아 실제 발송 테스트를 진행할 수 없습니다.
                </p>
                <button
                  onClick={() => {
                    setShowTestModal(false);
                    (window as any).reactNavigate('/profile');
                  }}
                  className="btn-primary"
                  style={{ width: '100%', padding: '12px', justifyContent: 'center' }}
                >
                  Chat ID 연동하러 가기
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendTestMessage} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ fontSize: '0.82rem', color: '#6b7a99', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                  현재 접속 중인 계정 <b>{myProfile.name}({myProfile.username})</b>님의 등록된 텔레그램 Chat ID(<b>{myProfile.telegramChatId}</b>)로 테스트 알림이 즉시 전송됩니다.
                </p>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    테스트 메시지 내용
                  </label>
                  <textarea
                    required
                    placeholder="보내고 싶은 테스트 내용을 입력하세요."
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      outline: 'none',
                      fontSize: '0.9rem',
                      resize: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {testStatus.type && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    background: testStatus.type === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    border: `1px solid ${testStatus.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                    color: testStatus.type === 'success' ? '#10b981' : '#ef4444',
                    lineHeight: 1.4
                  }}>
                    {testStatus.message}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowTestModal(false)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: '#f1f5f9',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      color: '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    닫기
                  </button>
                  <button
                    type="submit"
                    disabled={testSending}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: '#10b981',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      color: 'white',
                      cursor: testSending ? 'not-allowed' : 'pointer',
                      opacity: testSending ? 0.7 : 1
                    }}
                  >
                    {testSending ? '발송 중...' : '메시지 발송'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
