import React, { useCallback, useEffect, useState } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import { homeDashboardManualService, ManualMetricRow } from '../../services/homeDashboardManualService';

const inputStyle: React.CSSProperties = {
  width: '90px', padding: '6px 8px', border: '1px solid #dbe2ef', borderRadius: '6px',
  color: '#1f2a44', fontSize: '0.85rem', textAlign: 'right',
};

export const AdminOverseasBoardManualPage: React.FC = () => {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [rows, setRows] = useState<ManualMetricRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await homeDashboardManualService.getAll(year, month);
      setRows(data);
    } catch (e) {
      console.error('수기입력 지표 조회 실패', e);
      alert('데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const updateRow = (churchId: number, patch: Partial<ManualMetricRow>) => {
    setRows((prev) => prev.map((r) => (r.churchId === churchId ? { ...r, ...patch } : r)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await homeDashboardManualService.bulkSave(rows);
      alert('저장되었습니다.');
      await load();
    } catch (e) {
      console.error('저장 실패', e);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const numOrNull = (v: string): number | null => (v.trim() === '' ? null : Number(v));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1f2a44', margin: 0 }}>
            📥 해외선교부 현황판 - 등록/종강 수기입력
          </h1>
          <p style={{ color: '#6b7a99', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
            등록, 가개강대비등록률, 종강수, 등록대비종강률, 수강생현황(가개강/초등/중등/고등)은 아직 자동 연동 전이라 관리자가 월별로 직접 입력합니다.
            홈 화면 "해외선교부 현황판"에 즉시 반영됩니다.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))}
            style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #dbe2ef' }}>
            {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
          <select value={month} onChange={(e) => setMonth(parseInt(e.target.value, 10))}
            style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #dbe2ef' }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{m}월</option>
            ))}
          </select>
          <button onClick={load} disabled={loading} style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px',
            background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
          }}>
            <RefreshCw size={14} /> 새로고침
          </button>
          <button onClick={handleSave} disabled={saving || loading} style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: '0.85rem', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
          }}>
            <Save size={14} /> {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e6edf8', overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>불러오는 중...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontWeight: 700 }} rowSpan={2}>교회(지역)</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }} rowSpan={2}>등록</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }} rowSpan={2}>가개강대비등록률(%)</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }} rowSpan={2}>종강수</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }} rowSpan={2}>등록대비종강률(%)</th>
                <th style={{ padding: '8px 16px', fontWeight: 700, textAlign: 'center', borderBottom: '1px solid #e6edf8' }} colSpan={4}>수강생현황</th>
              </tr>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e6edf8', textAlign: 'right' }}>
                <th style={{ padding: '8px 16px', fontWeight: 700 }}>가개강</th>
                <th style={{ padding: '8px 16px', fontWeight: 700 }}>초등</th>
                <th style={{ padding: '8px 16px', fontWeight: 700 }}>중등</th>
                <th style={{ padding: '8px 16px', fontWeight: 700 }}>고등</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.churchId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 700, color: '#1f2a44' }}>
                    {r.jipa} · {r.churchName}
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>{r.country}</div>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <input type="number" style={inputStyle} value={r.registrationCount ?? ''}
                      onChange={(e) => updateRow(r.churchId, { registrationCount: numOrNull(e.target.value) })} />
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <input type="number" step="0.1" style={inputStyle} value={r.registrationRate ?? ''}
                      onChange={(e) => updateRow(r.churchId, { registrationRate: numOrNull(e.target.value) })} />
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <input type="number" style={inputStyle} value={r.graduationCount ?? ''}
                      onChange={(e) => updateRow(r.churchId, { graduationCount: numOrNull(e.target.value) })} />
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <input type="number" step="0.1" style={inputStyle} value={r.graduationRate ?? ''}
                      onChange={(e) => updateRow(r.churchId, { graduationRate: numOrNull(e.target.value) })} />
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <input type="number" style={inputStyle} value={r.studentPreOpen ?? ''}
                      onChange={(e) => updateRow(r.churchId, { studentPreOpen: numOrNull(e.target.value) })} />
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <input type="number" style={inputStyle} value={r.studentElementary ?? ''}
                      onChange={(e) => updateRow(r.churchId, { studentElementary: numOrNull(e.target.value) })} />
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <input type="number" style={inputStyle} value={r.studentMiddle ?? ''}
                      onChange={(e) => updateRow(r.churchId, { studentMiddle: numOrNull(e.target.value) })} />
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <input type="number" style={inputStyle} value={r.studentHigh ?? ''}
                      onChange={(e) => updateRow(r.churchId, { studentHigh: numOrNull(e.target.value) })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
