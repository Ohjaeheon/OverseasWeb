import api from './api';

export type BoardChartType = 'bar' | 'line' | 'pie';
export type BoardChartGroupBy = 'gubun' | 'jipa' | 'continent';

/** 관리자가 "그래프 관리 > 현황판 그래프 관리"에서 정의하는 그래프 카드 하나. */
export interface BoardChartConfig {
  id: string;
  title: string;
  chartType: BoardChartType;
  /** OVERSEAS_BOARD_CAT(해외선교부 현황판) 컬럼 구성의 id들 — 원본/커스텀 수식 컬럼 모두 참조 가능. */
  metricIds: string[];
  /** 막대/선/원 그래프의 분류(x축) 기준. */
  groupBy: BoardChartGroupBy;
  enabled: boolean;
  order: number;
}

export interface GraphConfigItem {
  graphConfigId: number;
  categoryKey: string;
  graphsJson: string;
  updatedBy: string | null;
  updatedAt: string;
}

/** categoryKey -> 그래프 카드 배열. 설정이 저장되지 않은 카테고리는 키 자체가 없다(빈 목록으로 처리). */
export type EffectiveGraphConfigs = Record<string, BoardChartConfig[]>;

export const graphConfigService = {
  // 사용자 화면용: 저장된 카테고리 설정 전체
  getEffectiveConfigs: async (): Promise<EffectiveGraphConfigs> => {
    const res = await api.get<EffectiveGraphConfigs>('/graph-configs');
    return res.data;
  },

  // 관리자: 저장된 설정 목록(원본)
  getAllConfigs: async (): Promise<GraphConfigItem[]> => {
    const res = await api.get<GraphConfigItem[]>('/admin/graph-configs');
    return res.data;
  },

  // 관리자: 카테고리 그래프 구성 저장
  saveConfig: async (categoryKey: string, graphs: BoardChartConfig[]): Promise<GraphConfigItem> => {
    const res = await api.put<GraphConfigItem>(
      `/admin/graph-configs/${encodeURIComponent(categoryKey)}`,
      graphs
    );
    return res.data;
  },

  // 관리자: 설정 삭제(빈 상태로 되돌림)
  resetConfig: async (categoryKey: string): Promise<void> => {
    await api.delete(`/admin/graph-configs/${encodeURIComponent(categoryKey)}`);
  },
};
