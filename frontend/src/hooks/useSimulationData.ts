import { useState, useEffect, useCallback } from 'react';
import {
  CENTERS, STATIC_DATA, YearStaticData,
  calcGrowthRate, calcRegisteredFromRate
} from '../data/simulationData';
import simulationService, {
  SimBaseRegistered, SimMonthlyData, ChartSettings, DEFAULT_CHART_SETTINGS
} from '../services/simulationService';

export interface CenterMonthValue {
  registered: number | null;
  regCount: number | null;
  gradCount: number | null;
  growthRate: number | null;
  regRate: number | null;
  gradRate: number | null;
  isForecast: boolean;
}

/** 연도별 로드된 데이터 구조 */
export interface YearData {
  base: Record<string, number>;          // 기준 재적
  baseSettings: Record<string, SimBaseRegistered>; // 기준 재적 설정 (DB)
  monthly: Record<string, Record<number, CenterMonthValue>>; // center → month(1~12) → values
  actualMonths: number;                  // 실적 데이터가 있는 월 수
}

export function useSimulationData(initialYear: number = 2026) {
  const [year, setYear] = useState(initialYear);
  const [yearData, setYearData] = useState<YearData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [chartSettings, setChartSettingsState] = useState<ChartSettings>({ ...DEFAULT_CHART_SETTINGS });

  // 차트 설정 DB에서 로드 (최초 1회)
  useEffect(() => {
    simulationService.getChartSettings().then(s => setChartSettingsState(s));
  }, []);

  const loadYear = useCallback(async (y: number) => {
    setLoading(true);
    try {
      const staticBundle = STATIC_DATA[y];
      const [dbBase, dbMonthly] = await Promise.all([
        simulationService.getBase(y),
        simulationService.getMonthly(y),
      ]);

      // 기준 재적 결정
      const baseMap: Record<string, number> = {};
      const baseSettings: Record<string, SimBaseRegistered> = {};

      CENTERS.forEach(c => {
        const dbEntry = dbBase.find(b => b.centerName === c);
        if (dbEntry) {
          baseSettings[c] = dbEntry;
          baseMap[c] = dbEntry.baseRegistered;
        } else if (staticBundle?.base[c] != null) {
          // 2026은 정적 데이터 사용
          baseMap[c] = staticBundle.base[c];
        } else {
          baseMap[c] = 0;
        }
      });

      // 월별 데이터 빌드
      const monthly: Record<string, Record<number, CenterMonthValue>> = {};
      CENTERS.forEach(c => {
        monthly[c] = {};
        const baseVal = baseMap[c] || 0;
        
        // 1. 먼저 1~12월 기본 객체 생성
        for (let m = 1; m <= 12; m++) {
          monthly[c][m] = {
            registered: null,
            regCount: null,
            gradCount: null,
            growthRate: null,
            regRate: null,
            gradRate: null,
            isForecast: m > (staticBundle?.actualMonths ?? 0),
          };
        }

        // 2. 1~6월 실적 데이터 채우기 (정적 번들)
        if (staticBundle) {
          for (let m = 1; m <= staticBundle.actualMonths; m++) {
            const staticIdx = m - 1;
            const reg = staticBundle.registered[c]?.[staticIdx] ?? null;
            const regCount = staticBundle.reg[c]?.[staticIdx] ?? null;
            const gradCount = staticBundle.grad[c]?.[staticIdx] ?? null;
            const gRate = reg !== null ? parseFloat(calcGrowthRate(reg, baseVal).toFixed(2)) : null;

            monthly[c][m] = {
              registered: reg,
              regCount,
              gradCount,
              growthRate: gRate,
              regRate: reg !== null && regCount !== null ? parseFloat(((regCount / reg) * 100).toFixed(2)) : null,
              gradRate: reg !== null && gradCount !== null ? parseFloat(((gradCount / reg) * 100).toFixed(2)) : null,
              isForecast: false,
            };
          }
        }

        // 3. DB 저장된 데이터 적용 (우선순위)
        dbMonthly.filter(d => d.centerName === c).forEach(dbEntry => {
          const m = dbEntry.monthNum;
          if (m >= 1 && m <= 12) {
            monthly[c][m] = {
              registered: dbEntry.registered ?? monthly[c][m]?.registered ?? null,
              regCount: dbEntry.regCount ?? monthly[c][m]?.regCount ?? null,
              gradCount: dbEntry.gradCount ?? monthly[c][m]?.gradCount ?? null,
              growthRate: dbEntry.growthRate ?? monthly[c][m]?.growthRate ?? null,
              regRate: dbEntry.regRate ?? monthly[c][m]?.regRate ?? null,
              gradRate: dbEntry.gradRate ?? monthly[c][m]?.gradRate ?? null,
              isForecast: dbEntry.isForecast ?? (m > (staticBundle?.actualMonths ?? 0)),
            };
          }
        });
      });

      setYearData({
        base: baseMap,
        baseSettings,
        monthly,
        actualMonths: staticBundle?.actualMonths ?? 0,
      });
    } catch (e) {
      console.error('데이터 로드 실패', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadYear(year); }, [year, loadYear]);

  const handleYearChange = (y: number) => { setYear(y); };

  /** 월별 예상값 (성장율 → 재적수) 가져오기 */
  const getEstimatedRegistered = (center: string, month: number, yearDat: YearData): number | null => {
    const val = yearDat.monthly[center]?.[month];
    if (!val) return null;
    if (val.registered !== null) return val.registered;
    if (val.growthRate !== null) {
      return calcRegisteredFromRate(yearDat.base[center] ?? 0, val.growthRate);
    }
    return null;
  };

  /** 배치 저장 (월별 데이터) */
  const saveBatch = useCallback(async (items: SimMonthlyData[]) => {
    setSaving(true); setSaveMsg('');
    try {
      await simulationService.saveMonthlyBatch(items);
      await loadYear(year);
      setSaveMsg('저장 완료!');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch {
      setSaveMsg('저장 실패');
    } finally { setSaving(false); }
  }, [year, loadYear]);

  /** 기준 재적 배치 저장 */
  const saveBase = useCallback(async (items: SimBaseRegistered[]) => {
    setSaving(true); setSaveMsg('');
    try {
      await simulationService.saveBaseBatch(items);
      await loadYear(year);
      setSaveMsg('기준 재적 저장 완료!');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch {
      setSaveMsg('저장 실패');
    } finally { setSaving(false); }
  }, [year, loadYear]);

  const updateChartSettings = (s: ChartSettings) => {
    setChartSettingsState(s);
    simulationService.saveChartSettings(s);
  };

  const getDisplayCenters = () => {
    if (!chartSettings.selectedCenters.length) return CENTERS;
    return CENTERS.filter(c => chartSettings.selectedCenters.includes(c));
  };

  return {
    year, yearData, loading, saving, saveMsg,
    chartSettings, setChartSettings: updateChartSettings,
    handleYearChange, saveBatch, saveBase,
    getEstimatedRegistered, getDisplayCenters,
    reload: () => loadYear(year),
  };
}
