import React from 'react';
import { SummaryMetric } from '../../services/diagnosisService';
import { Users, UserPlus, GraduationCap, Church, AlertCircle, TrendingUp } from 'lucide-react';

interface DiagnosisDashboardProps {
  summary: SummaryMetric | null;
}

export const DiagnosisDashboard: React.FC<DiagnosisDashboardProps> = ({ summary }) => {
  if (!summary) return null;

  const cards = [
    {
      title: '총 해외교회 수',
      value: summary.totalChurches.toLocaleString(),
      subText: '등록 지교회 및 개척교회',
      icon: <Church size={24} color="#3b82f6" />,
      borderColor: '#3b82f6'
    },
    {
      title: '전성도 재적 수',
      value: summary.totalRegistered.toLocaleString(),
      subText: '교적상 현재적 총합',
      icon: <Users size={24} color="#10b981" />,
      borderColor: '#10b981'
    },
    {
      title: '전도재적 수',
      value: summary.totalEvangReg.toLocaleString(),
      subText: '전도 활동 대상자',
      icon: <UserPlus size={24} color="#06b6d4" />,
      borderColor: '#06b6d4'
    },
    {
      title: '선교센터 월등록',
      value: summary.totalCenterMonthReg.toLocaleString(),
      subText: '대면 / 비대면 신규 등록',
      icon: <GraduationCap size={24} color="#f59e0b" />,
      borderColor: '#f59e0b'
    },
    {
      title: '주일예배 출석 수',
      value: summary.totalAttTotal.toLocaleString(),
      subText: '대면 + 온라인 출석 총계',
      icon: <TrendingUp size={24} color="#8b5cf6" />,
      borderColor: '#8b5cf6'
    },
    {
      title: '예배 결석 수',
      value: summary.totalAbsTotal.toLocaleString(),
      subText: '일회성 + 장기 결석',
      icon: <AlertCircle size={24} color="#ef4444" />,
      borderColor: '#ef4444'
    }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '16px',
      margin: '0 24px 20px'
    }}>
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="glass-panel"
          style={{
            padding: '20px',
            borderLeft: `4px solid ${card.borderColor}`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>{card.title}</span>
            {card.icon}
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'white', marginBottom: '4px' }}>
              {card.value}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {card.subText}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
