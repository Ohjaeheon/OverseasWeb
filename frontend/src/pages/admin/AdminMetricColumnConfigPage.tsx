import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Save, RotateCcw, ArrowUp, ArrowDown, Star, ToggleLeft, ToggleRight, LineChart } from 'lucide-react';
import { CATS, CAT_NAMES, RAW_FIELD_KEYS, RAW_FIELD_LABELS, RAW_FIELD_UNRELIABLE, MetricDef } from '../../utils/diagnosisMetrics';
import { extractFormulaVariables } from '../../utils/formulaEval';
import { ColumnConfigEntry, SystemColumnOverride, CustomColumnConfig } from '../../utils/metricColumnEval';
import { metricColumnConfigService, MetricColumnConfigItem } from '../../services/metricColumnConfigService';

function defaultEntriesFor(cat: string): ColumnConfigEntry[] {
  const defs = CATS[cat] || [];
  return defs.map((m, i): SystemColumnOverride => ({
    kind: 'system', systemId: m.id, enabled: true, order: i,
  }));
}

let customIdSeq = 0;
function newCustomId(): string {
  customIdSeq += 1;
  return `custom_${Date.now()}_${customIdSeq}`;
}

/** 목록 조작(수정/삭제/정렬)에 쓰는 불변 식별 키. custom 컬럼의 id(변수명)는 사용자가 편집하므로
 * React key/조작 대상 식별에는 절대 쓰지 않는다 — 편집 중 remount(포커스 끊김)와 잘못된 행 조작을 막는다. */
function entryKey(e: ColumnConfigEntry): string {
  return e.kind === 'system' ? `sys:${e.systemId}` : `custom:${e.uid}`;
}

const inputSm: React.CSSProperties = {
  background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: 8, padding: '7px 10px',
  color: '#0f172a', fontSize: '0.85rem', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
};
const cardStyle: React.CSSProperties = {
  background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginBottom: 8,
};

export const AdminMetricColumnConfigPage: React.FC = () => {
  const [cat, setCat] = useState<string>(CAT_NAMES[0]);
  const [entries, setEntries] = useState<ColumnConfigEntry[]>(defaultEntriesFor(CAT_NAMES[0]));
  const [savedRows, setSavedRows] = useState<MetricColumnConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await metricColumnConfigService.getAllConfigs();
      setSavedRows(rows);
    } catch (e) {
      console.warn('컬럼 설정 목록 조회 실패', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    const saved = savedRows.find((r) => r.categoryKey === cat);
    if (saved) {
      try {
        const parsed = JSON.parse(saved.columnsJson) as ColumnConfigEntry[];
        setEntries(parsed.length ? parsed : defaultEntriesFor(cat));
        return;
      } catch { /* fall through to default */ }
    }
    setEntries(defaultEntriesFor(cat));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, savedRows]);

  const defsById = useMemo(() => {
    const m = new Map<string, MetricDef>();
    (CATS[cat] || []).forEach((d) => m.set(d.id, d));
    return m;
  }, [cat]);

  const availableVars = useMemo(() => {
    const s = new Set<string>(RAW_FIELD_KEYS);
    entries.forEach((e) => { if (e.kind === 'custom') s.add(e.id); });
    return s;
  }, [entries]);

  const varLabel = useCallback((v: string): string => {
    if (RAW_FIELD_LABELS[v]) return RAW_FIELD_LABELS[v];
    const custom = entries.find((e): e is CustomColumnConfig => e.kind === 'custom' && e.id === v);
    return custom?.label || '';
  }, [entries]);

  const sorted = useMemo(() => [...entries].sort((a, b) => a.order - b.order), [entries]);

  const updateEntry = (key: string, patch: Partial<ColumnConfigEntry>) => {
    setEntries((prev) => prev.map((e) => (entryKey(e) === key ? ({ ...e, ...patch } as ColumnConfigEntry) : e)));
  };
  const setPrimary = (key: string) => {
    setEntries((prev) => prev.map((e) => ({ ...e, primary: entryKey(e) === key })));
  };
  const move = (key: string, dir: -1 | 1) => {
    setEntries((prev) => {
      const list = [...prev].sort((a, b) => a.order - b.order);
      const idx = list.findIndex((e) => entryKey(e) === key);
      const j = idx + dir;
      if (idx < 0 || j < 0 || j >= list.length) return prev;
      // StrictMode에서 업데이트 함수가 두 번 호출돼도 항상 같은 결과가 나오도록, 기존 객체를
      // 직접 mutate하지 않고 order만 바꾼 새 객체로 교체한다(원본 entries 순서는 그대로 유지).
      const keyA = key;
      const keyB = entryKey(list[j]);
      const orderA = list[idx].order;
      const orderB = list[j].order;
      return prev.map((e) => {
        const k = entryKey(e);
        if (k === keyA) return { ...e, order: orderB } as ColumnConfigEntry;
        if (k === keyB) return { ...e, order: orderA } as ColumnConfigEntry;
        return e;
      });
    });
  };
  const addCustom = () => {
    setEntries((prev) => {
      const maxOrder = prev.reduce((m, e) => Math.max(m, e.order), -1);
      const uid = newCustomId();
      const entry: CustomColumnConfig = {
        kind: 'custom', uid, id: uid, label: '새 컬럼', valueType: 'int',
        sourceType: 'raw', sourceField: RAW_FIELD_KEYS[0], enabled: true, order: maxOrder + 1,
      };
      return [...prev, entry];
    });
  };
  const removeCustom = (key: string) => {
    setEntries((prev) => prev.filter((e) => entryKey(e) !== key));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await metricColumnConfigService.saveConfig(cat, entries);
      await loadAll();
      alert('저장되었습니다. 해당 카테고리를 사용하는 화면(전도/센터/예배 등)에 바로 반영됩니다.');
    } catch (e: any) {
      alert('저장에 실패했습니다: ' + (e.response?.data?.message || e.message));
    } finally {
      setSaving(false);
    }
  };
  const handleReset = async () => {
    if (!confirm('이 카테고리의 설정을 삭제하고 기본값으로 되돌릴까요?')) return;
    setSaving(true);
    try {
      await metricColumnConfigService.resetConfig(cat);
      await loadAll();
    } catch (e: any) {
      alert('초기화에 실패했습니다: ' + (e.response?.data?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  const hasSavedConfig = savedRows.some((r) => r.categoryKey === cat);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto', color: '#1e293b', fontFamily: '"Pretendard", "Noto Sans KR", -apple-system, sans-serif' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem' }}>🗂️ 메뉴 관리 — 상세표 컬럼 · 수식 설정</h2>
        <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 4 }}>
          전도·센터·예배 페이지 상세표에 표시할 컬럼의 순서/노출/라벨을 조정하고, 원본 필드나 수식으로 새 컬럼(변수)을 추가합니다.
          카테고리에 설정을 저장하지 않으면 기존 기본 컬럼 구성이 그대로 사용됩니다.
          같은 상위그룹명을 가진 인접한 컬럼끼리는 표에서 하나의 상위 헤더(예: "재적")로 묶여 표시됩니다.
        </div>
      </div>

      <div className="chips" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {CAT_NAMES.map((c) => (
          <div
            key={c}
            onClick={() => setCat(c)}
            style={{
              padding: '6px 12px', borderRadius: 999, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
              background: cat === c ? '#2563eb' : '#f1f5f9', color: cat === c ? '#fff' : '#475569',
              border: cat === c ? '1px solid #2563eb' : '1px solid #e2e8f0',
            }}
          >
            {c}{savedRows.some((r) => r.categoryKey === c) ? ' •' : ''}
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ color: '#64748b' }}>불러오는 중...</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button onClick={addCustom} style={btnStyle('#eef2ff', '#4338ca', '1px dashed #a5b4fc')}>
              <Plus size={14} /> 커스텀 컬럼(변수/수식) 추가
            </button>
            <div style={{ flex: 1 }} />
            {hasSavedConfig && (
              <button onClick={handleReset} disabled={saving} style={btnStyle('#fef2f2', '#b91c1c', '1px solid #fecaca')}>
                <RotateCcw size={14} /> 기본값으로 초기화
              </button>
            )}
            <button onClick={handleSave} disabled={saving} style={btnStyle('#2563eb', '#fff', 'none')}>
              <Save size={14} /> {saving ? '저장 중...' : '저장'}
            </button>
          </div>

          {sorted.map((entry, idx) => {
            const isSystem = entry.kind === 'system';
            const base = isSystem ? defsById.get((entry as SystemColumnOverride).systemId) : undefined;
            if (isSystem && !base) return null; // 소스에서 제거된 지표 참조 — 표시하지 않음
            const label = isSystem ? ((entry as SystemColumnOverride).label ?? base!.l) : (entry as CustomColumnConfig).label;
            const showChart = (isSystem ? (entry as SystemColumnOverride).showChart ?? base!.showChart : (entry as CustomColumnConfig).showChart) !== false;
            const key = entryKey(entry);

            return (
              <div key={key} style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button onClick={() => move(key, -1)} disabled={idx === 0} style={iconBtnStyle}><ArrowUp size={13} /></button>
                    <button onClick={() => move(key, 1)} disabled={idx === sorted.length - 1} style={iconBtnStyle}><ArrowDown size={13} /></button>
                  </div>

                  <span style={{
                    fontSize: '0.68rem', fontWeight: 800, padding: '2px 7px', borderRadius: 6,
                    background: isSystem ? '#e2e8f0' : '#dcfce7', color: isSystem ? '#475569' : '#166534',
                  }}>
                    {isSystem ? '기본' : '커스텀'}
                  </span>

                  <input
                    value={label}
                    placeholder="컬럼 라벨"
                    onChange={(e) => updateEntry(key, { label: e.target.value } as any)}
                    style={{ ...inputSm, flex: 1, minWidth: 120 }}
                  />

                  <input
                    value={(isSystem ? (entry as SystemColumnOverride).group ?? base!.group : (entry as CustomColumnConfig).group) || ''}
                    placeholder="상위그룹(선택)"
                    title="같은 상위그룹명을 가진 인접 컬럼끼리 표 헤더에서 하나로 묶여 표시됩니다. 비우면 단독 컬럼."
                    onChange={(e) => updateEntry(key, { group: e.target.value || undefined } as any)}
                    style={{ ...inputSm, width: 140 }}
                  />

                  <button
                    onClick={() => setPrimary(key)}
                    title="기본 정렬 기준 컬럼으로 지정"
                    style={{ ...iconBtnStyle, color: entry.primary ? '#d97706' : '#cbd5e1' }}
                  >
                    <Star size={15} fill={entry.primary ? '#d97706' : 'none'} />
                  </button>

                  <button onClick={() => updateEntry(key, { enabled: !entry.enabled } as any)} style={iconBtnStyle} title={entry.enabled ? '노출 중 (클릭 시 숨김)' : '숨김 (클릭 시 노출)'}>
                    {entry.enabled ? <ToggleRight size={20} color="#16a34a" /> : <ToggleLeft size={20} color="#94a3b8" />}
                  </button>

                  {cat.startsWith('⑤진단서·') && (
                    <button
                      onClick={() => updateEntry(key, { showChart: !showChart } as any)}
                      style={{ ...iconBtnStyle, color: showChart ? '#2563eb' : '#cbd5e1' }}
                      title={showChart ? '진단서 상세보기의 미니 그래프 표시 중 (클릭 시 숨김, 숫자는 유지)' : '미니 그래프 숨김 (클릭 시 표시)'}
                    >
                      <LineChart size={16} />
                    </button>
                  )}

                  {!isSystem && (
                    <button onClick={() => removeCustom(key)} style={{ ...iconBtnStyle, color: '#ef4444' }} title="삭제">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                {isSystem && (
                  <div style={{ marginTop: 6, fontSize: '0.72rem', color: '#94a3b8' }}>
                    기본 지표 (계산 로직 변경 불가) · 원래 라벨: {base!.l} · id: <code>{base!.id}</code>
                  </div>
                )}

                {!isSystem && (
                  <CustomColumnEditor
                    entry={entry as CustomColumnConfig}
                    onChange={(patch) => updateEntry(key, patch as any)}
                    availableVars={availableVars}
                    varLabel={varLabel}
                  />
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};

const CustomColumnEditor: React.FC<{
  entry: CustomColumnConfig;
  onChange: (patch: Partial<CustomColumnConfig>) => void;
  availableVars: Set<string>;
  varLabel: (v: string) => string;
}> = ({ entry, onChange, availableVars, varLabel }) => {
  const unknownVars = entry.sourceType === 'formula'
    ? extractFormulaVariables(entry.formula || '').filter((v) => !availableVars.has(v))
    : [];

  return (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '0.72rem', color: '#64748b' }}>값 형식</label>
        <select value={entry.valueType} onChange={(e) => onChange({ valueType: e.target.value as 'int' | 'pct' })} style={{ ...inputSm, width: 90 }}>
          <option value="int">숫자</option>
          <option value="pct">퍼센트</option>
        </select>

        <label style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: 8 }}>변수명</label>
        <input
          value={entry.id}
          onChange={(e) => onChange({ id: e.target.value.replace(/[^A-Za-z0-9_]/g, '_') })}
          title="다른 수식에서 이 컬럼을 참조할 때 쓰는 변수명"
          style={{ ...inputSm, width: 150, fontFamily: 'monospace', fontSize: '0.78rem', color: '#4338ca' }}
        />

        <label style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: 8 }}>소스</label>
        <select value={entry.sourceType} onChange={(e) => onChange({ sourceType: e.target.value as 'raw' | 'formula' })} style={{ ...inputSm, width: 100 }}>
          <option value="raw">원본 필드</option>
          <option value="formula">수식</option>
        </select>
      </div>

      {entry.sourceType === 'raw' ? (
        <div>
          <select value={entry.sourceField || ''} onChange={(e) => onChange({ sourceField: e.target.value })} style={{ ...inputSm, maxWidth: 340 }}>
            {Array.from(availableVars).sort().map((f) => (
              <option key={f} value={f}>
                {f}{varLabel(f) ? ` — ${varLabel(f)}` : ''}{RAW_FIELD_UNRELIABLE.has(f) ? ' ⚠ 현재 미연동' : ''}
              </option>
            ))}
          </select>
          {entry.sourceField && RAW_FIELD_UNRELIABLE.has(entry.sourceField) && (
            <div style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: 4 }}>
              ⚠ 이 필드는 아직 백엔드 데이터와 연결되지 않아 값이 항상 비어(0) 있을 수 있습니다.
            </div>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#64748b', marginTop: 8 }}>
            <input
              type="checkbox"
              checked={!!entry.freezeEnabled}
              onChange={(e) => onChange({
                freezeEnabled: e.target.checked,
                freezeYear: entry.freezeYear ?? new Date().getFullYear(),
                freezeMonth: entry.freezeMonth ?? 12,
              })}
            />
            고정(다른 시점 값 사용) — 페이지에서 어느 월을 보고 있든 아래에서 고른 연/월 값을 그대로 표시
          </label>
          {entry.freezeEnabled && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
              <label style={{ fontSize: '0.72rem', color: '#64748b' }}>기준 연도</label>
              <input
                type="number"
                value={entry.freezeYear ?? new Date().getFullYear()}
                onChange={(e) => onChange({ freezeYear: parseInt(e.target.value, 10) || new Date().getFullYear() })}
                style={{ ...inputSm, width: 80 }}
              />
              <label style={{ fontSize: '0.72rem', color: '#64748b' }}>기준 월</label>
              <select
                value={entry.freezeMonth ?? 12}
                onChange={(e) => onChange({ freezeMonth: parseInt(e.target.value, 10) })}
                style={{ ...inputSm, width: 80 }}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}월</option>)}
              </select>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                예: {entry.freezeYear ?? new Date().getFullYear()}년 {entry.freezeMonth ?? 12}월 값에 항상 고정 (페이지 월 선택과 무관)
              </span>
            </div>
          )}
        </div>
      ) : (
        <div>
          <input
            value={entry.formula || ''}
            placeholder="예: findMonth / evangReg (원본 필드나 다른 커스텀 컬럼 변수명 사용 가능)"
            onChange={(e) => onChange({ formula: e.target.value })}
            style={{ ...inputSm, width: '100%', fontFamily: 'monospace', fontSize: '0.8rem' }}
          />
          {unknownVars.length > 0 && (
            <div style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: 4 }}>
              알 수 없는 변수: {unknownVars.map((v) => <code key={v} style={{ background: '#fee2e2', padding: '1px 5px', borderRadius: 4, marginRight: 4 }}>{v}</code>)}
            </div>
          )}
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4 }}>
            사용 가능한 변수: {Array.from(availableVars).sort().slice(0, 24).map((v) => (
              <code key={v} title={varLabel(v)} style={{ background: '#f1f5f9', color: '#475569', padding: '1px 5px', borderRadius: 4, marginRight: 4 }}>
                {v}{varLabel(v) ? `(${varLabel(v)})` : ''}
              </code>
            ))}{availableVars.size > 24 ? ' ...' : ''}
          </div>
        </div>
      )}
    </div>
  );
};

function btnStyle(bg: string, color: string, border: string): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
    background: bg, color, border, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
  };
}
const iconBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: '#64748b',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
