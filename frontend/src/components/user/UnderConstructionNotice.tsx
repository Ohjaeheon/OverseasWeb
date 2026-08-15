import React from 'react';
import { Construction, Clock } from 'lucide-react';

interface Props {
  title: string;
  description?: string;
}

/** 사용자 포탈용 경량 "공사중" 안내 (관리자 포탈의 AdminPlaceholderPage와 동일한 용도, 다크 테마) */
export const UnderConstructionNotice: React.FC<Props> = ({ title, description }) => {
  return (
    <div style={{ maxWidth: '700px', margin: '40px auto', padding: '0 16px' }}>
      <div style={{
        background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.4)', borderRadius: '20px',
        padding: '40px 32px', textAlign: 'center', backdropFilter: 'blur(8px)'
      }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '18px',
          background: 'rgba(245,158,11,0.15)', color: '#fbbf24',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px'
        }}>
          <Construction size={32} />
        </div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f1f5f9', margin: '0 0 10px' }}>
          🚧 {title} (준비 중)
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 20px', lineHeight: 1.6 }}>
          {description || '표와 그래프를 활용한 통계 대시보드가 추후 제공될 예정입니다.'}
        </p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(51,65,85,0.5)', padding: '8px 16px', borderRadius: '10px', fontSize: '0.82rem', color: '#818cf8', fontWeight: 600 }}>
          <Clock size={14} /> 상태: 구현 예정
        </div>
      </div>
    </div>
  );
};
