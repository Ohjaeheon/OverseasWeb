import React from 'react';
import { CENTERS, CENTER_COLORS, SUPPORTED_YEARS } from '../../data/simulationData';
import { ChartSettings } from '../../services/simulationService';
import { Settings, X } from 'lucide-react';

interface Props {
  year: number;
  onYearChange: (y: number) => void;
  chartSettings: ChartSettings;
  onChartSettingsChange: (s: ChartSettings) => void;
  showChartConfig?: boolean;
}

const OVERLAY: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)',
  backdropFilter: 'blur(4px)', zIndex: 9000,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const PANEL: React.CSSProperties = {
  background: '#fff', borderRadius: '20px', padding: '28px 32px',
  width: '520px', maxWidth: '96vw', boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
  maxHeight: '90vh', overflowY: 'auto',
};

export const SimulationToolbar: React.FC<Props> = ({
  year, onYearChange, chartSettings, onChartSettingsChange, showChartConfig = true,
}) => {
  const [showPanel, setShowPanel] = React.useState(false);
  const [draft, setDraft] = React.useState<ChartSettings>(chartSettings);

  const openPanel = () => {
    setDraft({ ...chartSettings });
    setShowPanel(true);
  };

  const apply = () => {
    onChartSettingsChange(draft);
    setShowPanel(false);
  };

  const toggleCenter = (c: string) => {
    setDraft(prev => {
      const all = prev.selectedCenters.includes(c)
        ? prev.selectedCenters.filter(x => x !== c)
        : [...prev.selectedCenters, c];
      return { ...prev, selectedCenters: all };
    });
  };

  return (
    <>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
        {/* 연도 선택 */}
        <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', borderRadius: '10px', padding: '4px' }}>
          {SUPPORTED_YEARS.map(y => (
            <button
              key={y}
              onClick={() => onYearChange(y)}
              style={{
                padding: '6px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.88rem',
                background: year === y ? '#2563eb' : 'transparent',
                color: year === y ? '#fff' : '#64748b',
                transition: 'all 0.15s',
              }}
            >{y}년</button>
          ))}
        </div>

        {/* 차트 설정 버튼 */}
        {showChartConfig && (
          <button
            onClick={openPanel}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '10px',
              border: '1px solid #e2e8f0', background: '#fff',
              fontWeight: 700, fontSize: '0.85rem', color: '#475569',
              cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            }}
          >
            <Settings size={15} /> 그래프 설정
          </button>
        )}

        {/* 선택된 센터 표시 */}
        {chartSettings.selectedCenters.length > 0 && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {chartSettings.selectedCenters.map(c => (
              <span key={c} style={{
                padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700,
                background: CENTER_COLORS[c] + '22', color: CENTER_COLORS[c],
                border: `1px solid ${CENTER_COLORS[c]}44`,
              }}>{c}</span>
            ))}
            <button
              onClick={() => onChartSettingsChange({ ...chartSettings, selectedCenters: [] })}
              style={{
                padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700,
                background: '#f1f5f9', color: '#94a3b8', border: 'none', cursor: 'pointer',
              }}
            >전체</button>
          </div>
        )}
        {chartSettings.selectedCenters.length === 0 && (
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>전체 센터 표시 중</span>
        )}
      </div>

      {/* 설정 패널 */}
      {showPanel && (
        <div style={OVERLAY} onClick={() => setShowPanel(false)}>
          <div style={PANEL} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1f2a44' }}>
                📊 그래프 설정
              </h3>
              <button onClick={() => setShowPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            {/* 차트 유형 */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#475569', marginBottom: '8px' }}>차트 유형</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { id: 'bar', label: '📊 막대' },
                  { id: 'line', label: '📈 라인' },
                  { id: 'area', label: '🌊 영역' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setDraft(p => ({ ...p, chartType: opt.id as any }))}
                    style={{
                      padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      fontWeight: 700, fontSize: '0.85rem',
                      background: draft.chartType === opt.id ? '#2563eb' : '#f1f5f9',
                      color: draft.chartType === opt.id ? '#fff' : '#475569',
                    }}
                  >{opt.label}</button>
                ))}
              </div>
            </div>

            {/* 상위 N개 강조 */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#475569', marginBottom: '8px' }}>
                상위 N개 강조 (순위 탭)
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[1, 3, 5, 10].map(n => (
                  <button
                    key={n}
                    onClick={() => setDraft(p => ({ ...p, highlightTopN: n }))}
                    style={{
                      padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      fontWeight: 700, fontSize: '0.85rem',
                      background: draft.highlightTopN === n ? '#7c3aed' : '#f1f5f9',
                      color: draft.highlightTopN === n ? '#fff' : '#475569',
                    }}
                  >Top {n}</button>
                ))}
              </div>
            </div>

            {/* 합계 표시 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={draft.showTotal}
                  onChange={e => setDraft(p => ({ ...p, showTotal: e.target.checked }))}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#475569' }}>합계 행/선 표시</span>
              </label>
            </div>

            {/* 센터 선택 */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#475569' }}>
                  표시할 센터 선택 ({draft.selectedCenters.length === 0 ? '전체' : `${draft.selectedCenters.length}개`})
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setDraft(p => ({ ...p, selectedCenters: [] }))}
                    style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', color: '#475569' }}
                  >전체 선택</button>
                  <button
                    onClick={() => setDraft(p => ({ ...p, selectedCenters: [...CENTERS] }))}
                    style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', color: '#475569' }}
                  >전체 해제→직접선택</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {CENTERS.map(c => {
                  const active = draft.selectedCenters.length === 0 || draft.selectedCenters.includes(c);
                  const checked = draft.selectedCenters.includes(c);
                  return (
                    <label
                      key={c}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                        border: `1px solid ${checked ? CENTER_COLORS[c] + '80' : '#e2e8f0'}`,
                        background: checked ? CENTER_COLORS[c] + '12' : '#fafbfc',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCenter(c)}
                        style={{ width: '14px', height: '14px', accentColor: CENTER_COLORS[c] }}
                      />
                      <span style={{ fontWeight: 700, fontSize: '0.83rem', color: checked ? CENTER_COLORS[c] : '#64748b' }}>
                        {c}
                      </span>
                    </label>
                  );
                })}
              </div>
              <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#94a3b8' }}>
                * 체크 없이 "전체 선택" 상태는 모든 센터를 표시합니다
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowPanel(false)}
                style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', fontWeight: 700, fontSize: '0.88rem', color: '#475569', cursor: 'pointer' }}
              >취소</button>
              <button
                onClick={apply}
                style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}
              >적용</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
