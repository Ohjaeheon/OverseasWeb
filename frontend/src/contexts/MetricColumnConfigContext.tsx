import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { metricColumnConfigService, EffectiveMetricColumnConfigs } from '../services/metricColumnConfigService';
import { ColumnConfigEntry, CustomColumnConfig, mergeColumnConfig } from '../utils/metricColumnEval';
import { CATS, MetricDef } from '../utils/diagnosisMetrics';

interface MetricColumnConfigContextValue {
  loading: boolean;
  /** 카테고리의 최종 컬럼 배열(기본값 + 관리자 설정 병합) */
  getColumnsFor: (category: string) => MetricDef[];
  /** 카테고리의 custom(수식) 컬럼만 — 값 계산용 */
  getCustomColsFor: (category: string) => CustomColumnConfig[];
  refetch: () => void;
}

const MetricColumnConfigContext = createContext<MetricColumnConfigContextValue | null>(null);

export const MetricColumnConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [configs, setConfigs] = useState<EffectiveMetricColumnConfigs>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    metricColumnConfigService.getEffectiveConfigs()
      .then(setConfigs)
      .catch((e) => { console.warn('상세표 컬럼 설정 조회 실패, 기본값으로 표시합니다.', e); setConfigs({}); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const getColumnsFor = useCallback((category: string): MetricDef[] => {
    const defaultCols = CATS[category] || [];
    return mergeColumnConfig(defaultCols, configs[category]);
  }, [configs]);

  const getCustomColsFor = useCallback((category: string): CustomColumnConfig[] => {
    const entries: ColumnConfigEntry[] = configs[category] || [];
    return entries.filter((e): e is CustomColumnConfig => e.kind === 'custom' && e.enabled);
  }, [configs]);

  return (
    <MetricColumnConfigContext.Provider value={{ loading, getColumnsFor, getCustomColsFor, refetch: load }}>
      {children}
    </MetricColumnConfigContext.Provider>
  );
};

export function useMetricColumnConfig(): MetricColumnConfigContextValue {
  const ctx = useContext(MetricColumnConfigContext);
  if (!ctx) throw new Error('useMetricColumnConfig는 MetricColumnConfigProvider 내부에서만 사용할 수 있습니다.');
  return ctx;
}
