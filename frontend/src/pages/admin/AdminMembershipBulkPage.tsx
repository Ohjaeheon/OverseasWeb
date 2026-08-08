import React, { useEffect, useState, useMemo, useCallback } from 'react';
import api from '../../services/api';
import { diagnosisService } from '../../services/diagnosisService';
import defaultChurchesData from '../../assets/defaultChurches.json';
import {
  Search, RefreshCw, Save, Edit3, X, AlertTriangle, CheckCircle,
  Users, Download
} from 'lucide-react';

const DEPARTMENTS = ['교역자', '자문회', '장년회', '부녀회', '청년회'];
const ALL_MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

const isHq = (c: any) =>
  c.name === '총회' || c.name === '맛디아지파' || c.name?.includes('총회') || c.name === '본부';

interface ChurchInfo {
  churchId?: number;
  name: string;
  country: string;
  jipa: string;
  continent: string;
  gubun: string;
  sortOrder?: number;
}

interface DeptValues {
  assemblyAdmit: number;
  assemblyAccident: number;
  calculatedAssemblyReg: number;
  evangIncrease: number;
  evangDecrease: number;
  calculatedEvangReg: number;
  attendIncrease: number;
  attendDecrease: number;
  calculatedAttendReg: number;
  updatedBy?: string;
}

export const AdminMembershipBulkPage: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => `${currentYear - i}년`);
  const [selectedYear, setSelectedYear] = useState(`${currentYear}년`);
  const currentMonthNum = new Date().getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState(`${currentMonthNum}월`);

  const [allChurches, setAllChurches] = useState<ChurchInfo[]>([]);
  const [dbRecords, setDbRecords] = useState<any[]>([]);
  const [loadingChurches, setLoadingChurches] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Record<string, Record<string, DeptValues>>>({});

  const [sideFilter, setSideFilter] = useState<string | null>(null);
  const [searchChurch, setSearchChurch] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  // ── 교회 목록 로드 ──────────────────────────────────────────────────────────
  const loadChurches = useCallback(async () => {
    setLoadingChurches(true);
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
      console.error('Failed to load churches:', e);
    } finally {
      setLoadingChurches(false);
    }
  }, []);

  // ── DB 레코드 로드 (선택 연도 + 월) ────────────────────────────────────────
  const loadRecords = useCallback(async () => {
    if (!selectedMonth) return;
    setLoadingRecords(true);
    try {
      const res = await api.get<any>(`/membership/records?year=${encodeURIComponent(selectedYear)}&month=${encodeURIComponent(selectedMonth)}`);
      let list: any[] = [];
      if (Array.isArray(res.data)) {
        list = res.data;
      } else if (res.data && Array.isArray((res.data as any).records)) {
        list = (res.data as any).records;
      }
      const filtered = list.filter((r: any) => r.monthKey === selectedMonth);
      setDbRecords(filtered);
    } catch (e) {
      console.error('Failed to load membership records:', e);
      setDbRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => { loadChurches(); }, [loadChurches]);
  useEffect(() => { loadRecords(); }, [loadRecords]);

  // ── DB 데이터 → 편집 초기값 빌드 ─────────────────────────────────────────
  const buildEditData = useCallback(() => {
    const map: Record<string, Record<string, DeptValues>> = {};
    allChurches.forEach(c => {
      map[c.name] = {};
      DEPARTMENTS.forEach(dept => {
        const rec = dbRecords.find(r => r.churchName === c.name && r.department === dept);
        map[c.name][dept] = {
          assemblyAdmit: rec?.assemblyAdmit ?? 0,
          assemblyAccident: rec?.assemblyAccident ?? 0,
          calculatedAssemblyReg: rec?.calculatedAssemblyReg ?? 0,
          evangIncrease: rec?.evangIncrease ?? 0,
          evangDecrease: rec?.evangDecrease ?? 0,
          calculatedEvangReg: rec?.calculatedEvangReg ?? 0,
          attendIncrease: rec?.attendIncrease ?? 0,
          attendDecrease: rec?.attendDecrease ?? 0,
          calculatedAttendReg: rec?.calculatedAttendReg ?? 0,
          updatedBy: rec?.updatedBy || undefined,
        };
      });
    });
    setEditData(map);
  }, [allChurches, dbRecords]);

  useEffect(() => {
    buildEditData();
  }, [buildEditData]);

  // ── 수정 모드 시작 / 취소 / 저장 ─────────────────────────────────────────
  const handleEnterEdit = () => {
    buildEditData();
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    buildEditData();
    setEditMode(false);
  };

  const handleSaveAll = async () => {
    if (!selectedMonth) { showToast('error', '월을 선택해주세요.'); return; }
    setSaving(true);
    const userStr = localStorage.getItem('user');
    const username = userStr ? (JSON.parse(userStr).username || 'admin') : 'admin';

    try {
      const records: any[] = [];
      allChurches.forEach(church => {
        DEPARTMENTS.forEach(dept => {
          const v = editData[church.name]?.[dept];
          if (!v) return;
          records.push({
            churchName: church.name,
            yearStr: selectedYear,
            monthKey: selectedMonth,
            department: dept,
            assemblyAdmit: v.assemblyAdmit || 0,
            assemblyAccident: v.assemblyAccident || 0,
            evangIncrease: v.evangIncrease || 0,
            evangDecrease: v.evangDecrease || 0,
            attendIncrease: v.attendIncrease || 0,
            attendDecrease: v.attendDecrease || 0,
            updatedBy: username,
          });
        });
      });

      const res = await api.post('/membership/records', records);
      console.log('Save membership records response:', res);
      
      await loadRecords();
      setEditMode(false);
      showToast('success', `${records.length}건 저장 완료 — 운영 DB 및 내무 현황 페이지에 즉시 반영되었습니다.`);
    } catch (e: any) {
      console.error('Save membership records error:', e);
      showToast('error', '저장 실패: ' + (e.message || '데이터베이스 오류'));
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

  // ── 엑셀 추출 (CSV UTF-8 BOM 다운로드) ───────────────────────────────────
  const handleExportExcel = () => {
    if (visibleChurches.length === 0) {
      showToast('error', '다운로드할 데이터가 없습니다.');
      return;
    }

    const headers = [
      '교회명', '대륙', '국가', '지파', '구분',
      '부서(회)', '입교', '사고', '재적', '전도재적증가', '전도재적감소',
      '계산된전도재적', '출결재적증가', '출결재적감소', '계산된출결재적', '최종수정자'
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
          String(d?.assemblyAdmit ?? 0),
          String(d?.assemblyAccident ?? 0),
          String(d?.calculatedAssemblyReg ?? 0),
          String(d?.evangIncrease ?? 0),
          String(d?.evangDecrease ?? 0),
          String(d?.calculatedEvangReg ?? 0),
          String(d?.attendIncrease ?? 0),
          String(d?.attendDecrease ?? 0),
          String(d?.calculatedAttendReg ?? 0),
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
    const fileName = `내무데이터_전체관리_${selectedYear}_${selectedMonth}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('success', `${fileName} 엑셀 다운로드가 완료되었습니다.`);
  };

  // ── 표시할 교회 목록 (사이드 필터 적용) ───────────────────────────────────
  const visibleChurches = useMemo(() =>
    sideFilter ? allChurches.filter(c => c.name === sideFilter) : allChurches,
    [allChurches, sideFilter]
  );

  // DB 데이터 존재 여부 확인
  const hasData = (churchName: string) =>
    dbRecords.some(r => r.churchName === churchName && r.monthKey === selectedMonth);

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
          <Users size={22} color="#10b981" /> 내무 데이터 전체관리
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.84rem', margin: 0 }}>
          전체 교회·지역·개척지의 월별 내무(입교·사고·전도증감·출결증감) 데이터를 일괄 조회·수정합니다. 저장 시 <strong>/membership/check</strong>에 즉시 반영됩니다.
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

        {/* 월 선택 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>월</span>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            style={{ ...selectStyle, minWidth: '100px', fontWeight: 700, color: '#10b981' }}
          >
            {ALL_MONTHS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
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
          <button onClick={handleEnterEdit} style={{ ...btnStyle('#10b981'), padding: '8px 18px' }}>
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
          width: '210px', flexShrink: 0, background: 'white', borderRadius: '12px',
          boxShadow: '0 1px 6px rgba(20,40,90,0.07)', overflow: 'hidden'
        }}>
          <div style={{
            padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
            fontWeight: 800, fontSize: '0.8rem', color: '#475569',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <span>교회 목록 ({allChurches.length})</span>
            {loadingChurches && <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />}
          </div>

          {/* 검색 박스 */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', background: '#fafbfc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px' }}>
              <Search size={13} color="#94a3b8" />
              <input
                type="text"
                placeholder="교회 검색..."
                value={searchChurch}
                onChange={e => setSearchChurch(e.target.value)}
                style={{ border: 'none', outline: 'none', fontSize: '0.78rem', width: '100%', color: '#1f2a44' }}
              />
            </div>
          </div>

          <div style={{ maxHeight: 'calc(100vh - 270px)', overflowY: 'auto' }}>
            {/* 전체 보기 */}
            <div
              onClick={() => setSideFilter(null)}
              style={{
                padding: '8px 14px', fontSize: '0.81rem', cursor: 'pointer',
                fontWeight: sideFilter === null ? 700 : 500,
                color: sideFilter === null ? '#10b981' : '#475569',
                background: sideFilter === null ? '#f0fdf4' : 'transparent',
                borderLeft: sideFilter === null ? '3px solid #10b981' : '3px solid transparent',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <span>🌐 전체 보기</span>
            </div>

            {allChurches
              .filter(c => !searchChurch || c.name.includes(searchChurch))
              .map(c => {
                const filled = hasData(c.name);
                const isSel = sideFilter === c.name;
                return (
                  <div
                    key={c.name}
                    onClick={() => setSideFilter(isSel ? null : c.name)}
                    style={{
                      padding: '8px 14px', fontSize: '0.8rem', cursor: 'pointer',
                      fontWeight: isSel ? 700 : 400,
                      color: isSel ? '#10b981' : '#334155',
                      background: isSel ? '#f0fdf4' : 'transparent',
                      borderLeft: isSel ? '3px solid #10b981' : '3px solid transparent',
                      borderBottom: '1px solid #fafbfc',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      transition: 'background 0.1s'
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name}
                    </span>
                    <span style={{
                      width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                      background: filled ? '#10b981' : '#cbd5e1'
                    }} title={filled ? '데이터 작성됨' : '미입력'} />
                  </div>
                );
              })}
          </div>
        </div>

        {/* ── 메인 카드/테이블 ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
          {editMode && (
            <div style={{
              background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '10px',
              padding: '10px 16px', fontSize: '0.83rem', color: '#166534', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '8px'
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
        사이드바의 <span style={{ background: '#10b981', borderRadius: '50%', display: 'inline-block', width: '8px', height: '8px' }} /> 초록 점은 해당 월에 이미 데이터가 입력된 교회를 표시합니다.
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
    const isCalcField = field === 'calculatedAssemblyReg' || field === 'calculatedEvangReg' || field === 'calculatedAttendReg';
    const textColor = field === 'calculatedAssemblyReg' ? '#4f46e5' : field === 'calculatedAttendReg' ? '#0284c7' : field === 'calculatedEvangReg' ? '#d97706' : (val > 0 ? color : '#cbd5e1');
    const bgColor = field === 'calculatedAssemblyReg' ? '#f0f3ff' : field === 'calculatedAttendReg' ? '#f0f9ff' : field === 'calculatedEvangReg' ? '#fffbeb' : 'transparent';

    return (
      <td
        style={{
          ...tdCenter,
          padding: '9px 6px',
          fontWeight: val > 0 ? 700 : 400,
          color: isCalcField ? textColor : (val > 0 ? color : '#cbd5e1'),
          fontSize: '0.86rem',
          background: isCalcField ? bgColor : 'transparent',
          cursor: 'default',
          userSelect: 'text',
        }}
        title={readOnlyField ? '자동 계산 수치입니다' : undefined}
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
              <th style={{ ...thStyle, width: '70px', textAlign: 'left', paddingLeft: '14px' }}>회</th>
              <th style={{ ...thStyle, width: '55px', color: '#7c3aed' }}>입교</th>
              <th style={{ ...thStyle, width: '55px', color: '#dc2626' }}>사고</th>
              <th style={{ ...thStyle, width: '75px', color: '#4f46e5', background: '#f0f3ff' }} title="회별 현재재적은 지난달 재적 + 입교 - 사고로 자동 계산됩니다">재적</th>
              <th style={{ ...thStyle, width: '55px', color: '#16a34a' }}>전도+</th>
              <th style={{ ...thStyle, width: '55px', color: '#dc2626' }}>전도-</th>
              <th style={{ ...thStyle, width: '75px', color: '#d97706', background: '#fffbeb' }} title="전도재적은 지난달 전도재적 + 증가 - 감소로 자동 계산됩니다">전도재적</th>
              <th style={{ ...thStyle, width: '55px', color: '#0891b2' }}>출결+</th>
              <th style={{ ...thStyle, width: '55px', color: '#dc2626' }}>출결-</th>
              <th style={{ ...thStyle, width: '75px', color: '#0284c7', background: '#f0f9ff' }} title="출결재적은 지난달 출결재적 + 증가 - 감소로 자동 계산됩니다">출결재적</th>
              <th style={{ ...thStyle, width: '80px', color: '#94a3b8' }}>최종수정자</th>
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
                  {numCell(dept, 'assemblyAdmit', '#7c3aed')}
                  {numCell(dept, 'assemblyAccident', '#dc2626')}
                  {numCell(dept, 'calculatedAssemblyReg', '#4f46e5', true)}
                  {numCell(dept, 'evangIncrease', '#16a34a')}
                  {numCell(dept, 'evangDecrease', '#dc2626')}
                  {numCell(dept, 'calculatedEvangReg', '#d97706', true)}
                  {numCell(dept, 'attendIncrease', '#0891b2')}
                  {numCell(dept, 'attendDecrease', '#dc2626')}
                  {numCell(dept, 'calculatedAttendReg', '#0284c7', true)}
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

// ─── 스타일 도우미 ─────────────────────────────────────────────────────────────
const selectStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: '8px',
  border: '1.5px solid #cbd5e1',
  fontSize: '0.85rem',
  color: '#1f2a44',
  fontWeight: 600,
  background: 'white',
  outline: 'none',
  cursor: 'pointer',
};

const btnStyle = (bg: string): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  background: bg,
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  padding: '8px 16px',
  fontSize: '0.85rem',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'opacity 0.15s, transform 0.1s',
});
