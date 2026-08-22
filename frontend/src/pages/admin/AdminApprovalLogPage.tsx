import React, { useState, useEffect } from 'react';
import { ClipboardList, Search, Clock, CheckCircle2, XCircle, ChevronLeft, ChevronRight, X, User, MapPin, Calendar, Info, ArrowRight } from 'lucide-react';
import { approvalLogService, ApprovalLogEntry } from '../../services/approvalLogService';
import { ApprovalTargetType } from '../../services/approvalLineService';
import api from '../../services/api';

const TYPE_LABELS: Record<ApprovalTargetType, string> = {
  EVANGELISM: '전도', MEMBERSHIP: '내무', MONTHLY_ACTIVITY: '전도(월간보고)',
};
const TYPE_BADGE_COLORS: Record<ApprovalTargetType, { bg: string; fg: string }> = {
  EVANGELISM: { bg: '#dbeafe', fg: '#1e40af' },
  MEMBERSHIP: { bg: '#f3e8ff', fg: '#6d28d9' },
  MONTHLY_ACTIVITY: { bg: '#cffafe', fg: '#0e7490' },
};
const PROGRESS_API_PATHS: Record<ApprovalTargetType, string> = {
  EVANGELISM: 'evangelism', MEMBERSHIP: 'membership', MONTHLY_ACTIVITY: 'evangelism/monthly-activity',
};
const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: 'ALL', label: '전체' },
  { key: 'PENDING', label: '결재 대기' },
  { key: 'APPROVED', label: '승인 완료' },
  { key: 'REJECTED', label: '반려됨' },
  { key: 'USED', label: '수정 완료(사용됨)' },
];

interface ApprovalProgressApprover {
  userId?: number;
  userName?: string;
  resolverType: 'TEAM_LEADER' | 'DEPARTMENT_LEADER' | 'SPECIFIC_USER';
  decision?: 'APPROVED' | 'REJECTED' | null;
  decidedAt?: string;
  comment?: string;
  selfApproved: boolean;
}
interface ApprovalProgressStep {
  stepOrder: number;
  name?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvers: ApprovalProgressApprover[];
}
interface ApprovalProgress {
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  currentStepOrder?: number;
  steps: ApprovalProgressStep[];
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'PENDING':
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
          <Clock size={12} /> 결재 대기
        </span>
      );
    case 'APPROVED':
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
          <CheckCircle2 size={12} /> 승인 완료
        </span>
      );
    case 'REJECTED':
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fee2e2', color: '#b91c1c', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
          <XCircle size={12} /> 반려됨
        </span>
      );
    case 'USED':
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', color: '#64748b', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
          <CheckCircle2 size={12} /> 수정 완료(사용됨)
        </span>
      );
    default:
      return status;
  }
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch (e) {
    return dateStr;
  }
};

export const AdminApprovalLogPage: React.FC = () => {
  const [logs, setLogs] = useState<ApprovalLogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<ApprovalTargetType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  const [selected, setSelected] = useState<ApprovalLogEntry | null>(null);
  const [progress, setProgress] = useState<ApprovalProgress | null>(null);
  const [progressLoading, setProgressLoading] = useState<boolean>(false);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      setLogs(await approvalLogService.getAll());
    } catch (e) {
      console.error('통합결재 로그 조회 실패:', e);
      setError('결재 로그를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLogs(); }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, statusFilter, pageSize]);

  useEffect(() => {
    setProgress(null);
    if (!selected) return;
    setProgressLoading(true);
    api.get<ApprovalProgress>(`/${PROGRESS_API_PATHS[selected.targetType]}/edit-requests/${selected.requestId}/approval-progress`)
      .then(res => setProgress(res.data))
      .catch(() => setProgress(null))
      .finally(() => setProgressLoading(false));
  }, [selected]);

  const filtered = logs.filter(l => {
    if (typeFilter !== 'ALL' && l.targetType !== typeFilter) return false;
    if (statusFilter !== 'ALL' && l.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      const haystack = `${l.churchName} ${l.requestedBy} ${l.requestedTo} ${l.reason}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginated = filtered.slice(startIndex, startIndex + pageSize);

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1f2a44', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ClipboardList size={22} /> 통합결재 로그
        </h1>
        <p style={{ color: '#6b7a99', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
          전도·내무·전도(월간보고) 실적 수정 결재 내역을 신청자·결재자 구분 없이 모든 사용자 기준으로 조회합니다. 목록을 누르면 단계별 결재 진행 상세를 확인할 수 있습니다.
        </p>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '14px 16px', borderRadius: '12px', marginBottom: '16px', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Control Bar */}
      <div style={{
        background: '#ffffff', border: '1px solid #e6edf8', borderRadius: '16px', padding: '16px 20px',
        marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '16px', boxShadow: '0 2px 8px rgba(20, 40, 90, 0.03)',
      }}>
        <div style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 700 }}>
          총 <span style={{ color: '#2563eb' }}>{filtered.length}</span>건의 결재 기록이 조회되었습니다.
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            {(['ALL', 'EVANGELISM', 'MEMBERSHIP', 'MONTHLY_ACTIVITY'] as const).map(key => {
              const isSelected = typeFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => setTypeFilter(key)}
                  style={{
                    padding: '6px 12px', borderRadius: '20px',
                    border: isSelected ? '1px solid #c7d2fe' : '1px solid #e6edf8',
                    background: isSelected ? '#e0e7ff' : '#ffffff',
                    color: isSelected ? '#2563eb' : '#6b7a99',
                    fontWeight: isSelected ? 700 : 600, fontSize: '0.8rem', cursor: 'pointer',
                  }}
                >
                  {key === 'ALL' ? '전체 유형' : TYPE_LABELS[key]}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            {STATUS_FILTERS.map(chip => {
              const isSelected = statusFilter === chip.key;
              return (
                <button
                  key={chip.key}
                  onClick={() => setStatusFilter(chip.key)}
                  style={{
                    padding: '6px 12px', borderRadius: '20px',
                    border: isSelected ? '1px solid #c7d2fe' : '1px solid #e6edf8',
                    background: isSelected ? '#e0e7ff' : '#ffffff',
                    color: isSelected ? '#2563eb' : '#6b7a99',
                    fontWeight: isSelected ? 700 : 600, fontSize: '0.8rem', cursor: 'pointer',
                  }}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.85rem', color: '#6b7a99', fontWeight: 600 }}>목록 수:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              style={{ padding: '8px 12px', border: '1px solid #dbe2ef', borderRadius: '8px', fontSize: '0.85rem', color: '#1f2a44', fontWeight: 700, outline: 'none', background: '#ffffff', cursor: 'pointer' }}
            >
              <option value={20}>20개씩 보기</option>
              <option value={50}>50개씩 보기</option>
              <option value={100}>100개씩 보기</option>
            </select>
          </div>
          <div style={{ position: 'relative', minWidth: '240px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="교회, 요청자, 결재선, 사유 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '9px 14px 9px 38px', background: '#ffffff', border: '1px solid #dbe2ef', borderRadius: '10px', color: '#1f2a44', fontSize: '0.86rem', outline: 'none' }}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#ffffff', border: '1px solid #e6edf8', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 14px rgba(20, 40, 90, 0.04)' }}>
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#6b7a99' }}>불러오는 중입니다...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'left' }}>신청 교회</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'left' }}>대상 주차/월</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'left' }}>수정 사유</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'left' }}>요청자</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'left' }}>결재선(대상)</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'left' }}>신청 일시</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'center' }}>상태</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#6b7a99' }}>조회된 결재 기록이 없습니다.</td>
                  </tr>
                ) : (
                  paginated.map(l => (
                    <tr
                      key={`${l.targetType}-${l.requestId}`}
                      onClick={() => setSelected(l)}
                      style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s ease' }}
                      className="approval-log-row-hover"
                    >
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0f172a', textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, background: TYPE_BADGE_COLORS[l.targetType].bg, color: TYPE_BADGE_COLORS[l.targetType].fg, padding: '2px 6px', borderRadius: '4px' }}>
                            {TYPE_LABELS[l.targetType]}
                          </span>
                          <MapPin size={13} style={{ color: '#3b82f6' }} />
                          {l.churchName}
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', color: '#334155', fontWeight: 700, textAlign: 'left' }}>
                        {l.yearStr} {l.targetType === 'EVANGELISM' ? l.weekKey : l.monthKey}
                      </td>
                      <td style={{ padding: '14px 18px', color: '#475569', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                        {l.reason}
                      </td>
                      <td style={{ padding: '14px 18px', color: '#475569', textAlign: 'left' }}>{l.requestedBy}</td>
                      <td style={{ padding: '14px 18px', color: '#64748b', fontSize: '0.8rem', textAlign: 'left' }}>{l.requestedTo}</td>
                      <td style={{ padding: '14px 18px', color: '#64748b', fontSize: '0.8rem', textAlign: 'left' }}>{formatDate(l.requestedAt)}</td>
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>{getStatusBadge(l.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div style={{ padding: '14px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
            총 <b style={{ color: '#2563eb' }}>{filtered.length}</b>건 중{' '}
            {filtered.length > 0 ? `${startIndex + 1} ~ ${Math.min(startIndex + pageSize, filtered.length)}` : 0}건 표시
            (페이지 {currentPage} / {totalPages})
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #dbe2ef', background: currentPage === 1 ? '#f1f5f9' : '#ffffff', color: currentPage === 1 ? '#94a3b8' : '#334155', fontWeight: 700, fontSize: '0.82rem', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <ChevronLeft size={14} /> 이전
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #dbe2ef', background: currentPage === totalPages ? '#f1f5f9' : '#ffffff', color: currentPage === totalPages ? '#94a3b8' : '#334155', fontWeight: 700, fontSize: '0.82rem', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              다음 <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '600px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0', overflow: 'hidden' }}
          >
            <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#ffffff', padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>
                  No. {selected.requestId} · {TYPE_LABELS[selected.targetType]} 결재 문서
                </span>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>결재 상세 내용</h3>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#ffffff', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}>신청 교회</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={14} style={{ color: '#3b82f6' }} /> {selected.churchName}
                  </span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}>진행 상태</span>
                  <div>{getStatusBadge(selected.status)}</div>
                </div>
              </div>

              {progressLoading ? (
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>결재 진행 현황을 불러오는 중...</div>
              ) : progress && (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#475569', fontWeight: 800, marginBottom: '10px' }}>
                    <Info size={14} style={{ color: '#3b82f6' }} /> 결재라인 진행 현황
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {progress.steps.map((step, idx) => {
                      const isCurrent = progress.status === 'PENDING' && step.stepOrder === progress.currentStepOrder;
                      return (
                        <div key={step.stepOrder} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          {idx > 0 && <ArrowRight size={14} style={{ color: '#cbd5e1', marginTop: '4px', flexShrink: 0 }} />}
                          <div style={{ flex: 1, background: isCurrent ? '#eff6ff' : '#f8fafc', border: '1px solid ' + (isCurrent ? '#bfdbfe' : '#f1f5f9'), borderRadius: '10px', padding: '10px 12px' }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1f2a44', marginBottom: '6px' }}>
                              {step.stepOrder}차 · {step.name}
                              {step.status === 'APPROVED' && <span style={{ color: '#16a34a', marginLeft: '6px' }}>✓ 승인완료</span>}
                              {step.status === 'REJECTED' && <span style={{ color: '#dc2626', marginLeft: '6px' }}>반려</span>}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {step.approvers.map((a, i) => (
                                <div key={i} style={{ fontSize: '0.78rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>{a.userName || '미지정'}</span>
                                  {a.decision === 'APPROVED' && (
                                    <span style={{ color: '#16a34a', fontWeight: 700 }}>{a.selfApproved ? '자가승인' : '승인'}</span>
                                  )}
                                  {a.decision === 'REJECTED' && <span style={{ color: '#dc2626', fontWeight: 700 }}>반려</span>}
                                  {!a.decision && <span style={{ color: '#94a3b8' }}>대기중</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '6px' }}>
                    <Calendar size={12} style={{ color: '#10b981' }} /> 대상 주차/월
                  </span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1e293b' }}>
                    {selected.yearStr} {selected.targetType === 'EVANGELISM' ? selected.weekKey : selected.monthKey}
                  </span>
                </div>
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '6px' }}>
                    <User size={12} style={{ color: '#8b5cf6' }} /> 기안자 (요청자)
                  </span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#334155' }}>{selected.requestedBy}</span>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ display: 'block', fontSize: '0.78rem', color: '#475569', fontWeight: 800, marginBottom: '8px' }}>기안 사유 및 요청 상세 내용</span>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e293b', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{selected.reason}</p>
              </div>

              {selected.approverComment && (
                <div style={{ background: selected.status === 'REJECTED' ? '#fef2f2' : '#f0fdf4', border: '1px solid ' + (selected.status === 'REJECTED' ? '#fecaca' : '#bbf7d0'), padding: '18px', borderRadius: '12px' }}>
                  <span style={{ display: 'block', fontSize: '0.78rem', color: selected.status === 'REJECTED' ? '#991b1b' : '#166534', fontWeight: 800, marginBottom: '8px' }}>
                    {selected.status === 'REJECTED' ? '반려 사유 및 피드백' : '결재자 의견 (승인 코멘트)'}
                  </span>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: selected.status === 'REJECTED' ? '#7f1d1d' : '#14532d', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {selected.approverComment}
                  </p>
                </div>
              )}
            </div>

            <div style={{ background: '#f8fafc', padding: '20px 28px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelected(null)}
                style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#475569', padding: '10px 20px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer' }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .approval-log-row-hover:hover { background-color: #f8fafc; }
      `}</style>
    </div>
  );
};
