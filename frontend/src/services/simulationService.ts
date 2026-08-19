import api from './api';

// ── 기준 재적 ──────────────────────────────────────
export interface SimBaseRegistered {
  simYear: number;
  centerName: string;
  baseRegistered: number;
  usePrevAuto: boolean;
  updatedAt?: string;
}

// ── 월별 데이터 ────────────────────────────────────
export interface SimMonthlyData {
  id?: number;
  simYear: number;
  centerName: string;
  monthNum: number;         // 1~12
  registered?: number | null;
  regCount?: number | null;
  gradCount?: number | null;
  growthRate?: number | null;
  regRate?: number | null;
  gradRate?: number | null;
  isForecast?: boolean;
  note?: string;
  updatedAt?: string;
}

// ── 차트 설정 (LocalStorage) ──────────────────────
export interface ChartSettings {
  selectedCenters: string[];
  chartType: 'bar' | 'line' | 'area';
  showTotal: boolean;
  highlightTopN: number;
}

export const DEFAULT_CHART_SETTINGS: ChartSettings = {
  selectedCenters: [],
  chartType: 'bar',
  showTotal: true,
  highlightTopN: 3,
};

const CHART_SETTINGS_DB_KEY = 'default';

const simulationService = {
  // ── 기준 재적 ─────────────────────────────────────
  async getBase(year: number): Promise<SimBaseRegistered[]> {
    const res = await api.get(`/simulation/base?year=${year}`);
    return res.data || [];
  },

  async saveBaseBatch(items: SimBaseRegistered[]): Promise<void> {
    await api.post('/simulation/base/batch', items);
  },

  // ── 월별 데이터 ────────────────────────────────────
  async getMonthly(year: number): Promise<SimMonthlyData[]> {
    const res = await api.get(`/simulation/monthly?year=${year}`);
    return res.data || [];
  },

  async saveMonthlyBatch(items: SimMonthlyData[]): Promise<{ saved: number }> {
    const res = await api.post('/simulation/monthly/batch', items);
    return res.data;
  },

  // ── 차트 설정 (DB 저장) ───────────────────────────
  async getChartSettings(key: string = CHART_SETTINGS_DB_KEY): Promise<ChartSettings> {
    try {
      const res = await api.get(`/simulation/chart-settings?key=${key}`);
      const raw = res.data?.settingsValue;
      if (raw) {
        return { ...DEFAULT_CHART_SETTINGS, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.warn('차트 설정 로드 실패, 기본값 사용', e);
    }
    return { ...DEFAULT_CHART_SETTINGS };
  },

  async saveChartSettings(settings: ChartSettings, key: string = CHART_SETTINGS_DB_KEY): Promise<void> {
    try {
      await api.post('/simulation/chart-settings', {
        key,
        settingsValue: JSON.stringify(settings),
      });
    } catch (e) {
      console.error('차트 설정 저장 실패', e);
    }
  },
};

export default simulationService;
