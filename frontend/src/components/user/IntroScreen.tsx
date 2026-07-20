import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

interface IntroScreenProps {
  onEnter: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onEnter }) => {
  const { i18n } = useTranslation();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleEnter = () => {
    // 인트로 접속 암호 확인 (기본 패스워드 미입력 혹은 유효성 체크)
    if (password === '1234' || password === '' || password === 'admin') {
      onEnter();
    } else {
      setErrorMsg('암호가 올바르지 않습니다. (기본암호 없이 들어가기 가능)');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      {/* Language Selector */}
      <div style={{ position: 'absolute', top: '24px', right: '24px' }}>
        <select
          value={i18n.language}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px',
            padding: '8px 12px',
            cursor: 'pointer'
          }}
        >
          <option value="ko" style={{ color: 'black' }}>한국어</option>
          <option value="en" style={{ color: 'black' }}>English</option>
        </select>
      </div>

      <div className="glass-panel" style={{
        maxWidth: '520px',
        width: '100%',
        padding: '40px',
        textAlign: 'center',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
      }}>
        <div style={{
          width: '70px',
          height: '70px',
          margin: '0 auto 20px',
          background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 25px rgba(59, 130, 246, 0.5)'
        }}>
          <Globe size={36} color="white" />
        </div>

        <div style={{ color: '#06b6d4', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '2px', marginBottom: '8px' }}>
          GLOBAL MISSION DASHBOARD
        </div>

        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '16px', lineHeight: 1.3 }}>
          해외선교부 <span style={{ color: '#3b82f6' }}>업무포탈</span>
        </h1>

        <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '28px' }}>
          전 세계 해외교회의 걸음을 한자리에서 봅니다.<br />
          양(量)에 속지 않고 <b>질(質)</b>을 보며, 확인을 넘어 <b>행함</b>으로.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
              <Lock size={18} />
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="접속 암호를 입력하세요 (미입력 가능)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEnter()}
              style={{
                width: '100%',
                padding: '12px 40px 12px 42px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--navy-border)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '0.95rem',
                outline: 'none'
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer'
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button
            onClick={handleEnter}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '1rem' }}
          >
            들어가기 <ArrowRight size={20} />
          </button>

          {errorMsg && (
            <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '4px' }}>
              {errorMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
