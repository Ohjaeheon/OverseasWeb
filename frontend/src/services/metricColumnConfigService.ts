import api from './api';
import { ColumnConfigEntry } from '../utils/metricColumnEval';

export interface MetricColumnConfigItem {
  configId: number;
  categoryKey: string;
  columnsJson: string;
  updatedBy: string | null;
  updatedAt: string;
}

/** categoryKey -> 컬럼 구성. 설정이 저장되지 않은 카테고리는 키 자체가 없다(프론트가 기본값 사용). */
export type EffectiveMetricColumnConfigs = Record<string, ColumnConfigEntry[]>;

export const metricColumnConfigService = {
  // 사용자 화면용: 저장된 카테고리 설정 전체
  getEffectiveConfigs: async (): Promise<EffectiveMetricColumnConfigs> => {
    const res = await api.get<EffectiveMetricColumnConfigs>('/metric-columns');
    return res.data;
  },

  // 관리자: 저장된 설정 목록(원본)
  getAllConfigs: async (): Promise<MetricColumnConfigItem[]> => {
    const res = await api.get<MetricColumnConfigItem[]>('/admin/metric-columns');
    return res.data;
  },

  // 관리자: 카테고리 컬럼 구성 저장
  saveConfig: async (categoryKey: string, columns: ColumnConfigEntry[]): Promise<MetricColumnConfigItem> => {
    const res = await api.put<MetricColumnConfigItem>(
      `/admin/metric-columns/${encodeURIComponent(categoryKey)}`,
      columns
    );
    return res.data;
  },

  // 관리자: 설정 삭제(기본값으로 되돌림)
  resetConfig: async (categoryKey: string): Promise<void> => {
    await api.delete(`/admin/metric-columns/${encodeURIComponent(categoryKey)}`);
  },
};
