// 관리자가 정의한 "커스텀 컬럼(변수/수식)"을 실제 값으로 계산한다.
// formulaEval.ts의 안전한 수식 평가기를 그대로 재사용하고, 여기서는
// 커스텀 컬럼끼리 서로를 변수로 참조할 수 있도록 의존순서(위상정렬)만 얹는다.
import { evaluateFormula, extractFormulaVariables } from './formulaEval';
import { AggregateResult, MetricDef } from './diagnosisMetrics';

export interface SystemColumnOverride {
  kind: 'system';
  systemId: string; // diagnosisMetrics.ts CATS[cat][].id 참조
  label?: string;
  primary?: boolean;
  /** 인접한 컬럼끼리 표 헤더에서 하나로 묶어 보여줄 그룹명 (예: "재적"). 지정 안 하면 원본 지표의 기본 group을 사용. */
  group?: string;
  /** 진단서 상세보기 모달의 미니 그래프 표시 여부. 지정 안 하면 원본 지표의 기본값(true)을 사용. */
  showChart?: boolean;
  enabled: boolean;
  order: number;
}

export interface CustomColumnConfig {
  kind: 'custom';
  /** 생성 시 한 번 발급되는 불변 식별자 (UI의 React key/식별용). id와 달리 사용자가 수정하지 않는다. */
  uid: string;
  id: string; // 이 컬럼의 고유 키(=변수명). 다른 수식에서 변수명으로 참조 가능하며, 사용자가 편집할 수 있다.
  label: string;
  valueType: 'int' | 'pct';
  primary?: boolean;
  signed?: boolean;
  sourceType: 'raw' | 'formula';
  sourceField?: string; // sourceType === 'raw'일 때 참조할 원본 필드명
  formula?: string;     // sourceType === 'formula'일 때 수식 문자열
  /** sourceType==='raw'일 때만 의미 있음. 켜면 페이지의 연도/월 선택과 무관하게 항상
   * freezeYear년 freezeMonth월의 값을 그대로 가져와 고정 표시한다 — "전도재적처럼 특정
   * 시점에 고정된 값" 컬럼을 만들 때 사용. 조회 중인 월이 바뀌어도 이 값은 바뀌지 않는다. */
  freezeEnabled?: boolean;
  freezeYear?: number;  // 예: 2025
  freezeMonth?: number; // 1-12
  /** 인접한 컬럼끼리 표 헤더에서 하나로 묶어 보여줄 그룹명 (예: "재적"). 없으면 단독 컬럼으로 표시. */
  group?: string;
  /** 진단서 상세보기 모달의 미니 그래프 표시 여부. 기본값 true. */
  showChart?: boolean;
  enabled: boolean;
  order: number;
}

export type ColumnConfigEntry = SystemColumnOverride | CustomColumnConfig;

/**
 * custom 컬럼들을 원본 필드값(agg) + 서로에 대한 의존관계를 반영해 계산한다.
 * 수식이 다른 custom 컬럼의 id를 참조하면 그 컬럼을 먼저 계산해 변수로 채워 넣는다.
 * 순환 참조는 null로 처리한다.
 *
 * @param getFrozenAgg freezeEnabled인 raw 컬럼을 위해, (year, month)에 해당하는 시점의
 *   AggregateResult를 돌려주는 함수. 해당 시점 데이터가 없으면 null. 넘기지 않으면 freeze는 무시되고
 *   항상 현재 agg를 사용한다(하위호환).
 */
export function resolveCustomColumns(
  agg: AggregateResult,
  customCols: CustomColumnConfig[],
  getFrozenAgg?: (year: number, month: number) => AggregateResult | null
): Record<string, number | null> {
  const vars: Record<string, number> = { ...(agg as unknown as Record<string, number>) };
  const result: Record<string, number | null> = {};
  const byId = new Map(customCols.map((c) => [c.id, c]));
  const resolving = new Set<string>();
  const resolved = new Set<string>();

  function resolve(col: CustomColumnConfig): number | null {
    if (resolved.has(col.id)) return result[col.id];
    if (resolving.has(col.id)) {
      result[col.id] = null; // 순환 참조
      resolved.add(col.id);
      return null;
    }
    resolving.add(col.id);

    let value: number | null;
    if (col.sourceType === 'raw') {
      let sourceAgg: AggregateResult | Record<string, number> = agg;
      if (col.freezeEnabled && getFrozenAgg) {
        sourceAgg = getFrozenAgg(col.freezeYear ?? new Date().getFullYear(), col.freezeMonth ?? 12) ?? {};
      }
      const raw = col.sourceField ? (sourceAgg as any)[col.sourceField] : undefined;
      value = (raw == null || Number.isNaN(raw)) ? null : raw;
    } else {
      extractFormulaVariables(col.formula || '').forEach((ref) => {
        const depCol = byId.get(ref);
        if (depCol) resolve(depCol);
      });
      value = evaluateFormula(col.formula || '', vars);
    }

    resolving.delete(col.id);
    resolved.add(col.id);
    result[col.id] = value;
    if (value != null) vars[col.id] = value;
    return value;
  }

  customCols.forEach(resolve);
  return result;
}

/**
 * CATS 기본 컬럼(system) + 관리자 설정(system 재정의 + custom 컬럼)을 합쳐
 * 실제 렌더링에 쓸 최종 MetricDef[]를 만든다. 설정이 없으면 defaultCols를 그대로 반환한다.
 */
export function mergeColumnConfig(
  defaultCols: MetricDef[],
  config: ColumnConfigEntry[] | undefined
): MetricDef[] {
  if (!config || config.length === 0) return defaultCols;

  const defaultById = new Map(defaultCols.map((m) => [m.id, m]));
  const entries: { order: number; def: MetricDef }[] = [];

  config.forEach((entry) => {
    if (entry.kind === 'system') {
      if (!entry.enabled) return;
      const base = defaultById.get(entry.systemId);
      if (!base) return; // 소스에서 이미 제거된 지표를 참조하는 낡은 설정은 무시
      entries.push({
        order: entry.order,
        def: {
          ...base,
          l: entry.label ?? base.l,
          primary: entry.primary ?? base.primary,
          group: entry.group ?? base.group,
          showChart: entry.showChart ?? base.showChart,
        },
      });
    } else {
      if (!entry.enabled) return;
      entries.push({
        order: entry.order,
        def: {
          id: entry.id,
          // custom 컬럼 값은 metricColumnConfigContext가 미리 계산해 row.__customValues에 심어두고,
          // 여기서는 그 값을 조회하는 함수로 감싼다.
          k: (a: AggregateResult) => {
            const customValues = (a as any).__customValues as Record<string, number | null> | undefined;
            return customValues ? (customValues[entry.id] ?? null) : null;
          },
          l: entry.label,
          t: entry.valueType,
          primary: entry.primary,
          signed: entry.signed,
          group: entry.group,
          showChart: entry.showChart,
        },
      });
    }
  });

  return entries.sort((a, b) => a.order - b.order).map((e) => e.def);
}
