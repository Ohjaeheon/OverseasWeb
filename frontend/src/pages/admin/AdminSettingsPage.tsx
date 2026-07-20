import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { Save, Bot } from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const [configs, setConfigs] = useState<any[]>([]);
  const [botToken, setBotToken] = useState('');
  const [botName, setBotName] = useState('');
  const [msg, setMsg] = useState('');

  const loadConfigs = () => {
    adminService.getConfigs().then((data) => {
      setConfigs(data);
      const tokenConfig = data.find((c: any) => c.configKey === 'TELEGRAM_BOT_TOKEN');
      if (tokenConfig) setBotToken(tokenConfig.configValue);
      const nameConfig = data.find((c: any) => c.configKey === 'TELEGRAM_BOT_USERNAME');
      if (nameConfig) setBotName(nameConfig.configValue);
    }).catch(console.error);
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminService.updateConfig('TELEGRAM_BOT_TOKEN', botToken);
      if (botName) await adminService.updateConfig('TELEGRAM_BOT_USERNAME', botName);
      setMsg('텔레그램 봇 API 설정이 성공적으로 저장되었습니다.');
      loadConfigs();
      setTimeout(() => setMsg(''), 2000);
    } catch (e: any) {
      alert(e.message || '저장 실패');
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px' }}>
        ⚙️ 시스템 설정 및 텔레그램 봇 API
      </h2>
      <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '24px' }}>
        2차 인증 OTP 발송용 Telegram Bot API 토큰 및 글로벌 시스템 환경설정
      </p>

      {msg && <div style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399', padding: '10px', borderRadius: '8px', marginBottom: '16px' }}>{msg}</div>}

      <div className="glass-panel" style={{ maxWidth: '600px', padding: '28px', borderRadius: '12px' }}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600, color: 'white', marginBottom: '8px' }}>
              <Bot size={20} color="#06b6d4" /> 텔레그램 봇 토큰 (TELEGRAM_BOT_TOKEN)
            </label>
            <input
              type="text"
              required
              placeholder="예: 7894561230:AAExampleTokenForOverseasPortal"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--navy-border)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '0.9rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'white', marginBottom: '8px' }}>
              텔레그램 봇 Username (TELEGRAM_BOT_USERNAME)
            </label>
            <input
              type="text"
              placeholder="예: OverseasPortal_Bot"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--navy-border)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '0.9rem'
              }}
            />
          </div>

          <button type="submit" className="btn-primary" style={{ padding: '12px', justifyContent: 'center' }}>
            <Save size={18} /> 설정 저장하기
          </button>
        </form>
      </div>
    </div>
  );
};
