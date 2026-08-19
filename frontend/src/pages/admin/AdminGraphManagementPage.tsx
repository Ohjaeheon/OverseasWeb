import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Pencil, ArrowUp, ArrowDown, ToggleLeft, ToggleRight, BarChart3 } from 'lucide-react';
import { CATS, MetricDef } from '../../utils/diagnosisMetrics';
import { ColumnConfigEntry, mergeColumnConfig } from '../../utils/metricColumnEval';
import { metricColumnConfigService } from '../../services/metricColumnConfigService';
import { graphConfigService, BoardChartConfig, BoardChartType, BoardChartGroupBy } from '../../services/graphConfigService';
import { GRAPH_CATEGORY_KEY, GROUP_BY_LABELS } from '../../components/user/diagnosis/BoardChartDashboard';

const OVERSEAS_BOARD_CAT = '해외선교부 현황판';

const CHART_TYPE_LABELS: Record<BoardChartType, string> = { bar: '▊ 막대', line: '📈 꺾은선', pie: '🥧 원형' };

let idSeq = 0;
function newGraphId(): string {
  idSeq += 1;
  return `graph_${Date.now()}_${idSeq}`;
}

const cardStyle: React.CSSProperties = {
  background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 10,
  display: 'flex', alignItems: 'center', gap: 14,
};
const btnGhost: React.CSSProperties = {
  padding: '7px 12px', borderRadius: 8, border: '1.5px solid #cbd5e1', background: '#fff',
  color: '#475569', fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer',
};
const btnPrimary: React.CSSProperties = {
  padding: '9px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
  color: '#fff', fontWeight: 800, fontSize: '0.92rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
};

export const AdminGraphManagementPage: React.FC = () => {
  const [charts, setCharts] = useState<BoardChartConfig[]>([]);
  const [availableMetrics, setAvailableMetrics] = useState<MetricDef[]>(CATS[OVERSEAS_BOARD_CAT] || []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [mTitle, setMTitle] = useState('');
  const [mChartType, setMChartType] = useState<BoardChartType>('bar');
  const [mGroupBy, setMGroupBy] = useState<BoardChartGroupBy>('gubun');
  const [mMetricIds, setMMetricIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [graphRows, metricRows] = await Promise.all([
          graphConfigService.getAllConfigs(),
          metricColumnConfigService.getAllConfigs(),
        ]);
        if (cancelled) return;

        const graphRow = graphRows.find((r) => r.categoryKey === GRAPH_CATEGORY_KEY);
        if (graphRow) {
          try { setCharts(JSON.parse(graphRow.graphsJson)); } catch { setCharts([]); }
        }

        const metricRow = metricRows.find((r) => r.categoryKey === OVERSEAS_BOARD_CAT);
        let entries: ColumnConfigEntry[] | undefined;
        if (metricRow) {
          try { entries = JSON.parse(metricRow.columnsJson); } catch { entries = undefined; }
        }
        setAvailableMetrics(mergeColumnConfig(CATS[OVERSEAS_BOARD_CAT] || [], entries));
      } catch (e) {
        console.warn('그래프/지표 설정 조회 실패', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const metricLabel = useMemo(() => {
    const m = new Map(availableMetrics.map((d) => [d.id, d.l]));
    return (id: string) => m.get(id) || id;
  }, [availableMetrics]);

  const persist = async (updated: BoardChartConfig[]) => {
    setCharts(updated);
    setSaving(true);
    try {
      await graphConfigService.saveConfig(GRAPH_CATEGORY_KEY, updated);
    } catch (e) {
      console.error('그래프 설정 저장 실패', e);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setMTitle('새 그래프');
    setMChartType('bar');
    setMGroupBy('gubun');
    setMMetricIds(availableMetrics[0] ? [availableMetrics[0].id] : []);
    setIsModalOpen(true);
  };

  const openEdit = (chart: BoardChartConfig) => {
    setEditingId(chart.id);
    setMTitle(chart.title);
    setMChartType(chart.chartType);
    setMGroupBy(chart.groupBy);
    setMMetricIds([...chart.metricIds]);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('이 그래프를 삭제하시겠습니까?')) return;
    persist(charts.filter((c) => c.id !== id));
  };

  const handleToggleEnabled = (id: string) => {
    persist(charts.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c)));
  };

  const handleMove = (id: string, dir: -1 | 1) => {
    const sorted = [...charts].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((c) => c.id === id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return;
    [sorted[idx], sorted[swapIdx]] = [sorted[swapIdx], sorted[idx]];
    persist(sorted.map((c, i) => ({ ...c, order: i })));
  };

  const handleSave = () => {
    if (!mTitle.trim()) { alert('제목을 입력해 주세요.'); return; }
    if (mMetricIds.length === 0) { alert('지표를 1개 이상 선택해 주세요.'); return; }
    if (mChartType === 'pie' && mMetricIds.length > 1) { alert('원형 그래프는 지표를 1개만 선택할 수 있습니다.'); return; }

    if (editingId) {
      persist(charts.map((c) => (c.id === editingId
        ? { ...c, title: mTitle.trim(), chartType: mChartType, groupBy: mGroupBy, metricIds: mMetricIds }
        : c)));
    } else {
      const newChart: BoardChartConfig = {
        id: newGraphId(), title: mTitle.trim(), chartType: mChartType,
        groupBy: mGroupBy, metricIds: mMetricIds, enabled: true, order: charts.length,
      };
      persist([...charts, newChart]);
    }
    setIsModalOpen(false);
  };

  const sortedCharts = [...charts].sort((a, b) => a.order - b.order);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <BarChart3 size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0f172a' }}>현황판 그래프 관리</div>
            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>홈 화면 "해외선교부 현황판" 아래에 표시할 그래프를 구성합니다.</div>
          </div>
        </div>
        <button style={btnPrimary} onClick={openAdd}><Plus size={16} style={{ verticalAlign: -3 }} /> 그래프 추가</button>
      </div>

      {loading ? (
        <div style={{ color: '#64748b', padding: '30px 0' }}>불러오는 중...</div>
      ) : sortedCharts.length === 0 ? (
        <div style={{ background: '#fff', border: '2px dashed #cbd5e1', borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.2rem', marginBottom: 10 }}>📊</div>
          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#334155', marginBottom: 6 }}>등록된 그래프가 없습니다</div>
          <div style={{ fontSize: '0.86rem', color: '#64748b', marginBottom: 16 }}>버튼을 눌러 첫 그래프를 만들어보세요. 지표는 메뉴 관리(상세표·수식 설정)에서 활성화한 항목 중에서 고를 수 있습니다.</div>
          <button style={btnPrimary} onClick={openAdd}>+ 첫 그래프 추가하기</button>
        </div>
      ) : (
        sortedCharts.map((chart, idx) => (
          <div key={chart.id} style={{ ...cardStyle, opacity: chart.enabled ? 1 : 0.55 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button style={{ ...btnGhost, padding: '2px 6px' }} disabled={idx === 0} onClick={() => handleMove(chart.id, -1)}><ArrowUp size={13} /></button>
              <button style={{ ...btnGhost, padding: '2px 6px' }} disabled={idx === sortedCharts.length - 1} onClick={() => handleMove(chart.id, 1)}><ArrowDown size={13} /></button>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{chart.title}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                <span style={{ fontSize: '0.76rem', padding: '3px 9px', borderRadius: 6, background: '#eff6ff', color: '#2563eb', fontWeight: 800 }}>{CHART_TYPE_LABELS[chart.chartType]}</span>
                <span style={{ fontSize: '0.76rem', padding: '3px 9px', borderRadius: 6, background: '#f0fdf4', color: '#16a34a', fontWeight: 800 }}>{GROUP_BY_LABELS[chart.groupBy]}</span>
                {chart.metricIds.map((id) => (
                  <span key={id} style={{ fontSize: '0.76rem', padding: '3px 9px', borderRadius: 6, background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', fontWeight: 700 }}>{metricLabel(id)}</span>
                ))}
              </div>
            </div>
            <button style={btnGhost} onClick={() => handleToggleEnabled(chart.id)} title={chart.enabled ? '비활성화' : '활성화'}>
              {chart.enabled ? <ToggleRight size={18} color="#16a34a" /> : <ToggleLeft size={18} color="#94a3b8" />}
            </button>
            <button style={btnGhost} onClick={() => openEdit(chart)}><Pencil size={14} /></button>
            <button style={{ ...btnGhost, color: '#ef4444', borderColor: '#fecaca' }} onClick={() => handleDelete(chart.id)}><Trash2 size={14} /></button>
          </div>
        ))
      )}

      {saving && <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 8 }}>저장 중...</div>}

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: 16 }} onClick={() => setIsModalOpen(false)}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', padding: 26 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>{editingId ? '✏️ 그래프 수정' : '➕ 새 그래프 추가'}</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#94a3b8' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>📝 제목</label>
                <input type="text" value={mTitle} onChange={(e) => setMTitle(e.target.value)} placeholder="예: 지파별 현재적 현황"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: '0.94rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 800, color: '#334155', marginBottom: 8 }}>📊 그래프 종류</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(Object.keys(CHART_TYPE_LABELS) as BoardChartType[]).map((t) => (
                    <button key={t} onClick={() => setMChartType(t)}
                      style={{ padding: '8px 16px', borderRadius: 10, cursor: 'pointer', border: mChartType === t ? 'none' : '1.5px solid #e2e8f0', background: mChartType === t ? 'linear-gradient(135deg, #2563eb, #7c3aed)' : '#f8fafc', color: mChartType === t ? '#fff' : '#475569', fontWeight: 800, fontSize: '0.88rem' }}>
                      {CHART_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
                {mChartType === 'pie' && <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '6px 0 0' }}>원형 그래프는 지표를 1개만 선택할 수 있습니다.</p>}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 800, color: '#334155', marginBottom: 8 }}>🗂️ 분류(x축) 기준</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(Object.keys(GROUP_BY_LABELS) as BoardChartGroupBy[]).map((g) => (
                    <button key={g} onClick={() => setMGroupBy(g)}
                      style={{ padding: '8px 14px', borderRadius: 8, cursor: 'pointer', border: mGroupBy === g ? 'none' : '1.5px solid #e2e8f0', background: mGroupBy === g ? '#0f172a' : '#f8fafc', color: mGroupBy === g ? '#fff' : '#475569', fontWeight: 700, fontSize: '0.86rem' }}>
                      {GROUP_BY_LABELS[g]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 800, color: '#334155', marginBottom: 8 }}>
                  📋 표시 지표 <span style={{ fontWeight: 500, color: '#64748b' }}>({mChartType === 'pie' ? '1개' : '다중'} 선택 · 메뉴 관리에서 활성화한 항목만 표시)</span>
                </label>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {availableMetrics.map((m) => {
                    const checked = mMetricIds.includes(m.id);
                    return (
                      <button key={m.id} onClick={() => {
                        if (mChartType === 'pie') { setMMetricIds([m.id]); return; }
                        setMMetricIds((prev) => checked ? prev.filter((k) => k !== m.id) : [...prev, m.id]);
                      }} style={{ padding: '7px 14px', borderRadius: 8, cursor: 'pointer', border: checked ? '2px solid #2563eb' : '1.5px solid #e2e8f0', background: checked ? '#eff6ff' : '#f8fafc', color: checked ? '#2563eb' : '#64748b', fontWeight: checked ? 800 : 500, fontSize: '0.85rem' }}>
                        {m.l}
                      </button>
                    );
                  })}
                  {availableMetrics.length === 0 && <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>관리자페이지 &gt; 메뉴 관리(상세표·수식 설정)에서 "해외선교부 현황판" 항목을 먼저 활성화해 주세요.</p>}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              <button onClick={() => setIsModalOpen(false)} style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>취소</button>
              <button onClick={handleSave} style={btnPrimary}>{editingId ? '수정 완료' : '추가'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
