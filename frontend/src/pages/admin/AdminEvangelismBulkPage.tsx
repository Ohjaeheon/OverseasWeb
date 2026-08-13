import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { adminService } from '../../services/adminService';
import { diagnosisService } from '../../services/diagnosisService';
import defaultChurchesData from '../../assets/defaultChurches.json';
import api from '../../services/api';
import {
  RefreshCw, Save, Edit3, X, AlertTriangle, CheckCircle,
  Globe, ChevronLeft, ChevronRight, Download
} from 'lucide-react';

// ─── 상수 ─────────────────────────────────────────────────────────────────────
const DEPARTMENTS = ['교역자', '자문회', '장년회', '부녀회', '청년회'];

// 주차 배열 생성 (미래 주차 자동 제외, 2999년까지 대응)
const buildWeeks = (yearStr: string): { weekKey: string; rangeStr: string }[] => {
  const yearNum = parseInt(yearStr.replace(/[^0-9]/g, '')) || new Date().getFullYear();
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const currentYear = new Date().getFullYear();

  // 아직 도달하지 않은 미래 연도의 경우 주차가 나오지 않음 (해당 시점이 되면 자동 노출)
  if (yearNum > currentYear) {
    return [];
  }

  const d = new Date(yearNum - 1, 11, 25);
  while (d.getDay() !== 0) d.setDate(d.getDate() - 1);

  const weeks: { weekKey: string; rangeStr: string }[] = [];
  const monthWeekCounts: Record<number, number> = {};

  for (let i = 0; i < 54; i++) {
    const start = new Date(d);
    const end = new Date(d);
    end.setDate(end.getDate() + 6);
    const startYear = start.getFullYear();
    const m = start.getMonth() + 1;
    if (startYear > yearNum) break;

    if (startYear === yearNum) {
      monthWeekCounts[m] = (monthWeekCounts[m] || 0) + 1;
      const weekNum = monthWeekCounts[m];

      // 현재 연도인 경우: 시작 주차가 오늘 날짜 기준 미래인 주차는 노출하지 않음
      if (yearNum === currentYear) {
        const s = new Date(start); s.setHours(0, 0, 0, 0);
        if (s > today) {
          d.setDate(d.getDate() + 7);
          continue;
        }
      }

      weeks.push({
        weekKey: `${m}월${weekNum}주차`,
        rangeStr: `${m}/${start.getDate()} ~ ${end.getMonth() + 1}/${end.getDate()}`
      });
    }
    d.setDate(d.getDate() + 7);
  }
  return weeks;
};

const getCurrentWeekKey = (yearStr: string): string => {
  const weeks = buildWeeks(yearStr);
  if (weeks.length === 0) return '';
  const today = new Date();
  const yearNum = parseInt(yearStr.replace(/[^0-9]/g, ''));
  if (today.getFullYear() !== yearNum) return weeks[weeks.length - 1]?.weekKey || '';

  const d = new Date(yearNum - 1, 11, 25);
  while (d.getDay() !== 0) d.setDate(d.getDate() - 1);
  const monthWeekCounts: Record<number, number> = {};
  for (let i = 0; i < 54; i++) {
    const start = new Date(d);
    const end = new Date(d);
    end.setDate(end.getDate() + 6);
    const startYear = start.getFullYear();
    const m = start.getMonth() + 1;
    if (startYear > yearNum) break;
    if (startYear === yearNum) {
      monthWeekCounts[m] = (monthWeekCounts[m] || 0) + 1;
      const weekNum = monthWeekCounts[m];
      const s = new Date(start); s.setHours(0, 0, 0, 0);
      const e = new Date(end); e.setHours(23, 59, 59, 999);
      if (today >= s && today <= e) return `${m}월${weekNum}주차`;
    }
    d.setDate(d.getDate() + 7);
  }
  return weeks[weeks.length - 1]?.weekKey || '';
};

// ─── 타입 ─────────────────────────────────────────────────────────────────────
interface ChurchInfo {
  churchId?: number;
  name: string;
  country: string;
  jipa: string;
  continent: string;
  gubun: string;
  sortOrder?: number;
}

// 부서별 입력값 (편집용)
interface DeptValues {
  recordId?: number;      // DB에 있는 경우 ID
  reg: number;
  find: number;
  findDrop: number;
  gospel: number;
  gospelDrop: number;
  admit: number;
  admitDrop: number;
  updatedBy?: string;
}

const emptyDept = (): DeptValues => ({
  reg: 0, find: 0, findDrop: 0,
  gospel: 0, gospelDrop: 0,
  admit: 0, admitDrop: 0
});

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────
export const AdminEvangelismBulkPage: React.FC = () => {
  const currentYear = new Date().getFullYear();
  // 2025년부터 2999년까지 지원하도록 연도 목록 구성
  const years = useMemo(() => {
    const arr: string[] = [];
    const maxVal = Math.min(2999, Math.max(currentYear, 2025));
    for (let y = maxVal; y >= 2025; y--) {
      arr.push(`${y}년`);
    }
    return arr;
  }, [currentYear]);

  const [selectedYear, setSelectedYear] = useState(`${currentYear}년`);
  const weeks = useMemo(() => buildWeeks(selectedYear), [selectedYear]);
  const [selectedWeek, setSelectedWeek] = useState(() => getCurrentWeekKey(`${currentYear}년`));

  // 교회 목록 (faith-records 기반)
  const [allChurches, setAllChurches] = useState<ChurchInfo[]>([]);
  // DB 레코드 (선택 주차 전체)
  const [dbRecords, setDbRecords] = useState<any[]>([]);

  const [loadingChurches, setLoadingChurches] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // 편집 상태 관리: churchName → dept → DeptValues
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Record<string, Record<string, DeptValues>>>({});

  // 저장 중
  const [saving, setSaving] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // 좌측 교회 필터
  const [sideFilter, setSideFilter] = useState<string | null>(null); // null = 전체

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  // ── 교회 목록 로드 ────────────────────────────────────────────────────────
  const loadChurches = useCallback(async () => {
    setLoadingChurches(true);
    // 본부/해선부 및 미노출/조직도전용 항목 데이터 페이지 제외 헬퍼
    const isHq = (c: any) => c.continent === '본부' || c.jipa === '본부' || c.name === '해선부' || c.isExposed === false || c.isOrgOnly === true;
    try {
      const data = await diagnosisService.getChurches();
      let list: ChurchInfo[] = [];
      if (data && data.length > 0) {
        list = data
          .filter((c: any) => !isHq(c))
          .map((c: any) => ({
            churchId: c.churchId,
            name: c.name,
            country: c.country || '',
            jipa: c.jipa || '',
            continent: c.continent || '',
            gubun: c.gubun || '',
            sortOrder: c.sortOrder,
          }));
      }
      if (list.length === 0) {
        (defaultChurchesData as any[])
          .filter((c: any) => !isHq(c))
          .forEach((c: any) => {
            list.push({
              name: c.name, country: c.country || '', jipa: c.jipa || '',
              continent: c.continent || '', gubun: c.gubun || '', sortOrder: c.sortOrder
            });
          });
      }
      list.sort((a, b) => {
        const oa = a.sortOrder ?? 999999;
        const ob = b.sortOrder ?? 999999;
        if (oa !== ob) return oa - ob;
        return a.name.localeCompare(b.name, 'ko');
      });
      setAllChurches(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingChurches(false);
    }
  }, []);

  // ── DB 레코드 로드 (선택 연도 + 주차) ────────────────────────────────────
  const loadRecords = useCallback(async () => {
    if (!selectedWeek) return;
    setLoadingRecords(true);
    try {
      const res = await api.get<any>(`/evangelism/records?year=${encodeURIComponent(selectedYear)}&week=${encodeURIComponent(selectedWeek)}`);
      let list: any[] = [];
      if (Array.isArray(res.data)) {
        list = res.data;
      } else if (res.data && Array.isArray((res.data as any).records)) {
        list = (res.data as any).records;
      }
      const filtered = list.filter((r: any) =>
        r.weekKey === selectedWeek ||
        (r.weekKey && r.weekKey.replace(/\s+/g, '') === selectedWeek.replace(/\s+/g, ''))
      );
      setDbRecords(filtered);
    } catch (e) {
      console.error('Failed to load evangelism records:', e);
      setDbRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  }, [selectedYear, selectedWeek]);

  useEffect(() => { loadChurches(); }, [loadChurches]);
  useEffect(() => { loadRecords(); }, [loadRecords]);

  // 연도 변경 시 주차 초기화
  useEffect(() => {
    const w = getCurrentWeekKey(selectedYear);
    setSelectedWeek(w || buildWeeks(selectedYear)[0]?.weekKey || '');
  }, [selectedYear]);

  // ── DB 데이터 → 편집 초기값 빌드 ─────────────────────────────────────────
  const buildEditData = useCallback(() => {
    const map: Record<string, Record<string, DeptValues>> = {};
    allChurches.forEach(c => {
      map[c.name] = {};
      DEPARTMENTS.forEach(dept => {
        const rec = dbRecords.find(r => r.churchName === c.name && r.department === dept);
        if (rec) {
          let dynamicVals: Record<string, number> = {};
          if (rec.dynamicData) {
            try { dynamicVals = JSON.parse(rec.dynamicData); } catch { /* ignore */ }
          }
          map[c.name][dept] = {
            recordId: rec.recordId,
            reg: rec.regCount ?? 0,
            find: dynamicVals.find !== undefined ? dynamicVals.find : (rec.findCount ?? 0),
            findDrop: dynamicVals.findDrop !== undefined ? dynamicVals.findDrop : (rec.findDropCount ?? 0),
            gospel: dynamicVals.gospel !== undefined ? dynamicVals.gospel : (rec.gospelCount ?? 0),
            gospelDrop: dynamicVals.gospelDrop !== undefined ? dynamicVals.gospelDrop : (rec.gospelDropCount ?? 0),
            admit: dynamicVals.admit !== undefined ? dynamicVals.admit : (rec.admitCount ?? 0),
            admitDrop: dynamicVals.admitDrop !== undefined ? dynamicVals.admitDrop : (rec.admitDropCount ?? 0),
            updatedBy: rec.updatedBy,
          };
        } else {
          map[c.name][dept] = emptyDept();
        }
      });
    });
    return map;
  }, [allChurches, dbRecords]);

  // 데이터/교회 로드 완료 시 editData 초기화
  useEffect(() => {
    setEditData(buildEditData());
    setEditMode(false);
  }, [buildEditData]);

  // ── 수정 모드 진입 ────────────────────────────────────────────────────────
  const handleEnterEdit = () => {
    setEditData(buildEditData());
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditData(buildEditData());
    setEditMode(false);
  };

  // ── 일괄 저장 ─────────────────────────────────────────────────────────────
  const handleSaveAll = async () => {
    if (!selectedWeek) { showToast('error', '주차를 선택해주세요.'); return; }
    setSaving(true);
    const userStr = localStorage.getItem('user');
    const username = userStr ? (JSON.parse(userStr).username || 'admin') : 'admin';

    try {
      // 모든 교회 × 모든 부서의 데이터를 POST /evangelism/records (batch)
      const records: any[] = [];
      allChurches.forEach(church => {
        DEPARTMENTS.forEach(dept => {
          const v = editData[church.name]?.[dept];
          if (!v) return;
          records.push({
            churchName: church.name,
            yearStr: selectedYear,
            weekKey: selectedWeek,
            department: dept,
            regCount: v.reg,
            findCount: v.find,
            findDropCount: v.findDrop,
            gospelCount: v.gospel,
            gospelDropCount: v.gospelDrop,
            admitCount: v.admit,
            admitDropCount: v.admitDrop,
            dynamicData: JSON.stringify({
              find: v.find, findDrop: v.findDrop,
              gospel: v.gospel, gospelDrop: v.gospelDrop,
              admit: v.admit, admitDrop: v.admitDrop,
            }),
            updatedBy: username,
          });
        });
      });

      await api.post('/evangelism/records', records);
      await loadRecords();
      setEditMode(false);
      showToast('success', `${records.length}건 저장 완료 — 전도 현황 페이지에 즉시 반영됩니다.`);
    } catch (e: any) {
      showToast('error', '저장 실패: ' + (e.message || ''));
    } finally {
      setSaving(false);
    }
  };

  // ── 필드 변경 핸들러 ──────────────────────────────────────────────────────
  const handleChange = (churchName: string, dept: string, field: keyof DeptValues, val: number) => {
    setEditData(prev => ({
      ...prev,
      [churchName]: {
        ...prev[churchName],
        [dept]: { ...prev[churchName]?.[dept], [field]: val }
      }
    }));
  };

  // ── 표시할 교회 목록 (사이드 필터 적용) ───────────────────────────────────
  const visibleChurches = useMemo(() =>
    sideFilter ? allChurches.filter(c => c.name === sideFilter) : allChurches,
    [allChurches, sideFilter]
  );

  // ── 엑셀 추출 (CSV UTF-8 BOM 다운로드) ───────────────────────────────────
  const handleExportExcel = () => {
    if (visibleChurches.length === 0) {
      showToast('error', '다운로드할 데이터가 없습니다.');
      return;
    }

    const headers = [
      '교회명', '대륙', '국가', '지파', '구분',
      '부서(회)', '전도재적', '찾기', '찾기탈락',
      '복음방', '복음방탈락', '개강', '개강탈락', '최종수정자'
    ];

    const rows: string[][] = [];

    visibleChurches.forEach(church => {
      DEPARTMENTS.forEach(dept => {
        const d = editData[church.name]?.[dept];
        rows.push([
          church.name,
          church.continent || '',
          church.country || '',
          church.jipa || '',
          church.gubun || '',
          dept,
          String(d?.reg ?? 0),
          String(d?.find ?? 0),
          String(d?.findDrop ?? 0),
          String(d?.gospel ?? 0),
          String(d?.gospelDrop ?? 0),
          String(d?.admit ?? 0),
          String(d?.admitDrop ?? 0),
          d?.updatedBy || ''
        ]);
      });
    });

    const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
    const csvContent = '\uFEFF' + [
      headers.map(escapeCsv).join(','),
      ...rows.map(row => row.map(escapeCsv).join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fileName = `전도가개강_실적_전체관리_${selectedYear}_${selectedWeek}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('success', `${fileName} 엑셀 다운로드가 완료되었습니다.`);
  };

  // 주차 네비게이션
  const weekIdx = weeks.findIndex(w => w.weekKey === selectedWeek);
  const goPrev = () => { if (weekIdx > 0) setSelectedWeek(weeks[weekIdx - 1].weekKey); };
  const goNext = () => { if (weekIdx < weeks.length - 1) setSelectedWeek(weeks[weekIdx + 1].weekKey); };

  // DB 데이터 존재 여부 확인
  const hasData = (churchName: string) =>
    dbRecords.some(r => r.churchName === churchName && r.weekKey === selectedWeek);

  // ─── 렌더 ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: '"Pretendard", "Malgun Gothic", sans-serif', minHeight: '100vh' }}>
      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: 80, right: 24, zIndex: 9999,
          background: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white', padding: '12px 22px', borderRadius: '10px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)', fontSize: '0.9rem', fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: '8px',
          animation: 'slideIn 0.2s ease'
        }}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* ── 헤더 ── */}
      <div style={{ marginBottom: '18px' }}>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1f2a44', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Globe size={22} color="#2563eb" /> 전도 가개강 데이터 전체관리
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.84rem', margin: 0 }}>
          전체 교회·지역·개척지의 주차별 전도 실적을 일괄 조회·수정합니다. 저장 시 <strong>/evangelism/check</strong>에 즉시 반영됩니다.
        </p>
      </div>

      {/* ── 필터 바 ── */}
      <div style={{
        background: 'white', borderRadius: '12px', padding: '14px 20px',
        boxShadow: '0 1px 6px rgba(20,40,90,0.07)', marginBottom: '14px',
        display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center'
      }}>
        {/* 연도 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>연도</span>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            style={selectStyle}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* 주차 네비게이션 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>주차</span>
          <button onClick={goPrev} disabled={weekIdx <= 0} style={navBtnStyle(weekIdx <= 0)}>
            <ChevronLeft size={15} />
          </button>
          <select
            value={selectedWeek}
            onChange={e => setSelectedWeek(e.target.value)}
            style={{ ...selectStyle, minWidth: '120px', fontWeight: 700, color: '#2563eb' }}
          >
            {weeks.map(w => (
              <option key={w.weekKey} value={w.weekKey}>{w.weekKey} ({w.rangeStr})</option>
            ))}
          </select>
          <button onClick={goNext} disabled={weekIdx >= weeks.length - 1} style={navBtnStyle(weekIdx >= weeks.length - 1)}>
            <ChevronRight size={15} />
          </button>
        </div>

        <div style={{ flex: 1 }} />

        {/* 엑셀 다운로드 */}
        <button
          onClick={handleExportExcel}
          style={{ ...btnStyle('#059669'), padding: '8px 14px' }}
          title="현재 화면의 데이터를 엑셀(CSV) 파일로 다운로드합니다"
        >
          <Download size={14} /> 엑셀 다운로드
        </button>

        {/* 새로고침 */}
        <button
          onClick={() => { loadRecords(); }}
          disabled={loadingRecords}
          style={{ ...btnStyle('#64748b'), padding: '8px 14px' }}
        >
          <RefreshCw size={14} style={{ animation: loadingRecords ? 'spin 1s linear infinite' : 'none' }} />
          새로고침
        </button>

        {/* 수정 / 저장 / 취소 */}
        {!editMode ? (
          <button onClick={handleEnterEdit} style={{ ...btnStyle('#2563eb'), padding: '8px 18px' }}>
            <Edit3 size={14} /> 수정 모드
          </button>
        ) : (
          <>
            <button onClick={handleCancelEdit} style={{ ...btnStyle('#64748b'), padding: '8px 14px' }}>
              <X size={14} /> 취소
            </button>
            <button onClick={handleSaveAll} disabled={saving} style={{ ...btnStyle('#10b981'), padding: '8px 18px' }}>
              {saving ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> 저장 중...</> : <><Save size={14} /> 전체 저장</>}
            </button>
          </>
        )}
      </div>

      {/* ── 메인 레이아웃: 사이드 + 테이블 ── */}
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>

        {/* ── 사이드 교회 목록 ── */}
        <div style={{
          width: '190px', flexShrink: 0, background: 'white', borderRadius: '12px',
          boxShadow: '0 1px 6px rgba(20,40,90,0.07)', overflow: 'hidden',
          position: 'sticky', top: '80px'
        }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', fontSize: '0.74rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            교회 목록 ({allChurches.length})
          </div>
          <div style={{ maxHeight: 'calc(100vh - 230px)', overflowY: 'auto' }}>
            <div
              onClick={() => setSideFilter(null)}
              style={sideItemStyle(sideFilter === null, '#2563eb')}
            >
              🌍 전체 보기
            </div>
            {loadingChurches ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem' }}>로딩 중...</div>
            ) : allChurches.map(c => (
              <div
                key={c.name}
                onClick={() => setSideFilter(c.name === sideFilter ? null : c.name)}
                style={{
                  ...sideItemStyle(sideFilter === c.name, '#2563eb'),
                  position: 'relative'
                }}
                title={`${c.jipa} · ${c.country}`}
              >
                {hasData(c.name) && (
                  <span style={{
                    position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                    width: '6px', height: '6px', borderRadius: '50%', background: '#10b981'
                  }} />
                )}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', paddingRight: '14px' }}>
                  {c.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 메인 테이블 영역 ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* 편집 모드 안내 배너 */}
          {editMode && (
            <div style={{
              background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '10px',
              padding: '10px 16px', marginBottom: '12px',
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '0.83rem', fontWeight: 600, color: '#92400e'
            }}>
              <Edit3 size={15} />
              수정 모드 활성 — 수치를 수정 후 <strong>전체 저장</strong> 버튼을 눌러 일괄 저장하세요.
            </div>
          )}

          {loadingRecords ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '0.95rem', background: 'white', borderRadius: '12px', boxShadow: '0 1px 6px rgba(20,40,90,0.07)' }}>
              ⏳ 데이터 로딩 중...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {visibleChurches.map(church => (
                <ChurchTable
                  key={church.name}
                  church={church}
                  editMode={editMode}
                  editData={editData[church.name] || {}}
                  onChange={(dept, field, val) => handleChange(church.name, dept, field, val)}
                  hasDbData={hasData(church.name)}
                />
              ))}
              {visibleChurches.length === 0 && (
                <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', background: 'white', borderRadius: '12px' }}>
                  교회 데이터가 없습니다.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 안내 ── */}
      <div style={{
        marginTop: '20px', padding: '12px 18px', background: '#fefce8',
        border: '1px solid #fde68a', borderRadius: '10px',
        fontSize: '0.8rem', color: '#854d0e', lineHeight: 1.6
      }}>
        <strong>⚠️ 안내:</strong> 전체 저장 시 <strong>데이터가 입력되지 않은 교회(0값)</strong>도 함께 저장됩니다.
        사이드바의 <span style={{ background: '#10b981', borderRadius: '50%', display: 'inline-block', width: '8px', height: '8px' }} /> 초록 점은 해당 주차에 이미 데이터가 입력된 교회를 표시합니다.
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        .no-spin-input::-webkit-inner-spin-button,
        .no-spin-input::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .no-spin-input {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
};

// ─── 교회 테이블 서브컴포넌트 ──────────────────────────────────────────────────
interface ChurchTableProps {
  church: ChurchInfo;
  editMode: boolean;
  editData: Record<string, DeptValues>;
  onChange: (dept: string, field: keyof DeptValues, val: number) => void;
  hasDbData: boolean;
}

const ChurchTable: React.FC<ChurchTableProps> = ({ church, editMode, editData, onChange, hasDbData }) => {
  const thStyle: React.CSSProperties = {
    padding: '8px 10px',
    background: '#f1f5f9',
    fontWeight: 700,
    fontSize: '0.74rem',
    color: '#475569',
    textAlign: 'center',
    borderBottom: '2px solid #e2e8f0',
    whiteSpace: 'nowrap',
  };

  const tdCenter: React.CSSProperties = {
    padding: '0',
    textAlign: 'center',
    verticalAlign: 'middle',
  };

  const numCell = (dept: string, field: keyof DeptValues, color: string, readOnlyField = false) => {
    const val = editData[dept]?.[field] as number ?? 0;
    if (editMode && !readOnlyField) {
      return (
        <td style={tdCenter}>
          <input
            type="number"
            min={0}
            className="no-spin-input"
            value={val}
            onFocus={e => e.currentTarget.select()}
            onClick={e => e.currentTarget.select()}
            onChange={e => onChange(dept, field, parseInt(e.target.value) || 0)}
            style={{
              width: '56px', padding: '5px 4px',
              border: '1.5px solid #93c5fd',
              borderRadius: '6px',
              color, fontWeight: 700, fontSize: '0.85rem',
              textAlign: 'center', background: '#eff6ff',
              outline: 'none',
              margin: '3px',
              MozAppearance: 'textfield',
            }}
          />
        </td>
      );
    }
    return (
      <td
        style={{
          ...tdCenter,
          padding: '9px 8px',
          fontWeight: val > 0 ? 700 : 400,
          color: '#64748b',
          fontSize: '0.88rem',
          background: '#f8fafc',
          cursor: 'default',
          userSelect: 'text',
        }}
        title="전도재적은 내무(Membership) 연동 수치로 직접 수정할 수 없습니다."
      >
        {val > 0 ? val : '—'}
      </td>
    );
  };

  return (
    <div style={{
      background: 'white', borderRadius: '12px',
      boxShadow: '0 1px 6px rgba(20,40,90,0.07)',
      overflow: 'hidden',
      border: hasDbData ? '1.5px solid #bbf7d0' : '1.5px solid #e2e8f0',
    }}>
      {/* 교회명 헤더 */}
      <div style={{
        padding: '10px 16px',
        background: hasDbData ? 'linear-gradient(90deg, #f0fdf4, #ffffff)' : 'linear-gradient(90deg, #f8fafc, #ffffff)',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex', alignItems: 'center', gap: '10px'
      }}>
        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1f2a44' }}>
          {church.name}
        </span>
        <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>
          {church.continent && `${church.continent} ·`} {church.country} · {church.jipa} · {church.gubun}
        </span>
        {hasDbData && (
          <span style={{
            marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 700,
            background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: '6px'
          }}>
            ✓ 데이터 있음
          </span>
        )}
        {!hasDbData && (
          <span style={{
            marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 600,
            background: '#f1f5f9', color: '#94a3b8', padding: '2px 8px', borderRadius: '6px'
          }}>
            미입력
          </span>
        )}
      </div>

      {/* 테이블 */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '80px', textAlign: 'left', paddingLeft: '16px' }}>회</th>
              <th style={{ ...thStyle, width: '100px', color: '#64748b', background: '#f8fafc' }} title="전도재적은 내무(Membership) 연동 수치로 직접 수정할 수 없습니다">전도재적 (수정불가)</th>
              <th style={{ ...thStyle, width: '70px', color: '#2563eb' }}>찾기</th>
              <th style={{ ...thStyle, width: '60px', color: '#dc2626' }}>탈락</th>
              <th style={{ ...thStyle, width: '70px', color: '#7c3aed' }}>복음방</th>
              <th style={{ ...thStyle, width: '60px', color: '#dc2626' }}>탈락</th>
              <th style={{ ...thStyle, width: '70px', color: '#16a34a' }}>개강</th>
              <th style={{ ...thStyle, width: '60px', color: '#dc2626' }}>탈락</th>
              <th style={{ ...thStyle, width: '90px', color: '#94a3b8' }}>최종수정자</th>
            </tr>
          </thead>
          <tbody>
            {DEPARTMENTS.map((dept, idx) => {
              const d = editData[dept];
              const isEven = idx % 2 === 0;
              return (
                <tr
                  key={dept}
                  style={{
                    background: isEven ? 'white' : '#fafbfc',
                    borderBottom: idx < DEPARTMENTS.length - 1 ? '1px solid #f1f5f9' : 'none',
                    transition: 'background 0.1s'
                  }}
                >
                  {/* 부서명 */}
                  <td style={{ padding: '4px 8px 4px 16px', fontWeight: 700, fontSize: '0.82rem', color: '#374151', whiteSpace: 'nowrap' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: '5px', fontSize: '0.74rem',
                      background: dept === '장년회' ? '#dbeafe' : dept === '청년회' ? '#d1fae5' : dept === '부녀회' ? '#fce7f3' : dept === '자문회' ? '#fef3c7' : '#f3f4f6',
                      color: dept === '장년회' ? '#1d4ed8' : dept === '청년회' ? '#065f46' : dept === '부녀회' ? '#9d174d' : dept === '자문회' ? '#92400e' : '#374151',
                    }}>
                      {dept}
                    </span>
                  </td>
                  {numCell(dept, 'reg', '#64748b', true)}
                  {numCell(dept, 'find', '#2563eb')}
                  {numCell(dept, 'findDrop', '#dc2626')}
                  {numCell(dept, 'gospel', '#7c3aed')}
                  {numCell(dept, 'gospelDrop', '#dc2626')}
                  {numCell(dept, 'admit', '#16a34a')}
                  {numCell(dept, 'admitDrop', '#dc2626')}
                  {/* 최종수정자 */}
                  <td style={{ ...tdCenter, padding: '9px 8px', color: '#94a3b8', fontSize: '0.74rem' }}>
                    {d?.updatedBy || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── 스타일 헬퍼 ──────────────────────────────────────────────────────────────
const selectStyle: React.CSSProperties = {
  padding: '7px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0',
  fontSize: '0.88rem', color: '#1f2a44', fontWeight: 600, background: 'white',
  cursor: 'pointer', outline: 'none',
};

const btnStyle = (color: string): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: '6px',
  background: color, color: 'white', border: 'none',
  borderRadius: '8px', fontSize: '0.86rem', fontWeight: 700, cursor: 'pointer',
  padding: '8px 16px',
});

const navBtnStyle = (disabled: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '30px', height: '30px', borderRadius: '7px',
  background: disabled ? '#f1f5f9' : 'white',
  border: '1.5px solid #e2e8f0', cursor: disabled ? 'not-allowed' : 'pointer',
  color: disabled ? '#cbd5e1' : '#374151',
});

const sideItemStyle = (active: boolean, color: string): React.CSSProperties => ({
  padding: '8px 14px', cursor: 'pointer', fontSize: '0.82rem',
  fontWeight: active ? 700 : 400,
  color: active ? color : '#374151',
  background: active ? (color === '#2563eb' ? '#eff6ff' : '#f0fdf4') : 'transparent',
  borderLeft: active ? `3px solid ${color}` : '3px solid transparent',
  borderBottom: '1px solid #f8fafc',
  transition: 'all 0.12s',
  position: 'relative',
});
