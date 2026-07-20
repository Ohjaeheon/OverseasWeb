import React, { useEffect, useState } from 'react';
import { adminService, AdminDashboardData } from '../../services/adminService';
import { Users, Church, FileText, Activity } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<AdminDashboardData | null>(null);

  useEffect(() => {
    adminService.getDashboard().then(setData).catch(console.error);
  }, []);

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1f2a44', marginBottom: '24px' }}>
        📊 관리자 통계 대시보드
      </h2>

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e6edf8', borderRadius: '16px', padding: '24px', borderLeft: '5px solid #2563eb', boxShadow: '0 4px 14px rgba(20,40,90,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#6b7a99', fontSize: '0.85rem', fontWeight: 600 }}>전체 사용자</span>
              <Users size={20} color="#2563eb" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1f2a44' }}>{data.totalUsers}명</div>
            <div style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 700, marginTop: '4px' }}>활성 계정: {data.activeUsers}명</div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e6edf8', borderRadius: '16px', padding: '24px', borderLeft: '5px solid #16a34a', boxShadow: '0 4px 14px rgba(20,40,90,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#6b7a99', fontSize: '0.85rem', fontWeight: 600 }}>등록 해외교회/지역</span>
              <Church size={20} color="#16a34a" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1f2a44' }}>{data.totalChurches}개소</div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e6edf8', borderRadius: '16px', padding: '24px', borderLeft: '5px solid #d97706', boxShadow: '0 4px 14px rgba(20,40,90,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#6b7a99', fontSize: '0.85rem', fontWeight: 600 }}>생성된 진단서 기록</span>
              <FileText size={20} color="#d97706" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1f2a44' }}>{data.totalFaithRecords}건</div>
          </div>
        </div>
      )}

      {/* Recent Audit Log */}
      <div style={{ background: '#ffffff', border: '1px solid #e6edf8', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 14px rgba(20,40,90,0.04)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1f2a44', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} color="#0284c7" /> 최근 시스템 활동 감사 로그 (Audit Log)
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '12px 16px', fontWeight: 700 }}>시간</th>
              <th style={{ padding: '12px 16px', fontWeight: 700 }}>작업자</th>
              <th style={{ padding: '12px 16px', fontWeight: 700 }}>행위 (Action)</th>
              <th style={{ padding: '12px 16px', fontWeight: 700 }}>상세 내용</th>
            </tr>
          </thead>
          <tbody>
            {data?.recentLogs && data.recentLogs.length > 0 ? (
              data.recentLogs.map((log: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>{new Date(log.createdAt).toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1f2a44' }}>{log.username}</td>
                  <td style={{ padding: '12px 16px', color: '#2563eb', fontWeight: 600 }}>{log.action}</td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>{log.details}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#6b7a99' }}>기록된 로그가 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
