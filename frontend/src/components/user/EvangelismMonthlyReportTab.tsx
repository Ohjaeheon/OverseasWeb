import React, { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import { adminService } from '../../services/adminService';
import { Edit3, Save, X, Info, Lock, Send } from 'lucide-react';

const DEPARTMENTS = ['교역자', '자문회', '장년회', '부녀회', '청년회'];

interface ActivityRow {
  id: number;
  churchName: string;
  yearStr: string;
  monthKey: string;
  department: string;
  activeMemberCount: number | null;
  teacherCount: number | null;
}

interface DeptValues {
  activeMemberCount: number;
  teacherCount: number;
}

function getMonthNum(monthKey: string): number {
  const m = monthKey.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function currentUsername(): string {
  try {
    const u = localStorage.getItem('user');
    return u ? (JSON.parse(u).username || 'admin') : 'admin';
  } catch {
    return 'admin';
  }
}

function pctLabel(numerator: number, denominator: number): string {
  if (!denominator) return '-';
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

export const EvangelismMonthlyReportTab: React.FC<{ selectedChurch: string; evangRegByDept: Record<string, number> }> = ({ selectedChurch, evangRegByDept }) => {
  const nowYear = new Date().getFullYear();
  const nowMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(`${nowYear}년`);
  const [selectedMonth, setSelectedMonth] = useState(`${nowMonth}월`);
  const [yearRows, setYearRows] = useState<ActivityRow[]>([]);
  const [prevYearRows, setPrevYearRows] = useState<ActivityRow[]>([]);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [draftValues, setDraftValues] = useState<Record<string, DeptValues>>({});
  const [saving, setSaving] = useState(false);

  const [hasEditPermission, setHasEditPermission] = useState(false);
  const [adminUsers, setAdminUsers] = useState<{ username: string; name: string; role: string }[]>([]);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [requestAdminUser, setRequestAdminUser] = useState('');

  const years: string[] = [];
  for (let y = nowYear; y >= 2025; y--) years.push(`${y}년`);

  const selectedYearNum = parseInt(selectedYear.replace(/[^0-9]/g, ''), 10) || nowYear;
  const monthsLimit = selectedYearNum < nowYear ? 12 : nowMonth;
  const months = Array.from({ length: monthsLimit }, (_, i) => `${i + 1}월`);

  useEffect(() => {
    if (!months.includes(selectedMonth)) setSelectedMonth(months[months.length - 1] || '1월');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  const isCurrentMonth = selectedYear === `${nowYear}년` && selectedMonth === `${nowMonth}월`;
  const isEditable = isCurrentMonth || hasEditPermission;
  const selectedMonthNum = getMonthNum(selectedMonth);

  // 승인 요청 대상 담당자 목록(관리자/해외선교부 담당자) 로드
  useEffect(() => {
    adminService.getUsers().then((users: any[]) => {
      const admins = users.filter((u) => u.role === 'ROLE_USER' || u.role === 'ROLE_ADMIN');
      setAdminUsers(admins);
      if (admins.length > 0) setRequestAdminUser(admins[0].name);
    }).catch(() => {
      setAdminUsers([{ username: 'admin', name: '최고 관리자', role: 'ROLE_ADMIN' }]);
      setRequestAdminUser('최고 관리자');
    });
  }, []);

  // 잠긴(이번 달이 아닌) 월에 대해 승인된 수정 요청이 있는지 확인
  const checkAccessPermission = useCallback(async () => {
    if (!selectedChurch) return;
    try {
      const res = await api.get('/evangelism/monthly-activity/edit-requests/check', { params: { church: selectedChurch, year: selectedYear, month: selectedMonth } });
      setHasEditPermission(res.data?.hasAccess || false);
    } catch {
      setHasEditPermission(false);
    }
  }, [selectedChurch, selectedYear, selectedMonth]);

  useEffect(() => { checkAccessPermission(); }, [checkAccessPermission]);
  useEffect(() => {
    const handler = () => checkAccessPermission();
    window.addEventListener('refreshEditRequests', handler);
    return () => window.removeEventListener('refreshEditRequests', handler);
  }, [checkAccessPermission]);

  const sendUnlockRequest = async () => {
    if (!requestReason.trim()) {
      alert('수정 요청 사유를 입력해 주세요.');
      return;
    }
    try {
      await api.post('/evangelism/monthly-activity/edit-requests', {
        churchName: selectedChurch,
        yearStr: selectedYear,
        monthKey: selectedMonth,
        reason: requestReason,
        requestedBy: currentUsername(),
        requestedTo: requestAdminUser,
      });
      alert(`[${selectedYear} ${selectedMonth}] 데이터 수정 요청이 ${requestAdminUser} 담당자에게 성공적으로 전송되었습니다!\n승인 후 해당 월 수정이 활성화됩니다.`);
      setIsRequestModalOpen(false);
      setRequestReason('');
      window.dispatchEvent(new Event('refreshEditRequests'));
    } catch (e) {
      console.error('Failed to send monthly report unlock request', e);
      alert('요청 전송 중 오류가 발생했습니다.');
    }
  };

  const load = useCallback(async () => {
    if (!selectedChurch) return;
    setLoading(true);
    try {
      const prevYearStr = `${selectedYearNum - 1}년`;
      const [res, prevRes, noticeRes] = await Promise.all([
        api.get<ActivityRow[]>('/evangelism/monthly-activity', { params: { church: selectedChurch, year: selectedYear } }),
        api.get<ActivityRow[]>('/evangelism/monthly-activity', { params: { church: selectedChurch, year: prevYearStr } }).catch(() => ({ data: [] as ActivityRow[] })),
        api.get<{ value: string }>('/evangelism/config/monthly-report-notice').catch(() => ({ data: { value: '' } })),
      ]);
      setYearRows(res.data || []);
      setPrevYearRows(prevRes.data || []);
      setNotice(noticeRes.data?.value || '');
    } catch (e) {
      console.error('Failed to load evangelism monthly report', e);
    } finally {
      setLoading(false);
      setIsEditMode(false);
    }
  }, [selectedChurch, selectedYear, selectedYearNum]);

  useEffect(() => { load(); }, [load]);

  const findRow = (rows: ActivityRow[], monthKey: string, dept: string) =>
    rows.find((r) => r.monthKey === monthKey && r.department === dept);

  // 표시값 = 선택한 달 저장값이 있으면 그것, 없으면 전달(1월이면 전년도 12월) 저장값(캐리오버), 그것도 없으면 0.
  const displayFor = (dept: string): DeptValues => {
    const cur = findRow(yearRows, selectedMonth, dept);
    if (cur) return { activeMemberCount: cur.activeMemberCount || 0, teacherCount: cur.teacherCount || 0 };
    if (selectedMonthNum > 1) {
      const prev = findRow(yearRows, `${selectedMonthNum - 1}월`, dept);
      if (prev) return { activeMemberCount: prev.activeMemberCount || 0, teacherCount: prev.teacherCount || 0 };
    } else {
      const prevDec = findRow(prevYearRows, '12월', dept);
      if (prevDec) return { activeMemberCount: prevDec.activeMemberCount || 0, teacherCount: prevDec.teacherCount || 0 };
    }
    return { activeMemberCount: 0, teacherCount: 0 };
  };

  const enterEditMode = () => {
    const draft: Record<string, DeptValues> = {};
    DEPARTMENTS.forEach((dept) => { draft[dept] = displayFor(dept); });
    setDraftValues(draft);
    setIsEditMode(true);
  };

  const cancelEdit = () => setIsEditMode(false);

  const save = async () => {
    const overLimit = DEPARTMENTS.filter((dept) => (draftValues[dept]?.activeMemberCount || 0) > (evangRegByDept[dept] || 0));
    if (overLimit.length > 0) {
      alert(`활동자수가 전도재적보다 많은 부서가 있어 저장할 수 없습니다: ${overLimit.join(', ')}`);
      return;
    }
    setSaving(true);
    try {
      await api.post('/evangelism/monthly-activity/save', {
        church: selectedChurch,
        yearStr: selectedYear,
        monthKey: selectedMonth,
        items: DEPARTMENTS.map((dept) => ({
          department: dept,
          activeMemberCount: draftValues[dept]?.activeMemberCount || 0,
          teacherCount: draftValues[dept]?.teacherCount || 0,
        })),
        updatedBy: currentUsername(),
      });
      await load();
    } catch (e) {
      console.error('Failed to save evangelism monthly report', e);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const selectStyle: React.CSSProperties = {
    border: 'none', background: 'transparent', fontWeight: 800, color: '#2563eb', fontSize: '0.9rem', outline: 'none', cursor: 'pointer',
  };
  const numberInputStyle: React.CSSProperties = {
    width: '90px', padding: '6px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', textAlign: 'center', outline: 'none',
  };

  const totals = DEPARTMENTS.reduce((acc, dept) => {
    const v = isEditMode ? (draftValues[dept] || { activeMemberCount: 0, teacherCount: 0 }) : displayFor(dept);
    acc.evangReg += evangRegByDept[dept] || 0;
    acc.activeMemberCount += v.activeMemberCount || 0;
    acc.teacherCount += v.teacherCount || 0;
    return acc;
  }, { evangReg: 0, activeMemberCount: 0, teacherCount: 0 });

  return (
    <div>
      {/* 설명 박스 (관리자가 /adminsetting/messages에서 DESC_EVANGELISM_MONTHLY_REPORT_NOTICE로 설정) */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '14px', padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <Info size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.88rem', color: '#1e3a8a', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {notice || '월간보고 작성 안내가 아직 등록되지 않았습니다. (관리자: /adminsetting/messages에서 DESC_EVANGELISM_MONTHLY_REPORT_NOTICE 키로 등록)'}
        </div>
      </div>

      {/* 연/월 선택 + 수정 컨트롤 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '10px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>연도</span>
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={selectStyle}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '6px 14px', borderRadius: '10px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#166534' }}>월</span>
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{ ...selectStyle, color: '#16a34a' }}>
              {months.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {!isCurrentMonth && (
            <span style={{ fontSize: '0.8rem', color: hasEditPermission ? '#16a34a' : '#94a3b8', fontWeight: 600 }}>
              {hasEditPermission
                ? '✅ 수정 요청이 승인되어 이 달만 임시로 수정할 수 있습니다.'
                : `이전 달 데이터는 조회만 가능합니다 · 이번 달(${nowYear}년 ${nowMonth}월)만 수정 가능`}
            </span>
          )}
        </div>

        {isEditable ? (
          !isEditMode ? (
            <button
              onClick={enterEditMode}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '10px', border: 'none', background: '#2563eb', color: '#ffffff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}
            >
              <Edit3 size={16} /> 수정
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={save}
                disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '10px', border: 'none', background: '#16a34a', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
              >
                <Save size={16} /> {saving ? '저장 중...' : '저장'}
              </button>
              <button
                onClick={cancelEdit}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                <X size={16} /> 취소
              </button>
            </div>
          )
        ) : (
          <button
            onClick={() => setIsRequestModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#ffffff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}
          >
            <Lock size={16} /> 수정 요청(결재)
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>불러오는 중...</div>
      ) : (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'center' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1', color: '#334155' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800 }}>회</th>
                  <th style={{ padding: '12px 14px', fontWeight: 800 }}>전도재적</th>
                  <th style={{ padding: '12px 14px', fontWeight: 800, background: '#f0fdf4', color: '#166534' }}>활동자수</th>
                  <th style={{ padding: '12px 14px', fontWeight: 800, background: '#f0fdf4', color: '#166534' }}>활동자율</th>
                  <th style={{ padding: '12px 14px', fontWeight: 800, background: '#fffbeb', color: '#92400e' }}>교사수</th>
                  <th style={{ padding: '12px 14px', fontWeight: 800, background: '#fffbeb', color: '#92400e' }}>교사 활동율</th>
                </tr>
              </thead>
              <tbody>
                {DEPARTMENTS.map((dept) => {
                  const evangReg = evangRegByDept[dept] || 0;
                  const v = isEditMode ? (draftValues[dept] || { activeMemberCount: 0, teacherCount: 0 }) : displayFor(dept);
                  return (
                    <tr key={dept} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#0f172a' }}>{dept}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#475569' }}>{evangReg}명</td>
                      <td style={{ padding: '10px 14px', background: '#f7fefb' }}>
                        {isEditMode ? (
                          <input
                            type="number"
                            min={0}
                            value={v.activeMemberCount}
                            onChange={(e) => setDraftValues((prev) => ({ ...prev, [dept]: { ...v, activeMemberCount: Math.max(0, parseInt(e.target.value, 10) || 0) } }))}
                            style={numberInputStyle}
                          />
                        ) : (
                          <span style={{ fontWeight: 700, color: '#16a34a' }}>{v.activeMemberCount}명</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', background: '#f7fefb', fontWeight: 700, color: '#166534' }}>{pctLabel(v.activeMemberCount, evangReg)}</td>
                      <td style={{ padding: '10px 14px', background: '#fffdf5' }}>
                        {isEditMode ? (
                          <input
                            type="number"
                            min={0}
                            value={v.teacherCount}
                            onChange={(e) => setDraftValues((prev) => ({ ...prev, [dept]: { ...v, teacherCount: Math.max(0, parseInt(e.target.value, 10) || 0) } }))}
                            style={numberInputStyle}
                          />
                        ) : (
                          <span style={{ fontWeight: 700, color: '#b45309' }}>{v.teacherCount}명</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', background: '#fffdf5', fontWeight: 700, color: '#92400e' }}>{pctLabel(v.teacherCount, evangReg)}</td>
                    </tr>
                  );
                })}
                <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 900, color: '#0f172a' }}>
                  <td style={{ padding: '14px 16px', textAlign: 'left' }}>합계</td>
                  <td style={{ padding: '14px' }}>{totals.evangReg}명</td>
                  <td style={{ padding: '14px', background: '#eefdf6', color: '#16a34a' }}>{totals.activeMemberCount}명</td>
                  <td style={{ padding: '14px', background: '#eefdf6', color: '#166534' }}>{pctLabel(totals.activeMemberCount, totals.evangReg)}</td>
                  <td style={{ padding: '14px', background: '#fffaf0', color: '#b45309' }}>{totals.teacherCount}명</td>
                  <td style={{ padding: '14px', background: '#fffaf0', color: '#92400e' }}>{pctLabel(totals.teacherCount, totals.evangReg)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isRequestModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px',
        }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '540px', padding: '28px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lock size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>🔒 월간보고 수정 허용 요청</h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '2px 0 0 0' }}>지난 달 데이터 보정을 위해 관리자 및 담당자에게 허용을 요청합니다.</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>요청 대상 월</label>
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '10px 14px', borderRadius: '10px', fontWeight: 800, color: '#2563eb', fontSize: '0.92rem' }}>
                  {selectedYear} {selectedMonth} (잠금 상태)
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                  수정 요청 사유 <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  rows={3}
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="예: 6월 청년회 활동자수 오기입 보정 요청"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>요청 대상 담당자</label>
                <select
                  value={requestAdminUser}
                  onChange={(e) => setRequestAdminUser(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
                >
                  {adminUsers.map((u) => (
                    <option key={u.username} value={u.name}>{u.name} ({u.role === 'ROLE_ADMIN' ? '관리자' : '해선부 담당자'})</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => { setIsRequestModalOpen(false); setRequestReason(''); }}
                style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#475569', padding: '10px 20px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                onClick={sendUnlockRequest}
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Send size={14} /> 요청 전송하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
