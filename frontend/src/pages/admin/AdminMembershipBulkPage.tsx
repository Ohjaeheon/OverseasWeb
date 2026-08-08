import React, { useEffect, useState, useMemo } from 'react';
import { adminService } from '../../services/adminService';
import {
  Search, RefreshCw, Save, Trash2, ChevronUp, ChevronDown,
  Users, Filter, AlertTriangle, CheckCircle, Edit3, X
} from 'lucide-react';

// 부서 목록
const DEPARTMENTS = ['교역자', '자문회', '장년회', '부녀회', '청년회'];
const ALL_MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

interface MembershipRecord {
  recordId: number;
  churchName: string;
  yearStr: string;
  monthKey: string;
  department: string;
  assemblyAdmit: number | null;
  assemblyAccident: number | null;
  evangIncrease: number | null;
  evangDecrease: number | null;
  attendIncrease: number | null;
  attendDecrease: number | null;
  calculatedEvangReg: number | null;
  updatedBy: string | null;
  updatedAt: string | null;
}

type SortField = 'churchName' | 'monthKey' | 'department' | 'assemblyAdmit' | 'evangIncrease' | 'attendIncrease' | 'calculatedEvangReg';
type SortDir = 'asc' | 'desc';

export const AdminMembershipBulkPage: React.FC = () => {
  const [records, setRecords] = useState<MembershipRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // 필터
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => `${currentYear - i}년`);
  const [selectedYear, setSelectedYear] = useState(`${currentYear}년`);
  const [searchChurch, setSearchChurch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('전체');
  const [selectedDept, setSelectedDept] = useState('전체');

  // 정렬
  const [sortField, setSortField] = useState<SortField>('churchName');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // 인라인 편집
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<MembershipRecord>>({});

  // 선택된 교회 (사이드패널)
  const [selectedChurch, setSelectedChurch] = useState<string | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const data = await adminService.getAllMembershipRecords(selectedYear);
      setRecords(data || []);
    } catch (e: any) {
      showToast('error', '데이터 로딩 실패: ' + (e.message || ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  // 교회 목록
  const churches = useMemo(() => {
    const set = new Set(records.map(r => r.churchName));
    return Array.from(set).sort();
  }, [records]);

  // 필터링 + 정렬
  const filtered = useMemo(() => {
    let arr = [...records];
    if (selectedChurch) arr = arr.filter(r => r.churchName === selectedChurch);
    if (searchChurch) arr = arr.filter(r => r.churchName.includes(searchChurch));
    if (selectedMonth !== '전체') arr = arr.filter(r => r.monthKey === selectedMonth);
    if (selectedDept !== '전체') arr = arr.filter(r => r.department === selectedDept);

    arr.sort((a, b) => {
      const valA = a[sortField] ?? '';
      const valB = b[sortField] ?? '';
      const cmp = String(valA).localeCompare(String(valB), 'ko');
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return arr;
  }, [records, selectedChurch, searchChurch, selectedMonth, selectedDept, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const startEdit = (r: MembershipRecord) => {
    setEditingId(r.recordId);
    setEditValues({ ...r });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const saveEdit = async (recordId: number) => {
    setSaving(recordId);
    try {
      const userStr = localStorage.getItem('user');
      const username = userStr ? JSON.parse(userStr).username || 'admin' : 'admin';
      await adminService.updateMembershipRecord(recordId, { ...editValues, updatedBy: username });
      setRecords(prev => prev.map(r => r.recordId === recordId ? { ...r, ...editValues } as MembershipRecord : r));
      setEditingId(null);
      setEditValues({});
      showToast('success', '저장되었습니다. 전도재적 동기화는 내무 페이지 저장 시 반영됩니다.');
    } catch (e: any) {
      showToast('error', '저장 실패: ' + (e.message || ''));
    } finally {
      setSaving(null);
    }
  };

  const deleteRecord = async (recordId: number, churchName: string, monthKey: string, dept: string) => {
    if (!window.confirm(`[${churchName}] ${monthKey} / ${dept} 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    setDeleting(recordId);
    try {
      await adminService.deleteMembershipRecord(recordId);
      setRecords(prev => prev.filter(r => r.recordId !== recordId));
      showToast('success', '삭제되었습니다.');
    } catch (e: any) {
      showToast('error', '삭제 실패: ' + (e.message || ''));
    } finally {
      setDeleting(null);
    }
  };

  const numInput = (field: keyof MembershipRecord, label: string) => (
    <input
      type="number"
      min={0}
      value={editValues[field] as number ?? 0}
      onChange={e => setEditValues(prev => ({ ...prev, [field]: parseInt(e.target.value) || 0 }))}
      title={label}
      style={{
        width: '52px', padding: '3px 5px', fontSize: '0.78rem',
        background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981',
        borderRadius: '5px', color: '#1f2a44', textAlign: 'center', fontWeight: 700
      }}
    />
  );

  const SortIcon = ({ field }: { field: SortField }) => (
    sortField === field
      ? (sortDir === 'asc' ? <ChevronUp size={12} style={{ display: 'inline', marginLeft: 2 }} /> : <ChevronDown size={12} style={{ display: 'inline', marginLeft: 2 }} />)
      : null
  );

  // 요약 통계
  const stats = useMemo(() => {
    const total = filtered.length;
    const totalAssemblyAdmit = filtered.reduce((s, r) => s + (r.assemblyAdmit || 0), 0);
    const totalEvangIncrease = filtered.reduce((s, r) => s + (r.evangIncrease || 0), 0);
    const totalEvangDecrease = filtered.reduce((s, r) => s + (r.evangDecrease || 0), 0);
    const totalCalcReg = filtered.reduce((s, r) => s + (r.calculatedEvangReg || 0), 0);
    return { total, totalAssemblyAdmit, totalEvangIncrease, totalEvangDecrease, totalCalcReg };
  }, [filtered]);

  return (
    <div style={{ fontFamily: '"Pretendard", "Malgun Gothic", sans-serif' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 80, right: 24, zIndex: 9999,
          background: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white', padding: '10px 20px', borderRadius: '10px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)', fontSize: '0.9rem', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* 헤더 */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1f2a44', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Users size={24} color="#10b981" /> 내무 데이터 전체관리
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
          전체 국가/교회의 월별 내무(회별재적·전도재적·출결재적) 데이터를 일괄 조회·수정·삭제합니다.
          수정한 데이터는 <strong>내무 현황 페이지</strong>에 즉시 반영됩니다.
        </p>
      </div>

      {/* 요약 카드 */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {[
          { label: '조회된 레코드', value: stats.total + '건', color: '#2563eb', bg: '#eff6ff' },
          { label: '입교 합계', value: stats.totalAssemblyAdmit, color: '#7c3aed', bg: '#f5f3ff' },
          { label: '전도재적 증가', value: stats.totalEvangIncrease, color: '#16a34a', bg: '#f0fdf4' },
          { label: '전도재적 감소', value: stats.totalEvangDecrease, color: '#dc2626', bg: '#fef2f2' },
          { label: '계산된 전도재적', value: stats.totalCalcReg, color: '#d97706', bg: '#fffbeb' },
        ].map((s, i) => (
          <div key={i} style={{
            padding: '12px 18px', background: s.bg, borderRadius: '10px',
            border: `1px solid ${s.color}22`, minWidth: '130px'
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: s.color, marginBottom: '4px' }}>{s.label}</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* 필터 툴바 */}
      <div style={{
        background: 'white', borderRadius: '12px', padding: '16px 20px',
        boxShadow: '0 1px 6px rgba(20,40,90,0.06)', marginBottom: '16px',
        display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center'
      }}>
        {/* 연도 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>연도</span>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.88rem', color: '#1f2a44', fontWeight: 600, background: 'white' }}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* 월 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Filter size={15} color="#94a3b8" />
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.88rem', color: '#1f2a44', fontWeight: 600, background: 'white' }}
          >
            <option value="전체">전체 월</option>
            {ALL_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* 교회 검색 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: '180px' }}>
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="교회/지역 검색..."
            value={searchChurch}
            onChange={e => setSearchChurch(e.target.value)}
            style={{ flex: 1, padding: '7px 10px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.88rem', color: '#1f2a44', background: 'white' }}
          />
        </div>

        {/* 부서 */}
        <select
          value={selectedDept}
          onChange={e => setSelectedDept(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.88rem', color: '#1f2a44', fontWeight: 600, background: 'white' }}
        >
          <option value="전체">전체 부서</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <button
          onClick={fetchRecords}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: '#10b981', color: 'white', border: 'none',
            borderRadius: '8px', padding: '8px 16px', fontSize: '0.87rem',
            fontWeight: 700, cursor: 'pointer'
          }}
        >
          <RefreshCw size={15} /> 새로고침
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        {/* 사이드 교회 목록 */}
        <div style={{
          width: '200px', flexShrink: 0, background: 'white', borderRadius: '12px',
          boxShadow: '0 1px 6px rgba(20,40,90,0.06)', overflow: 'hidden'
        }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', fontSize: '0.78rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            교회 목록 ({churches.length})
          </div>
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <div
              onClick={() => setSelectedChurch(null)}
              style={{
                padding: '9px 14px', cursor: 'pointer', fontSize: '0.83rem', fontWeight: selectedChurch === null ? 700 : 500,
                color: selectedChurch === null ? '#10b981' : '#374151',
                background: selectedChurch === null ? '#f0fdf4' : 'transparent',
                borderLeft: selectedChurch === null ? '3px solid #10b981' : '3px solid transparent'
              }}
            >
              🌍 전체 보기
            </div>
            {churches.map(c => (
              <div
                key={c}
                onClick={() => setSelectedChurch(c === selectedChurch ? null : c)}
                style={{
                  padding: '9px 14px', cursor: 'pointer', fontSize: '0.83rem', fontWeight: selectedChurch === c ? 700 : 400,
                  color: selectedChurch === c ? '#10b981' : '#374151',
                  background: selectedChurch === c ? '#f0fdf4' : 'transparent',
                  borderLeft: selectedChurch === c ? '3px solid #10b981' : '3px solid transparent',
                  borderBottom: '1px solid #f8fafc',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                }}
              >
                {c}
              </div>
            ))}
          </div>
        </div>

        {/* 메인 테이블 */}
        <div style={{ flex: 1, background: 'white', borderRadius: '12px', boxShadow: '0 1px 6px rgba(20,40,90,0.06)', overflow: 'hidden' }}>
          {/* 결과 카운트 */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.83rem', color: '#64748b', fontWeight: 600 }}>
              총 <strong style={{ color: '#10b981' }}>{filtered.length}</strong>건 / 전체 {records.length}건
            </span>
            {editingId && (
              <span style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Edit3 size={13} /> 편집 모드 활성
              </span>
            )}
          </div>

          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '0.95rem' }}>
              ⏳ 데이터 로딩 중...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
              📭 데이터가 없습니다.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    {[
                      { label: '교회/지역', field: 'churchName' as SortField, w: '130px' },
                      { label: '월', field: 'monthKey' as SortField, w: '65px' },
                      { label: '부서', field: 'department' as SortField, w: '70px' },
                      { label: '입교', field: 'assemblyAdmit' as SortField, w: '55px' },
                      { label: '사고', field: 'assemblyAdmit' as SortField, w: '55px', noSort: true },
                      { label: '전도+', field: 'evangIncrease' as SortField, w: '55px' },
                      { label: '전도-', field: 'evangIncrease' as SortField, w: '55px', noSort: true },
                      { label: '출결+', field: 'attendIncrease' as SortField, w: '55px' },
                      { label: '출결-', field: 'attendIncrease' as SortField, w: '55px', noSort: true },
                      { label: '계산재적', field: 'calculatedEvangReg' as SortField, w: '75px' },
                      { label: '최종수정', field: 'churchName' as SortField, w: '80px', noSort: true },
                      { label: '작업', field: 'churchName' as SortField, w: '80px', noSort: true },
                    ].map((col, i) => (
                      <th
                        key={i}
                        onClick={() => !(col as any).noSort && handleSort(col.field)}
                        style={{
                          padding: '10px 8px', textAlign: 'center', fontWeight: 700,
                          color: '#475569', fontSize: '0.75rem', whiteSpace: 'nowrap',
                          cursor: (col as any).noSort ? 'default' : 'pointer',
                          width: col.w, minWidth: col.w,
                          userSelect: 'none'
                        }}
                      >
                        {col.label}
                        {!(col as any).noSort && <SortIcon field={col.field} />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, idx) => {
                    const isEditing = editingId === r.recordId;
                    const rowBg = idx % 2 === 0 ? 'white' : '#fafafa';
                    return (
                      <tr key={r.recordId} style={{ background: isEditing ? '#f0fdf4' : rowBg, borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                        {/* 교회 */}
                        <td style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: '#1f2a44', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.churchName}
                        </td>
                        {/* 월 */}
                        <td style={{ padding: '8px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{r.monthKey}</td>
                        {/* 부서 */}
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <span style={{
                            padding: '2px 7px', borderRadius: '6px', fontSize: '0.73rem', fontWeight: 700,
                            background: r.department === '장년회' ? '#dbeafe' : r.department === '청년회' ? '#d1fae5' : r.department === '부녀회' ? '#fce7f3' : '#f3f4f6',
                            color: r.department === '장년회' ? '#1d4ed8' : r.department === '청년회' ? '#065f46' : r.department === '부녀회' ? '#9d174d' : '#374151'
                          }}>
                            {r.department}
                          </span>
                        </td>
                        {/* 입교 */}
                        <td style={{ padding: '8px', textAlign: 'center', color: '#7c3aed', fontWeight: 700 }}>
                          {isEditing ? numInput('assemblyAdmit', '입교') : (r.assemblyAdmit ?? '-')}
                        </td>
                        {/* 사고 */}
                        <td style={{ padding: '8px', textAlign: 'center', color: '#dc2626' }}>
                          {isEditing ? numInput('assemblyAccident', '사고') : (r.assemblyAccident ?? '-')}
                        </td>
                        {/* 전도재적 증가 */}
                        <td style={{ padding: '8px', textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>
                          {isEditing ? numInput('evangIncrease', '전도재적 증가') : (r.evangIncrease ?? '-')}
                        </td>
                        {/* 전도재적 감소 */}
                        <td style={{ padding: '8px', textAlign: 'center', color: '#dc2626' }}>
                          {isEditing ? numInput('evangDecrease', '전도재적 감소') : (r.evangDecrease ?? '-')}
                        </td>
                        {/* 출결재적 증가 */}
                        <td style={{ padding: '8px', textAlign: 'center', color: '#0891b2' }}>
                          {isEditing ? numInput('attendIncrease', '출결재적 증가') : (r.attendIncrease ?? '-')}
                        </td>
                        {/* 출결재적 감소 */}
                        <td style={{ padding: '8px', textAlign: 'center', color: '#dc2626' }}>
                          {isEditing ? numInput('attendDecrease', '출결재적 감소') : (r.attendDecrease ?? '-')}
                        </td>
                        {/* 계산된 전도재적 */}
                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700, color: '#d97706', background: 'rgba(251,191,36,0.05)' }}>
                          {r.calculatedEvangReg ?? '-'}
                        </td>
                        {/* 최종수정자 */}
                        <td style={{ padding: '8px', textAlign: 'center', color: '#94a3b8', fontSize: '0.72rem' }}>
                          {r.updatedBy || '-'}
                        </td>
                        {/* 작업 버튼 */}
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                              <button
                                onClick={() => saveEdit(r.recordId)}
                                disabled={saving === r.recordId}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '3px',
                                  background: '#10b981', color: 'white', border: 'none',
                                  borderRadius: '6px', padding: '4px 8px', fontSize: '0.73rem',
                                  fontWeight: 700, cursor: 'pointer'
                                }}
                              >
                                {saving === r.recordId ? '...' : <><Save size={11} /> 저장</>}
                              </button>
                              <button
                                onClick={cancelEdit}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '3px',
                                  background: '#64748b', color: 'white', border: 'none',
                                  borderRadius: '6px', padding: '4px 8px', fontSize: '0.73rem',
                                  fontWeight: 700, cursor: 'pointer'
                                }}
                              >
                                <X size={11} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                              <button
                                onClick={() => startEdit(r)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '3px',
                                  background: '#10b981', color: 'white', border: 'none',
                                  borderRadius: '6px', padding: '4px 8px', fontSize: '0.73rem',
                                  fontWeight: 700, cursor: 'pointer'
                                }}
                              >
                                <Edit3 size={11} /> 수정
                              </button>
                              <button
                                onClick={() => deleteRecord(r.recordId, r.churchName, r.monthKey, r.department)}
                                disabled={deleting === r.recordId}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '3px',
                                  background: '#ef4444', color: 'white', border: 'none',
                                  borderRadius: '6px', padding: '4px 8px', fontSize: '0.73rem',
                                  fontWeight: 700, cursor: 'pointer'
                                }}
                              >
                                {deleting === r.recordId ? '...' : <Trash2 size={11} />}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 안내 박스 */}
      <div style={{
        marginTop: '20px', padding: '14px 18px', background: '#f0fdf4',
        border: '1px solid #86efac', borderRadius: '10px',
        fontSize: '0.82rem', color: '#166534', lineHeight: 1.6
      }}>
        <strong>💡 안내:</strong> 수정한 데이터는 즉시 DB에 반영되며,{' '}
        <strong>내무 현황 페이지 (/membership/check)</strong>에 실시간으로 반영됩니다.{' '}
        <strong>계산된 전도재적</strong>은 [지난달 재적 + 증가 - 감소]로 자동 계산되며,
        이 값이 전도 주간 데이터의 재적 수에도 동기화됩니다.
      </div>
    </div>
  );
};
