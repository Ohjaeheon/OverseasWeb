import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { diagnosisService, DiagnosisRecord } from '../services/diagnosisService';
import { buildCountryContMap } from '../utils/diagnosisMetrics';
import { Lang } from '../utils/diagnosisI18n';

// 지파 고정 색상 팔레트 (EvangelismModule.tsx CHURCH_COLOR_PALETTE와 동일 계열 사용).
const JIPA_COLOR_PALETTE = [
  '#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c',
  '#0891b2', '#d97706', '#db2777', '#65a30d', '#7c3aed',
];

interface WeeklyRecord {
  churchName: string;
  yearStr?: string;
  weekKey: string;
  regCount?: number;
  admitCount?: number;
  gospelCount?: number;
}

function filterByAssignedLocation(records: DiagnosisRecord[]): DiagnosisRecord[] {
  const userStr = localStorage.getItem('user');
  if (!userStr) return records;
  try {
    const u = JSON.parse(userStr);
    const role = u.role || 'ROLE_USER';
    const assignedLocation = u.assignedCountry || '전체';
    if (role === 'ROLE_ADMIN' || role === 'ADMIN' || role === '관리자' || assignedLocation === '전체') {
      return records;
    }
    return records.filter((r) =>
      r.name === assignedLocation ||
      r.country === assignedLocation ||
      `${r.jipa} · ${r.name}` === assignedLocation
    );
  } catch {
    return records;
  }
}

function formatMonth(mStr: string): string {
  if (!mStr) return '2026년 5월';
  if (mStr.includes('년') && mStr.includes('월')) return mStr;
  const match = mStr.match(/^(\d{4})-(\d{2})$/);
  if (match) return `${match[1]}년 ${parseInt(match[2], 10)}월`;
  return mStr;
}

function getMonthFromWeekKey(weekKey: string): string {
  const match = weekKey.match(/^(\d+월)/);
  return match ? match[1] : '';
}
function getMonthNum(mStr: string): number {
  const match = mStr.match(/(\d+)월/);
  return match ? parseInt(match[1], 10) : 0;
}
function getYearNum(str: string): number {
  const match = str.match(/^(\d+)년/);
  return match ? parseInt(match[1], 10) : 2026;
}

/**
 * 전도 주간보고서(/evangelism/records)의 최신 실적을 진단 레코드의 4개 전도 지표
 * (evangReg/bibleMonthReg/bibleCumReg/bibleCurAtt)에 덮어써서 병합한다.
 * Ported 1:1 from DiagnosisPage.tsx의 syncEvangelismDbData().
 */
async function syncEvangelismDbData(rawRecords: DiagnosisRecord[]): Promise<{ syncedRecords: DiagnosisRecord[]; weeklyRecords: WeeklyRecord[] }> {
  try {
    const res = await api.get<WeeklyRecord[]>('/evangelism/records');
    const weeklyRecords = res.data || [];
    if (weeklyRecords.length === 0) {
      return { syncedRecords: rawRecords, weeklyRecords };
    }

    const grouped: Record<string, Record<string, WeeklyRecord[]>> = {};
    weeklyRecords.forEach((r) => {
      const church = r.churchName;
      const monthPart = getMonthFromWeekKey(r.weekKey);
      if (!monthPart) return;
      const yearPart = r.yearStr ? (r.yearStr.endsWith('년') ? r.yearStr : r.yearStr + '년') : '2026년';
      const fullMonth = `${yearPart} ${monthPart}`;
      if (!grouped[church]) grouped[church] = {};
      if (!grouped[church][fullMonth]) grouped[church][fullMonth] = [];
      grouped[church][fullMonth].push(r);
    });

    const updatedRecords = rawRecords.map((rec) => {
      const church = rec.name;
      const m = rec.month;
      const currentYear = getYearNum(m);
      const churchGroup = grouped[church];
      if (!churchGroup) return rec;

      const matchedMonthKey = Object.keys(churchGroup).find((k) => k === m || k.replace(/\s+/g, '') === m.replace(/\s+/g, ''));
      if (!matchedMonthKey) return rec;

      const weeksInMonth = churchGroup[matchedMonthKey];
      const sortedWeeks = [...new Set(weeksInMonth.map((w) => w.weekKey))].sort((a, b) => b.localeCompare(a));
      const lastWeek = sortedWeeks[0];
      const lastWeekRecs = weeksInMonth.filter((w) => w.weekKey === lastWeek);

      const evangRegSum = lastWeekRecs.reduce((sum, w) => sum + (w.regCount || 0), 0);
      const bibleMonthRegSum = weeksInMonth.reduce((sum, w) => sum + (w.admitCount || 0), 0);
      const bibleCurAttSum = lastWeekRecs.reduce((sum, w) => sum + (w.gospelCount || 0), 0);

      const allChurchWeeklyRecs = weeklyRecords.filter((w) => w.churchName === church);
      const limitMonthNum = getMonthNum(matchedMonthKey);
      const bibleCumRegSum = allChurchWeeklyRecs.reduce((sum, w) => {
        const wYear = w.yearStr ? parseInt(w.yearStr.replace(/[^0-9]/g, ''), 10) : 2026;
        if (wYear !== currentYear) return sum;
        const wMonth = getMonthFromWeekKey(w.weekKey);
        if (getMonthNum(wMonth) <= limitMonthNum) return sum + (w.admitCount || 0);
        return sum;
      }, 0);

      return { ...rec, evangReg: evangRegSum, bibleMonthReg: bibleMonthRegSum, bibleCumReg: bibleCumRegSum, bibleCurAtt: bibleCurAttSum };
    });

    return { syncedRecords: updatedRecords, weeklyRecords };
  } catch (err) {
    console.error('Failed to sync database evangelism records', err);
    return { syncedRecords: rawRecords, weeklyRecords: [] };
  }
}

interface DiagnosisChurch { name: string; jipa: string; continent?: string; country?: string; sortOrder?: number; }

interface DiagnosisDataContextValue {
  loading: boolean;
  error: string | null;
  months: string[];
  records: DiagnosisRecord[];
  weeklyRecords: WeeklyRecord[];
  churches: DiagnosisChurch[];
  jipaOrder: string[];
  jipaColors: Record<string, string>;
  countryContMap: Record<string, string>;
  month: string;
  setMonth: (m: string) => void;
  gubun: string;
  setGubun: (g: string) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  refresh: () => void;
}

const DiagnosisDataContext = createContext<DiagnosisDataContextValue | null>(null);

export const DiagnosisDataProvider: React.FC<{ children: React.ReactNode; section?: string }> = ({ children, section = 'home' }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [months, setMonths] = useState<string[]>([]);
  const [records, setRecords] = useState<DiagnosisRecord[]>([]);
  const [weeklyRecords, setWeeklyRecords] = useState<WeeklyRecord[]>([]);
  const [churches, setChurches] = useState<DiagnosisChurch[]>([]);
  // 화면(section)별로 독립적인 기준월을 기억한다 — 홈에서 6월을 보다가 진단서로 이동해도 그대로 6월이 유지되지 않고,
  // 진단서가 마지막으로 선택했던 월을 그대로 이어서 보여준다.
  const [sectionMonths, setSectionMonths] = useState<Record<string, string>>({});
  const storedMonth = sectionMonths[section];
  const month = (storedMonth && months.includes(storedMonth)) ? storedMonth : (months.length ? months[months.length - 1] : '');
  const setMonth = useCallback((m: string) => {
    setSectionMonths((prev) => ({ ...prev, [section]: m }));
  }, [section]);
  const [gubun, setGubun] = useState<string>('전체');
  const [lang, setLang] = useState<Lang>('ko');
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedMonths = await diagnosisService.getMonths();
      const formattedMonths = (fetchedMonths || []).map(formatMonth);
      setMonths(formattedMonths);

      if (formattedMonths.length > 0) {
        const [apiRecords, churchList] = await Promise.all([
          diagnosisService.getRecords('all'),
          diagnosisService.getChurches().catch(() => []),
        ]);
        const filtered = apiRecords ? filterByAssignedLocation(apiRecords) : [];
        const mapped = filtered.map((r) => ({ ...r, month: formatMonth(r.month) }));
        const { syncedRecords, weeklyRecords: weekly } = await syncEvangelismDbData(mapped);

        setRecords(syncedRecords);
        setWeeklyRecords(weekly);
        setChurches(churchList as DiagnosisChurch[]);
      }
    } catch (err) {
      console.error('Failed to load diagnosis data:', err);
      setError('진단 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, reloadKey]);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  // jipaOrder/jipaColors: diagnosisService에 전용 엔드포인트가 없어 교회 목록(getChurches)의
  // jipa 필드에서 유니크 목록을 파생한다 (기존 하드코딩 1개짜리 스텁을 대체).
  const jipaOrder = useMemo(() => {
    const seen: string[] = [];
    churches.forEach((c) => { if (c.jipa && !seen.includes(c.jipa)) seen.push(c.jipa); });
    return seen;
  }, [churches]);

  const jipaColors = useMemo(() => {
    const map: Record<string, string> = {};
    jipaOrder.forEach((j, i) => { map[j] = JIPA_COLOR_PALETTE[i % JIPA_COLOR_PALETTE.length]; });
    return map;
  }, [jipaOrder]);

  const countryContMap = useMemo(() => buildCountryContMap(records), [records]);

  const value: DiagnosisDataContextValue = {
    loading, error, months, records, weeklyRecords, churches, jipaOrder, jipaColors, countryContMap,
    month, setMonth, gubun, setGubun, lang, setLang, refresh,
  };

  return <DiagnosisDataContext.Provider value={value}>{children}</DiagnosisDataContext.Provider>;
};

export function useDiagnosisData(): DiagnosisDataContextValue {
  const ctx = useContext(DiagnosisDataContext);
  if (!ctx) throw new Error('useDiagnosisData must be used within DiagnosisDataProvider');
  return ctx;
}
