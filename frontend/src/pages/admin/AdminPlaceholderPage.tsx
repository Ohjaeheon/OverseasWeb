import React from 'react';
import { useLocation } from 'react-router-dom';
import { Construction, Clock, Database, ArrowLeft } from 'lucide-react';

interface Props {
  title?: string;
  description?: string;
}

export const AdminPlaceholderPage: React.FC<Props> = ({ title, description }) => {
  const location = useLocation();

  const getPageInfo = () => {
    const p = location.pathname;
    if (p.includes('/evangelism')) return { name: '① 전도 및 가개강 등록 관리', code: 'EVANGELISM_MODULE' };
    if (p.includes('/center')) return { name: '② 센터 현황 및 수강 관리', code: 'CENTER_MODULE' };
    if (p.includes('/membership')) return { name: '③ 내무(재적 · 입교 · 신규) 관리', code: 'MEMBERSHIP_MODULE' };
    if (p.includes('/worship/prev-admit')) return { name: '④-1 전월 입교자 출석 집중 관리', code: 'WORSHIP_PREV_ADMIT' };
    if (p.includes('/worship/all-attend')) return { name: '④-2 전성도 출석률 집계 관리', code: 'WORSHIP_ALL_ATTEND' };
    if (p.includes('/worship/absent')) return { name: '④-3 장기/원거리 결석 관리', code: 'WORSHIP_ABSENT' };
    if (p.includes('/worship')) return { name: '④ 예배 및 출석 통합 관리', code: 'WORSHIP_MODULE' };
    if (p.includes('/church-detail')) return { name: '해외교회 상세 정밀 진단 모듈', code: 'CHURCH_DETAIL_INSPECT' };
    return { name: title || '관리자 세부 기능 모듈', code: 'ADMIN_MODULE' };
  };

  const info = getPageInfo();

  return (
    <div style={{ maxWidth: '900px', margin: '30px auto' }}>
      <div style={{
        background: '#ffffff',
        border: '1px solid #e6edf8',
        borderRadius: '20px',
        padding: '40px 32px',
        textAlign: 'center',
        boxShadow: '0 8px 30px rgba(20, 40, 90, 0.05)'
      }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
          color: '#d97706',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          boxShadow: '0 4px 14px rgba(217, 119, 6, 0.2)'
        }}>
          <Construction size={38} />
        </div>

        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1f2a44', margin: '0 0 10px 0' }}>
          🚧 {info.name} (구현 예정)
        </h1>
        <p style={{ color: '#6b7a99', fontSize: '0.95rem', maxWidth: '560px', margin: '0 auto 24px', lineHeight: 1.6 }}>
          {description || `현재 해당 기능(${info.name})은 2차 통합 업데이트 버전에서 제공될 예정입니다. Spring Boot PostgreSQL DB API 스키마 연동 준비 중입니다.`}
        </p>

        {/* Feature Spec Badges */}
        <div style={{
          display: 'inline-flex',
          gap: '12px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          padding: '12px 20px',
          borderRadius: '12px',
          fontSize: '0.85rem',
          color: '#475569',
          fontWeight: 600,
          marginBottom: '30px',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={16} color="#2563eb" /> 상태: <b>구현 예정 (Coming Soon)</b>
          </span>
          <span>·</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Database size={16} color="#059669" /> 모듈 코드: <code>{info.code}</code>
          </span>
        </div>
      </div>
    </div>
  );
};
