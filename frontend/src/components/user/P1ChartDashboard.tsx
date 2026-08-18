/**
 * P1ChartDashboard – /OverseasPortal/evangelism 메인 대시보드 및 ProcessCategoryPage(센터/예배)에서
 * 직접 <P1ChartDashboard /> 로 렌더링되는 커스텀 그래프 컴포넌트 (recharts 기반)
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import api from '../../services/api';
import { useMetricColumnConfig } from '../../contexts/MetricColumnConfigContext';

const CHURCH_COLOR_PALETTE = [
  '#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c',
  '#0891b2', '#d97706', '#db2777', '#65a30d', '#7c3aed'
];

const DATA_KEY_LABELS: Record<string, string> = {
  reg: '전도재적', find: '찾기', findDrop: '찾기탈락',
  gospel: '복음방', gospelDrop: '복음방탈락',
  admit: '개강', admitDrop: '개강탈락'
};

// 관리자 페이지(adminsetting/dashboard-config)의 "①전도" 카테고리에서 켜고 끌 수 있는
// 지표(diagnosisMetrics.ts CATS['①전도'][].id)와, 이 그래프가 쓰는 원자료 키의 대응 관계.
// 대응되는 관리자 설정 항목이 없는 탈락(drop) 계열 키는 항상 선택 가능하게 둔다.
const DATA_KEY_TO_METRIC_ID: Record<string, string> = {
  reg: 'evangRegFrozen', find: 'findMonth', gospel: 'gospelMonth', admit: 'bibleMonthReg'
};
const EVANGELISM_CATEGORY = '①전도';

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
  const { getColumnsFor } = useMetricColumnConfig();

  // 관리자가 dashboard-config에서 활성화한 "①전도" 지표만 그래프 데이터 항목으로 노출한다.
  // 대응되는 관리자 설정이 없는 탈락(drop) 계열 키는 항상 노출한다.
  const availableDataKeys = useMemo(() => {
    const enabledIds = new Set(getColumnsFor(EVANGELISM_CATEGORY).map(d => d.id));
    return Object.keys(DATA_KEY_LABELS).filter(k => {
      const metricId = DATA_KEY_TO_METRIC_ID[k];
      return !metricId || enabledIds.has(metricId);
    });
  }, [getColumnsFor]);

  const [chartConfigs, setChartConfigs] = useState<ChartConfig[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChart, setEditingChart] = useState<ChartConfig | null>(null);
  const [availableChurches, setAvailableChurches] = useState<ChurchInfo[]>([]);
  const [churchRecords, setChurchRecords] = useState<Record<string, Record<string, Record<string, Record<string, number>>>>>({});

  const selectedYear = `${new Date().getFullYear()}년`;

  const [mTitle, setMTitle] = useState('');
  const [mChartType, setMChartType] = useState<'bar' | 'line' | 'pie' | 'radar'>('bar');
  const [mChurches, setMChurches] = useState<string[]>([]);
  const [mChurchColors, setMChurchColors] = useState<Record<string, string>>({});
  const [mDataKeys, setMDataKeys] = useState<string[]>(['find']);
  const [mWeekRange, setMWeekRange] = useState<'current' | 'month' | 'all'>('all');

  // 관리자페이지 > 시스템 설정(/adminsetting/settings)에서 조정 가능한 최대 그래프 개수. 기본값 10.
  const [maxChartCount, setMaxChartCount] = useState(10);

  useEffect(() => {
    fetchChartConfigsFromDb().then(setChartConfigs);
    api.get<any[]>('/admin/churches').then(res => {
      if (Array.isArray(res.data)) {
        setAvailableChurches(res.data.map((c: any) => ({ id: c.churchId || c.id, name: c.name || c.churchName })));
      }
    }).catch(() => {});
    api.get<{ maxCount: number }>('/evangelism/config/chart-max-count').then(res => {
      if (res.data && Number.isFinite(res.data.maxCount)) setMaxChartCount(res.data.maxCount);
    }).catch(() => {});
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
    setMChurches([]); setMChurchColors({}); setMDataKeys([availableDataKeys[0] || 'find']); setMWeekRange('all');
    setIsModalOpen(true);
  };

  const openEdit = (chart: ChartConfig) => {
    setEditingChart(chart); setMTitle(chart.title); setMChartType(chart.chartType);
    setMChurches([...chart.churches]); setMChurchColors({ ...chart.churchColors });
    setMDataKeys(chart.dataKeys.filter(k => availableDataKeys.includes(k))); setMWeekRange(chart.weekRange);
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

  const getWeeksForChart = (churches: string[], weekRange: ChartConfig['weekRange']): string[] => {
    const weekSet = new Set<string>();
    churches.forEach(ch => {
      const rec = churchRecords[ch];
      if (rec) Object.keys(rec).forEach(w => weekSet.add(w));
    });
    const all = Array.from(weekSet).sort();
    if (weekRange === 'current') return all.slice(-1);
    if (weekRange === 'month') { const m = new Date().getMonth() + 1; return all.filter(w => w.startsWith(`${m}월`)); }
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
            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>최대 {maxChartCount}개 · 사용자별 DB 커스텀 저장</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {isEditMode && chartConfigs.length < maxChartCount && (
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
              churchRecords={churchRecords} availableDataKeys={availableDataKeys}
              getWeeks={(churches) => getWeeksForChart(churches, chart.weekRange)}
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
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>📋 데이터 항목 <span style={{ fontWeight: 500, color: '#64748b' }}>(다중 선택 · 관리자페이지 &gt; 메뉴 관리에서 활성화한 항목만 표시)</span></label>
                <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                  {availableDataKeys.map(key => {
                    const label = DATA_KEY_LABELS[key];
                    const checked = mDataKeys.includes(key);
                    return <button key={key} onClick={() => setMDataKeys(prev => checked ? prev.filter(k => k !== key) : [...prev, key])} style={{ padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', border: checked ? '2px solid #2563eb' : '1.5px solid #e2e8f0', background: checked ? '#eff6ff' : '#f8fafc', color: checked ? '#2563eb' : '#64748b', fontWeight: checked ? 800 : 500, fontSize: '0.85rem' }}>{label}</button>;
                  })}
                  {availableDataKeys.length === 0 && <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>관리자페이지 &gt; 메뉴 관리(상세표·수식 설정)에서 "①전도" 항목을 먼저 활성화해 주세요.</p>}
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
  availableDataKeys: string[];
  getWeeks: (churches: string[]) => string[];
  getTotal: (records: Record<string, Record<string, Record<string, number>>>, weekKey: string, dataKey: string) => number;
  onFetch: (churches: string[]) => void;
  onEdit: () => void; onDelete: () => void;
}

function ChartCard({ chart, isEditMode, churchRecords, availableDataKeys, getWeeks, getTotal, onFetch, onEdit, onDelete }: ChartCardProps) {
  useEffect(() => {
    const missing = chart.churches.filter(c => !churchRecords[c]);
    if (missing.length > 0) onFetch(missing);
  }, [chart.churches, churchRecords]);

  const weeks = getWeeks(chart.churches);
  // 관리자가 dashboard-config에서 이후에 비활성화한 데이터 항목은 저장된 그래프에서도 제외한다.
  const activeDataKeys = chart.dataKeys.filter(k => availableDataKeys.includes(k));
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
          {activeDataKeys.map(k => <span key={k} style={{ fontSize: '0.78rem', padding: '3px 9px', borderRadius: '6px', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', fontWeight: 700 }}>{DATA_KEY_LABELS[k] || k}</span>)}
        </div>
      </div>
      <div style={{ padding: '18px 22px 22px' }}>
        {activeDataKeys.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '50px 0', fontSize: '0.92rem' }}>선택된 데이터 항목이 관리자 설정에서 비활성화되었습니다.<br />그래프를 수정해 다른 항목을 선택해 주세요.</div>
        ) : (
          <>
            {chart.chartType === 'bar' && <BarSVG chart={chart} dataKeys={activeDataKeys} weeks={weeks} getTotal={getTotalForChurch} />}
            {chart.chartType === 'line' && <LineSVG chart={chart} dataKeys={activeDataKeys} weeks={weeks} getTotal={getTotalForChurch} />}
            {chart.chartType === 'pie' && <PieSVG chart={chart} dataKeys={activeDataKeys} weeks={weeks} getTotal={getTotalForChurch} />}
            {chart.chartType === 'radar' && <RadarSVG chart={chart} dataKeys={activeDataKeys} weeks={weeks} getTotal={getTotalForChurch} />}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// recharts 기반 차트 렌더러
// ============================================================
interface ChartProps {
  chart: ChartConfig;
  dataKeys: string[];
  weeks: string[];
  getTotal: (church: string, week: string, key: string) => number;
}

function seriesKey(church: string, key: string) { return `${church}__${key}`; }
// 데이터 항목을 1개만 선택했을 때는 항목명이 굳이 필요 없으므로 교회명만 표시하고,
// 2개 이상 선택했을 때만 "교회명 · 항목명"으로 구분해 표시한다.
function seriesName(church: string, key: string, dataKeys: string[]) {
  return dataKeys.length > 1 ? `${church} · ${DATA_KEY_LABELS[key] || key}` : church;
}

function BarSVG({ chart, dataKeys, weeks, getTotal }: ChartProps) {
  const dw = weeks.slice(-12);
  const data = dw.map(week => {
    const row: Record<string, string | number> = { week: week.replace('주차', '주') };
    chart.churches.forEach(ch => dataKeys.forEach(k => { row[seriesKey(ch, k)] = getTotal(ch, week, k); }));
    return row;
  });
  const series = chart.churches.flatMap(ch => dataKeys.map(k => ({
    key: seriesKey(ch, k), name: seriesName(ch, k, dataKeys),
    color: chart.churchColors[ch] || '#2563eb',
    opacity: dataKeys.length > 1 ? (dataKeys.indexOf(k) === 0 ? 1 : 0.6) : 1,
  })));
  const rotateLabels = dw.length > 6;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: rotateLabels ? 34 : 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="week" tick={{ fontSize: 11.5, fontWeight: 700, fill: '#475569' }} interval={0}
          angle={rotateLabels ? -30 : 0} textAnchor={rotateLabels ? 'end' : 'middle'} height={rotateLabels ? 44 : 24} />
        <YAxis tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }} allowDecimals={false} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 700, color: '#334155' }} />
        {series.map(s => <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} fillOpacity={s.opacity} radius={[4, 4, 0, 0]} />)}
      </BarChart>
    </ResponsiveContainer>
  );
}

function LineSVG({ chart, dataKeys, weeks, getTotal }: ChartProps) {
  const dw = weeks.slice(-14);
  const data = dw.map(week => {
    const row: Record<string, string | number> = { week: week.replace('주차', '주') };
    chart.churches.forEach(ch => dataKeys.forEach(k => { row[seriesKey(ch, k)] = getTotal(ch, week, k); }));
    return row;
  });
  const series = chart.churches.flatMap(ch => dataKeys.map((k, ki) => ({
    key: seriesKey(ch, k), name: seriesName(ch, k, dataKeys),
    color: chart.churchColors[ch] || '#2563eb', dashed: ki > 0,
  })));
  const rotateLabels = dw.length > 6;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: rotateLabels ? 34 : 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="week" tick={{ fontSize: 11.5, fontWeight: 700, fill: '#475569' }} interval={0}
          angle={rotateLabels ? -30 : 0} textAnchor={rotateLabels ? 'end' : 'middle'} height={rotateLabels ? 44 : 24} />
        <YAxis tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }} allowDecimals={false} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 700, color: '#334155' }} />
        {series.map(s => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color}
            strokeWidth={3} strokeDasharray={s.dashed ? '6 4' : undefined}
            dot={{ r: 4.5, fill: s.color, stroke: '#fff', strokeWidth: 2 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function PieSVG({ chart, dataKeys, weeks, getTotal }: ChartProps) {
  const slices = chart.churches.flatMap(ch => dataKeys.map(k => ({
    name: seriesName(ch, k, dataKeys),
    value: weeks.reduce((s, w) => s + getTotal(ch, w, k), 0),
    color: chart.churchColors[ch] || '#2563eb',
  })));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={slices} dataKey="value" nameKey="name" cx="36%" cy="50%" outerRadius={95} strokeWidth={2.5} stroke="#fff">
          {slices.map((s, i) => <Cell key={i} fill={s.color} />)}
        </Pie>
        <Tooltip formatter={(value: number, name: string) => [value, name]} />
        <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '13px', fontWeight: 700, color: '#334155' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function RadarSVG({ chart, dataKeys, weeks, getTotal }: ChartProps) {
  if (dataKeys.length < 3) return <div style={{ textAlign: 'center', color: '#94a3b8', padding: '50px 0', fontSize: '1rem' }}>레이더 차트는 데이터 항목 3개 이상이 필요합니다.</div>;
  const data = dataKeys.map(k => {
    const row: Record<string, string | number> = { axis: DATA_KEY_LABELS[k] || k };
    chart.churches.forEach(ch => { row[ch] = weeks.reduce((s, w) => s + getTotal(ch, w, k), 0); });
    return row;
  });
  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} outerRadius={95}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="axis" tick={{ fontSize: 12, fontWeight: 800, fill: '#334155' }} />
        <PolarRadiusAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
        {chart.churches.map(ch => {
          const color = chart.churchColors[ch] || '#2563eb';
          return <Radar key={ch} name={ch} dataKey={ch} stroke={color} fill={color} fillOpacity={0.18} strokeWidth={2.5} />;
        })}
        <Legend wrapperStyle={{ fontSize: '13px', fontWeight: 700, color: '#334155' }} />
        <Tooltip />
      </RadarChart>
    </ResponsiveContainer>
  );
}
