/**
 * P1ChartDashboard – /OverseasPortal/evangelism 메인 대시보드 및 ProcessCategoryPage(센터/예배)에서
 * 직접 <P1ChartDashboard /> 로 렌더링되는 커스텀 그래프 컴포넌트
 */
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const CHURCH_COLOR_PALETTE = [
  '#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c',
  '#0891b2', '#d97706', '#db2777', '#65a30d', '#7c3aed'
];

const DATA_KEY_LABELS: Record<string, string> = {
  reg: '전도재적', find: '찾기', findDrop: '찾기탈락',
  gospel: '복음방', gospelDrop: '복음방탈락',
  admit: '개강', admitDrop: '개강탈락'
};

const DEPARTMENTS_ALL = ['교역자', '자문회', '장년회', '부녀회', '청년회'];

interface ChartConfig {
  id: string;
  title: string;
  chartType: 'bar' | 'line' | 'pie' | 'radar';
  churches: string[];
  churchColors: Record<string, string>;
  dataKeys: string[];
  weekRange: 'current' | 'month' | 'all';
}

interface ChurchInfo { id: number | string; name: string; }

function getUsername(): string {
  try { return JSON.parse(localStorage.getItem('user') || '{}').username || 'guest'; }
  catch { return 'guest'; }
}

async function fetchChartConfigsFromDb(): Promise<ChartConfig[]> {
  try {
    const res = await api.get<any>(`/evangelism/chart-config?username=${encodeURIComponent(getUsername())}`);
    return Array.isArray(res.data) ? res.data as ChartConfig[] : [];
  } catch { return []; }
}

async function saveChartConfigsToDb(configs: ChartConfig[]): Promise<void> {
  try {
    await api.post(`/evangelism/chart-config?username=${encodeURIComponent(getUsername())}`, configs);
  } catch (e) { console.error('Failed to save chart configs', e); }
}

// ============================================================
// 메인 컴포넌트
// ============================================================
export function P1ChartDashboard() {
  const [chartConfigs, setChartConfigs] = useState<ChartConfig[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChart, setEditingChart] = useState<ChartConfig | null>(null);
  const [availableChurches, setAvailableChurches] = useState<ChurchInfo[]>([]);
  const [churchRecords, setChurchRecords] = useState<Record<string, Record<string, Record<string, Record<string, number>>>>>({});

  const selectedYear = (() => {
    try { return (window as any).ST?.year || `${new Date().getFullYear()}년`; } catch { return `${new Date().getFullYear()}년`; }
  })();

  const [mTitle, setMTitle] = useState('');
  const [mChartType, setMChartType] = useState<'bar' | 'line' | 'pie' | 'radar'>('bar');
  const [mChurches, setMChurches] = useState<string[]>([]);
  const [mChurchColors, setMChurchColors] = useState<Record<string, string>>({});
  const [mDataKeys, setMDataKeys] = useState<string[]>(['find']);
  const [mWeekRange, setMWeekRange] = useState<'current' | 'month' | 'all'>('all');

  useEffect(() => {
    fetchChartConfigsFromDb().then(setChartConfigs);
    const tryGetChurches = () => {
      const data = (window as any).DATA;
      if (data && Array.isArray(data.records) && data.records.length > 0) {
        const names = Array.from(new Set<string>(data.records.map((r: any) => r.name as string)));
        setAvailableChurches(names.map((n, i) => ({ id: i, name: n })));
      } else {
        api.get<any[]>('/admin/churches').then(res => {
          if (Array.isArray(res.data)) {
            setAvailableChurches(res.data.map((c: any) => ({ id: c.churchId || c.id, name: c.name || c.churchName })));
          }
        }).catch(() => {});
      }
    };
    setTimeout(tryGetChurches, 800);
  }, []);

  const fetchChurchRecords = useCallback(async (churches: string[]) => {
    const missing = churches.filter(c => !churchRecords[c]);
    if (missing.length === 0) return;
    try {
      const results = await Promise.all(
        missing.map(church =>
          api.get<any[]>(`/evangelism/records?church=${encodeURIComponent(church)}&year=${selectedYear}`)
            .then(res => ({ church, data: res.data }))
            .catch(() => ({ church, data: [] }))
        )
      );
      setChurchRecords(prev => {
        const updated = { ...prev };
        results.forEach(({ church, data }) => {
          const map: Record<string, Record<string, Record<string, number>>> = {};
          (data || []).forEach((r: any) => {
            if (!map[r.weekKey]) map[r.weekKey] = {};
            let dyn: Record<string, number> = {};
            try { if (r.dynamicData) dyn = JSON.parse(r.dynamicData); } catch {}
            map[r.weekKey][r.department] = {
              reg: r.regCount || 0,
              find: dyn.find ?? (r.findCount || 0),
              findDrop: dyn.findDrop ?? (r.findDropCount || 0),
              gospel: dyn.gospel ?? (r.gospelCount || 0),
              gospelDrop: dyn.gospelDrop ?? (r.gospelDropCount || 0),
              admit: dyn.admit ?? (r.admitCount || 0),
              admitDrop: dyn.admitDrop ?? (r.admitDropCount || 0),
              ...dyn
            };
          });
          updated[church] = map;
        });
        return updated;
      });
    } catch {}
  }, [selectedYear, churchRecords]);

  const openAdd = () => {
    setEditingChart(null); setMTitle('새 그래프'); setMChartType('bar');
    setMChurches([]); setMChurchColors({}); setMDataKeys(['find']); setMWeekRange('all');
    setIsModalOpen(true);
  };

  const openEdit = (chart: ChartConfig) => {
    setEditingChart(chart); setMTitle(chart.title); setMChartType(chart.chartType);
    setMChurches([...chart.churches]); setMChurchColors({ ...chart.churchColors });
    setMDataKeys([...chart.dataKeys]); setMWeekRange(chart.weekRange);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('이 그래프를 삭제하시겠습니까?')) return;
    const updated = chartConfigs.filter(c => c.id !== id);
    setChartConfigs(updated); saveChartConfigsToDb(updated);
  };

  const handleSave = () => {
    if (!mTitle.trim()) { alert('제목을 입력해 주세요.'); return; }
    if (mChurches.length === 0) { alert('교회를 1개 이상 선택해 주세요.'); return; }
    if (mDataKeys.length === 0) { alert('데이터 항목을 1개 이상 선택해 주세요.'); return; }
    const newChart: ChartConfig = {
      id: editingChart ? editingChart.id : `chart_${Date.now()}`,
      title: mTitle.trim(), chartType: mChartType,
      churches: mChurches, churchColors: { ...mChurchColors },
      dataKeys: mDataKeys, weekRange: mWeekRange,
    };
    const updated = editingChart
      ? chartConfigs.map(c => c.id === editingChart.id ? newChart : c)
      : [...chartConfigs, newChart];
    setChartConfigs(updated); saveChartConfigsToDb(updated); setIsModalOpen(false);
  };

  const getAllWeeks = (): string[] => {
    try {
      const data = (window as any).DATA;
      if (data && Array.isArray(data.weeklyRecords)) {
        return Array.from(new Set<string>(data.weeklyRecords.map((r: any) => r.weekKey as string))).sort();
      }
    } catch {}
    return [];
  };

  const getWeeksForChart = (chart: ChartConfig): string[] => {
    const all = getAllWeeks();
    if (chart.weekRange === 'current') return all.slice(-1);
    if (chart.weekRange === 'month') { const m = new Date().getMonth() + 1; return all.filter(w => w.startsWith(`${m}월`)); }
    return all;
  };

  const getChurchWeekTotal = (records: Record<string, Record<string, Record<string, number>>>, weekKey: string, dataKey: string): number =>
    DEPARTMENTS_ALL.reduce((sum, dept) => sum + ((records[weekKey]?.[dept]?.[dataKey]) || 0), 0);

  return (
    <div style={{ marginTop: '16px', padding: '0 0 40px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '18px' }}>📊</span>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0f172a' }}>커스텀 그래프 대시보드</div>
            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>최대 6개 · 사용자별 DB 커스텀 저장</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {isEditMode && chartConfigs.length < 6 && (
            <button onClick={openAdd} style={{ padding: '9px 18px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', fontWeight: 800, fontSize: '0.92rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}>
              + 그래프 추가
            </button>
          )}
          <button onClick={() => setIsEditMode(p => !p)} style={{ padding: '9px 18px', borderRadius: '10px', border: isEditMode ? 'none' : '1.5px solid #cbd5e1', background: isEditMode ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#fff', color: isEditMode ? '#fff' : '#475569', fontWeight: 800, fontSize: '0.92rem', cursor: 'pointer', boxShadow: isEditMode ? '0 4px 14px rgba(245,158,11,0.3)' : 'none' }}>
            ✏️ {isEditMode ? '편집 완료' : '수정 모드'}
          </button>
        </div>
      </div>

      {chartConfigs.length === 0 ? (
        <div style={{ background: '#fff', border: '2px dashed #cbd5e1', borderRadius: '20px', padding: '50px 24px', textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '2.4rem', marginBottom: '10px' }}>📊</div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#334155', marginBottom: '6px' }}>등록된 커스텀 그래프가 없습니다</div>
          <div style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '18px' }}>아래 버튼을 눌러 교회의 전도재적, 찾기, 복음방, 개강 데이터를 시각화해보세요.</div>
          <button onClick={() => { setIsEditMode(true); openAdd(); }} style={{ padding: '11px 24px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 16px rgba(37,99,235,0.3)' }}>
            + 첫 그래프 추가하기
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(560px, 1fr))', gap: '24px' }}>
          {chartConfigs.map(chart => (
            <ChartCard
              key={chart.id} chart={chart} isEditMode={isEditMode}
              churchRecords={churchRecords} getWeeks={() => getWeeksForChart(chart)}
              getTotal={getChurchWeekTotal} onFetch={fetchChurchRecords}
              onEdit={() => openEdit(chart)} onDelete={() => handleDelete(chart.id)}
            />
          ))}
        </div>
      )}


      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '16px' }} onClick={() => setIsModalOpen(false)}>
          <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', padding: '28px', boxShadow: '0 24px 64px rgba(0,0,0,0.35)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>{editingChart ? '✏️ 그래프 수정' : '➕ 새 그래프 추가'}</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#94a3b8' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>📝 그래프 제목</label>
                <input type="text" value={mTitle} onChange={e => setMTitle(e.target.value)} placeholder="예: 맛디아 vs 도쿄 복음방 비교" style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>📊 그래프 종류</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(['bar', 'line', 'pie', 'radar'] as const).map(t => (
                    <button key={t} onClick={() => setMChartType(t)} style={{ padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', border: mChartType === t ? 'none' : '1.5px solid #e2e8f0', background: mChartType === t ? 'linear-gradient(135deg, #2563eb, #7c3aed)' : '#f8fafc', color: mChartType === t ? '#fff' : '#475569', fontWeight: 800, fontSize: '0.9rem' }}>
                      {{ bar: '▊ 막대', line: '📈 꺾은선', pie: '🥧 원형', radar: '🕸️ 레이더' }[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>🏛️ 교회 선택 <span style={{ fontWeight: 500, color: '#64748b' }}>(다중 선택 · 교회별 색상 지정)</span></label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '6px', maxHeight: '200px', overflowY: 'auto', padding: '4px' }}>
                  {availableChurches.map((c, i) => {
                    const isSel = mChurches.includes(c.name);
                    const color = mChurchColors[c.name] || CHURCH_COLOR_PALETTE[i % CHURCH_COLOR_PALETTE.length];
                    return (
                      <div key={c.id} onClick={() => {
                        if (isSel) { setMChurches(prev => prev.filter(x => x !== c.name)); }
                        else { setMChurches(prev => [...prev, c.name]); setMChurchColors(prev => ({ ...prev, [c.name]: CHURCH_COLOR_PALETTE[mChurches.length % CHURCH_COLOR_PALETTE.length] })); }
                      }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', border: isSel ? `2px solid ${color}` : '1.5px solid #e2e8f0', background: isSel ? `${color}15` : '#f8fafc', transition: 'all 0.12s' }}>
                        <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: isSel ? color : '#cbd5e1', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.82rem', fontWeight: isSel ? 700 : 500, color: isSel ? '#0f172a' : '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{c.name}</span>
                        {isSel && <input type="color" value={color} onClick={e => e.stopPropagation()} onChange={e => setMChurchColors(prev => ({ ...prev, [c.name]: e.target.value }))} style={{ width: '22px', height: '22px', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }} />}
                      </div>
                    );
                  })}
                </div>
                {availableChurches.length === 0 && <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '6px 0 0' }}>교회 목록 로딩 중…</p>}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>📋 데이터 항목 <span style={{ fontWeight: 500, color: '#64748b' }}>(다중 선택)</span></label>
                <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                  {Object.entries(DATA_KEY_LABELS).map(([key, label]) => {
                    const checked = mDataKeys.includes(key);
                    return <button key={key} onClick={() => setMDataKeys(prev => checked ? prev.filter(k => k !== key) : [...prev, key])} style={{ padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', border: checked ? '2px solid #2563eb' : '1.5px solid #e2e8f0', background: checked ? '#eff6ff' : '#f8fafc', color: checked ? '#2563eb' : '#64748b', fontWeight: checked ? 800 : 500, fontSize: '0.85rem' }}>{label}</button>;
                  })}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>📅 표시 기간</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {([['current', '현재 주차'], ['month', '이번 달'], ['all', '전체 기간']] as const).map(([v, l]) => (
                    <button key={v} onClick={() => setMWeekRange(v)} style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', border: mWeekRange === v ? 'none' : '1.5px solid #e2e8f0', background: mWeekRange === v ? '#0f172a' : '#f8fafc', color: mWeekRange === v ? '#fff' : '#475569', fontWeight: 700, fontSize: '0.88rem' }}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '26px' }}>
              <button onClick={() => setIsModalOpen(false)} style={{ padding: '10px 20px', borderRadius: '10px', border: '1.5px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>취소</button>
              <button onClick={handleSave} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}>{editingChart ? '수정 완료' : '추가'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ChartCard
// ============================================================
interface ChartCardProps {
  chart: ChartConfig; isEditMode: boolean;
  churchRecords: Record<string, Record<string, Record<string, Record<string, number>>>>;
  getWeeks: () => string[];
  getTotal: (records: Record<string, Record<string, Record<string, number>>>, weekKey: string, dataKey: string) => number;
  onFetch: (churches: string[]) => void;
  onEdit: () => void; onDelete: () => void;
}

function ChartCard({ chart, isEditMode, churchRecords, getWeeks, getTotal, onFetch, onEdit, onDelete }: ChartCardProps) {
  useEffect(() => {
    const missing = chart.churches.filter(c => !churchRecords[c]);
    if (missing.length > 0) onFetch(missing);
  }, [chart.churches, churchRecords]);

  const weeks = getWeeks();
  const getTotalForChurch = (church: string, weekKey: string, dataKey: string) => getTotal(churchRecords[church] || {}, weekKey, dataKey);
  const typeLabels: Record<string, string> = { bar: '막대', line: '꺾은선', pie: '원형', radar: '레이더' };
  const weekLabel = { current: '현재주차', month: '이번달', all: '전체기간' }[chart.weekRange];

  return (
    <div className="card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: 0, overflow: 'hidden', boxShadow: '0 4px 18px rgba(0,0,0,0.05)', position: 'relative' }}>
      {isEditMode && (
        <div style={{ position: 'absolute', top: '14px', right: '14px', display: 'flex', gap: '6px', zIndex: 10 }}>
          <button onClick={onEdit} style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: '14px', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}>✏️</button>
          <button onClick={onDelete} style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '14px', boxShadow: '0 2px 8px rgba(239,68,68,0.3)' }}>🗑</button>
        </div>
      )}
      <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #f1f5f9' }}>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '1.08rem', fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chart.title}</h3>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', padding: '3px 9px', borderRadius: '6px', background: '#eff6ff', color: '#2563eb', fontWeight: 800 }}>{typeLabels[chart.chartType]}</span>
          <span style={{ fontSize: '0.78rem', padding: '3px 9px', borderRadius: '6px', background: '#f0fdf4', color: '#16a34a', fontWeight: 800 }}>{weekLabel}</span>
          {chart.dataKeys.map(k => <span key={k} style={{ fontSize: '0.78rem', padding: '3px 9px', borderRadius: '6px', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', fontWeight: 700 }}>{DATA_KEY_LABELS[k] || k}</span>)}
        </div>
      </div>
      <div style={{ padding: '10px 22px', display: 'flex', gap: '14px', flexWrap: 'wrap', borderBottom: '1px solid #f8fafc' }}>
        {chart.churches.map(ch => (
          <div key={ch} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: chart.churchColors[ch] || '#2563eb' }} />
            <span style={{ fontSize: '0.84rem', color: '#334155', fontWeight: 700 }}>{ch}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: '18px 22px 22px' }}>
        {chart.chartType === 'bar' && <BarSVG chart={chart} weeks={weeks} getTotal={getTotalForChurch} />}
        {chart.chartType === 'line' && <LineSVG chart={chart} weeks={weeks} getTotal={getTotalForChurch} />}
        {chart.chartType === 'pie' && <PieSVG chart={chart} weeks={weeks} getTotal={getTotalForChurch} />}
        {chart.chartType === 'radar' && <RadarSVG chart={chart} weeks={weeks} getTotal={getTotalForChurch} />}
      </div>
    </div>
  );
}

// ============================================================
// SVG 차트들 (2열 레이아웃 대형 사이즈 W=600, H=280)
// ============================================================
const W = 600, H = 280, PL = 54, PR = 16, PT = 14, PB = 52;
const PW = W - PL - PR, PH = H - PT - PB;

function BarSVG({ chart, weeks, getTotal }: { chart: ChartConfig; weeks: string[]; getTotal: (c: string, w: string, k: string) => number }) {
  const dw = weeks.slice(-12);
  const vals = chart.churches.flatMap(ch => chart.dataKeys.flatMap(k => dw.map(w => getTotal(ch, w, k))));
  const mx = Math.max(...vals, 1);
  const bpg = chart.churches.length * chart.dataKeys.length;
  const gw = PW / Math.max(dw.length, 1);
  const bw = Math.max(4, (gw - 8) / Math.max(bpg, 1));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(r => Math.round(r * mx));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {ticks.map((v, i) => { const y = PT + PH - (v / mx) * PH; return <g key={i}><line x1={PL} y1={y} x2={PL + PW} y2={y} stroke="#f1f5f9" strokeWidth="1.2" /><text x={PL - 8} y={y + 4} textAnchor="end" fontSize="12" fill="#64748b" fontWeight="600">{v}</text></g>; })}
      <line x1={PL} y1={PT} x2={PL} y2={PT + PH} stroke="#cbd5e1" strokeWidth="1.5" />
      <line x1={PL} y1={PT + PH} x2={PL + PW} y2={PT + PH} stroke="#cbd5e1" strokeWidth="1.5" />
      {dw.map((week, wi) => {
        const gx = PL + wi * gw; let bi = 0;
        return chart.churches.flatMap(ch => chart.dataKeys.map(k => {
          const val = getTotal(ch, week, k); const bh = (val / mx) * PH; const x = gx + 4 + bi * bw; bi++;
          const color = chart.churchColors[ch] || '#2563eb'; const op = chart.dataKeys.length > 1 ? (chart.dataKeys.indexOf(k) === 0 ? 1 : 0.65) : 1;
          return <rect key={`${ch}-${k}-${wi}`} x={x} y={PT + PH - bh} width={bw - 1} height={bh} fill={color} fillOpacity={op} rx="4"><title>{ch} · {DATA_KEY_LABELS[k]}: {val}</title></rect>;
        }));
      })}
      {dw.map((week, wi) => <text key={wi} x={PL + wi * gw + gw / 2} y={PT + PH + 20} textAnchor="middle" fontSize="11.5" fill="#475569" fontWeight="700" transform={dw.length > 6 ? `rotate(-30,${PL + wi * gw + gw / 2},${PT + PH + 20})` : undefined}>{week.replace('주차', '주')}</text>)}
    </svg>
  );
}

function LineSVG({ chart, weeks, getTotal }: { chart: ChartConfig; weeks: string[]; getTotal: (c: string, w: string, k: string) => number }) {
  const dw = weeks.slice(-14);
  const vals = chart.churches.flatMap(ch => chart.dataKeys.flatMap(k => dw.map(w => getTotal(ch, w, k))));
  const mx = Math.max(...vals, 1);
  const xOf = (i: number) => PL + (i / Math.max(dw.length - 1, 1)) * PW;
  const yOf = (v: number) => PT + PH - (v / mx) * PH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(r => Math.round(r * mx));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {ticks.map((v, i) => { const y = yOf(v); return <g key={i}><line x1={PL} y1={y} x2={PL + PW} y2={y} stroke="#f1f5f9" strokeWidth="1.2" /><text x={PL - 8} y={y + 4} textAnchor="end" fontSize="12" fill="#64748b" fontWeight="600">{v}</text></g>; })}
      <line x1={PL} y1={PT} x2={PL} y2={PT + PH} stroke="#cbd5e1" strokeWidth="1.5" />
      <line x1={PL} y1={PT + PH} x2={PL + PW} y2={PT + PH} stroke="#cbd5e1" strokeWidth="1.5" />
      {chart.churches.flatMap(ch => chart.dataKeys.map((k, ki) => {
        const color = chart.churchColors[ch] || '#2563eb';
        const pts = dw.map((w, i) => `${xOf(i)},${yOf(getTotal(ch, w, k))}`).join(' ');
        return <g key={`${ch}-${k}`}>
          <polyline points={pts} fill="none" stroke={color} strokeWidth="3" strokeDasharray={ki > 0 ? '6 4' : undefined} strokeLinecap="round" strokeLinejoin="round" />
          {dw.map((w, i) => <circle key={i} cx={xOf(i)} cy={yOf(getTotal(ch, w, k))} r="5.5" fill={color} stroke="#fff" strokeWidth="2.5"><title>{ch} · {DATA_KEY_LABELS[k]} [{w}]: {getTotal(ch, w, k)}</title></circle>)}
        </g>;
      }))}
      {dw.map((week, i) => <text key={i} x={xOf(i)} y={PT + PH + 20} textAnchor="middle" fontSize="11.5" fill="#475569" fontWeight="700" transform={dw.length > 6 ? `rotate(-30,${xOf(i)},${PT + PH + 20})` : undefined}>{week.replace('주차', '주')}</text>)}
    </svg>
  );
}

function PieSVG({ chart, weeks, getTotal }: { chart: ChartConfig; weeks: string[]; getTotal: (c: string, w: string, k: string) => number }) {
  const cx = 140, cy = 140, r = 115, SW = 600, SH = 280;
  const slices = chart.churches.flatMap(ch => chart.dataKeys.map(k => ({ label: `${ch} · ${DATA_KEY_LABELS[k] || k}`, value: weeks.reduce((s, w) => s + getTotal(ch, w, k), 0), color: chart.churchColors[ch] || '#2563eb' })));
  const total = slices.reduce((s, d) => s + d.value, 0) || 1;
  let ang = -Math.PI / 2;
  const paths = slices.map(s => {
    const a = (s.value / total) * 2 * Math.PI, e = ang + a;
    const x1 = cx + r * Math.cos(ang), y1 = cy + r * Math.sin(ang);
    const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e);
    const d = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${a > Math.PI ? 1 : 0},1 ${x2},${y2} Z`;
    const pct = ((s.value / total) * 100).toFixed(1); ang = e;
    return { ...s, d, pct };
  });
  return (
    <svg viewBox={`0 0 ${SW} ${SH}`} style={{ width: '100%', height: 'auto' }}>
      {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} stroke="#fff" strokeWidth="2.5"><title>{p.label}: {p.value} ({p.pct}%)</title></path>)}
      {slices.map((s, i) => <g key={i} transform={`translate(290, ${24 + i * 28})`}><rect x="0" y="0" width="15" height="15" fill={s.color} rx="3" /><text x="24" y="13" fontSize="13.5" fill="#334155" fontWeight="700">{s.label.length > 20 ? s.label.slice(0, 20) + '…' : s.label} ({s.value})</text></g>)}
    </svg>
  );
}

function RadarSVG({ chart, weeks, getTotal }: { chart: ChartConfig; weeks: string[]; getTotal: (c: string, w: string, k: string) => number }) {
  const cx = 160, cy = 140, r = 110, SW = 600, SH = 280;
  const axes = chart.dataKeys;
  if (axes.length < 3) return <div style={{ textAlign: 'center', color: '#94a3b8', padding: '50px 0', fontSize: '1rem' }}>레이더 차트는 데이터 항목 3개 이상이 필요합니다.</div>;
  const n = axes.length;
  const ang = (i: number) => -Math.PI / 2 + i * (2 * Math.PI / n);
  const churchData = chart.churches.map(ch => ({ ch, color: chart.churchColors[ch] || '#2563eb', vals: axes.map(k => weeks.reduce((s, w) => s + getTotal(ch, w, k), 0)) }));
  const mx = Math.max(...churchData.flatMap(d => d.vals), 1);
  const pt = (i: number, v: number) => ({ x: cx + r * (v / mx) * Math.cos(ang(i)), y: cy + r * (v / mx) * Math.sin(ang(i)) });
  return (
    <svg viewBox={`0 0 ${SW} ${SH}`} style={{ width: '100%', height: 'auto' }}>
      {[0.25, 0.5, 0.75, 1].map(ratio => <polygon key={ratio} points={axes.map((_, i) => `${cx + r * ratio * Math.cos(ang(i))},${cy + r * ratio * Math.sin(ang(i))}`).join(' ')} fill="none" stroke="#e2e8f0" strokeWidth="1.2" />)}
      {axes.map((_, i) => <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(ang(i))} y2={cy + r * Math.sin(ang(i))} stroke="#e2e8f0" strokeWidth="1.2" />)}
      {churchData.map((d, di) => <polygon key={di} points={d.vals.map((v, i) => { const p = pt(i, v); return `${p.x},${p.y}`; }).join(' ')} fill={d.color} fillOpacity="0.18" stroke={d.color} strokeWidth="2.8"><title>{d.ch}</title></polygon>)}
      {axes.map((k, i) => { const x = cx + (r + 20) * Math.cos(ang(i)); const y = cy + (r + 20) * Math.sin(ang(i)); return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="12" fill="#334155" fontWeight="800">{DATA_KEY_LABELS[k] || k}</text>; })}
      {churchData.map((d, i) => <g key={i} transform={`translate(360, ${24 + i * 28})`}><rect x="0" y="0" width="15" height="15" fill={d.color} rx="3" fillOpacity="0.9" /><text x="24" y="13" fontSize="13.5" fill="#334155" fontWeight="700">{d.ch.length > 12 ? d.ch.slice(0, 12) + '…' : d.ch}</text></g>)}
    </svg>
  );
}

