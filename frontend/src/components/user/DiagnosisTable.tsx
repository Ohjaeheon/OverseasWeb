import React, { useState } from 'react';
import { DiagnosisRecord } from '../../services/diagnosisService';

interface DiagnosisTableProps {
  records: DiagnosisRecord[];
}

export const DiagnosisTable: React.FC<DiagnosisTableProps> = ({ records }) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'EVANG' | 'CENTER' | 'INTERNAL' | 'WORSHIP' | 'ABSENCE'>('ALL');

  return (
    <div className="glass-panel" style={{ margin: '0 24px 24px', padding: '20px', borderRadius: '12px' }}>
      {/* Tab Filter Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
          📊 해외교회 신앙 프로세스 종합 진단표
        </h3>
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px' }}>
          {[
            { key: 'ALL', label: '전체 보기' },
            { key: 'EVANG', label: '① 전도' },
            { key: 'CENTER', label: '② 센터' },
            { key: 'INTERNAL', label: '③ 교적/내무' },
            { key: 'WORSHIP', label: '④ 주일예배' },
            { key: 'ABSENCE', label: '⑤ 결석' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === tab.key ? 'var(--primary-blue)' : 'transparent',
                color: activeTab === tab.key ? 'white' : '#94a3b8',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Responsive Table Container */}
      <div style={{ overflowX: 'auto' }}>
        <table className="custom-table">
          <thead>
            <tr>
              <th>대륙 / 국가</th>
              <th>지파</th>
              <th>교회명</th>
              <th>구분</th>

              {(activeTab === 'ALL' || activeTab === 'EVANG') && (
                <>
                  <th style={{ color: '#06b6d4' }}>전도재적</th>
                  <th style={{ color: '#06b6d4' }}>동행 월등록</th>
                  <th style={{ color: '#06b6d4' }}>동행 누적</th>
                  <th style={{ color: '#06b6d4' }}>동행 출석</th>
                </>
              )}

              {(activeTab === 'ALL' || activeTab === 'CENTER') && (
                <>
                  <th style={{ color: '#f59e0b' }}>센터 월등록(대면)</th>
                  <th style={{ color: '#f59e0b' }}>센터 월등록(비대면)</th>
                  <th style={{ color: '#f59e0b' }}>센터 월등록계</th>
                  <th style={{ color: '#f59e0b' }}>센터 월종강</th>
                  <th style={{ color: '#f59e0b' }}>센터 총등록자</th>
                </>
              )}

              {(activeTab === 'ALL' || activeTab === 'INTERNAL') && (
                <>
                  <th style={{ color: '#10b981' }}>교회 현재적</th>
                  <th style={{ color: '#10b981' }}>연초 재적</th>
                  <th style={{ color: '#10b981' }}>재적 증가</th>
                  <th style={{ color: '#10b981' }}>당월 입교</th>
                  <th style={{ color: '#10b981' }}>사고(징계/제적)</th>
                </>
              )}

              {(activeTab === 'ALL' || activeTab === 'WORSHIP') && (
                <>
                  <th style={{ color: '#8b5cf6' }}>출결재적</th>
                  <th style={{ color: '#8b5cf6' }}>대면예배</th>
                  <th style={{ color: '#8b5cf6' }}>온라인예배</th>
                  <th style={{ color: '#8b5cf6' }}>출석계</th>
                </>
              )}

              {(activeTab === 'ALL' || activeTab === 'ABSENCE') && (
                <>
                  <th style={{ color: '#ef4444' }}>일회성 결석</th>
                  <th style={{ color: '#ef4444' }}>장기결석(관리가능)</th>
                  <th style={{ color: '#ef4444' }}>장기결석(관리불가)</th>
                  <th style={{ color: '#ef4444' }}>결석계</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={20} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  조회된 진단서 데이터가 없습니다.
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.recordId}>
                  <td><span className="badge badge-blue">{r.continent}</span> {r.country}</td>
                  <td>{r.jipa}</td>
                  <td style={{ fontWeight: 700, color: 'white' }}>{r.name}</td>
                  <td><span className="badge badge-green">{r.gubun}</span></td>

                  {(activeTab === 'ALL' || activeTab === 'EVANG') && (
                    <>
                      <td>{r.evangReg ?? 0}</td>
                      <td>{r.bibleMonthReg ?? 0}</td>
                      <td>{r.bibleCumReg ?? 0}</td>
                      <td>{r.bibleCurAtt ?? 0}</td>
                    </>
                  )}

                  {(activeTab === 'ALL' || activeTab === 'CENTER') && (
                    <>
                      <td>{r.centerMonthOn ?? 0}</td>
                      <td>{r.centerMonthOff ?? 0}</td>
                      <td style={{ fontWeight: 700, color: '#f59e0b' }}>{r.centerMonthTotal ?? 0}</td>
                      <td>{r.centerMonthGrad ?? 0}</td>
                      <td>{r.centerTotMonthReg ?? 0}</td>
                    </>
                  )}

                  {(activeTab === 'ALL' || activeTab === 'INTERNAL') && (
                    <>
                      <td style={{ fontWeight: 700, color: '#10b981' }}>{r.registered ?? 0}</td>
                      <td>{r.yearStartReg ?? 0}</td>
                      <td>{r.regChange ?? 0}</td>
                      <td>{r.newAdmit ?? 0}</td>
                      <td style={{ color: '#ef4444' }}>{r.discipline ?? 0}</td>
                    </>
                  )}

                  {(activeTab === 'ALL' || activeTab === 'WORSHIP') && (
                    <>
                      <td>{r.attReg ?? 0}</td>
                      <td>{r.attOnsite ?? 0}</td>
                      <td>{r.attOnline ?? 0}</td>
                      <td style={{ fontWeight: 700, color: '#8b5cf6' }}>{r.attTotal ?? 0}</td>
                    </>
                  )}

                  {(activeTab === 'ALL' || activeTab === 'ABSENCE') && (
                    <>
                      <td>{r.absOnce ?? 0}</td>
                      <td>{r.absLongManage ?? 0}</td>
                      <td>{r.absLongUnmanage ?? 0}</td>
                      <td style={{ fontWeight: 700, color: '#ef4444' }}>{r.absTotal ?? 0}</td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
