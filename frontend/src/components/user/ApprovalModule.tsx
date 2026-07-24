import React, { useState, useEffect } from 'react';
import { Check, X, RefreshCw, Clock, CheckCircle2, AlertTriangle, User, Calendar, MapPin, MessageSquare, Info } from 'lucide-react';
import api from '../../services/api';

interface EditRequest {
  requestId: number;
  churchName: string;
  yearStr: string;
  weekKey: string;
  reason: string;
  requestedBy: string;
  requestedTo: string;
  status: string;
  requestedAt: string;
  approvedAt?: string;
  approverComment?: string;
}

interface ApprovalModuleProps {
  mode: 'pending' | 'completed';
}

export const ApprovalModule: React.FC<ApprovalModuleProps> = ({ mode }) => {
  const [requests, setRequests] = useState<EditRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<EditRequest | null>(null);
  const [opinion, setOpinion] = useState<string>('');

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        setError('로그인 사용자 정보를 찾을 수 없습니다.');
        setLoading(false);
        return;
      }
      const u = JSON.parse(userStr);
      const url = mode === 'pending' ? '/evangelism/edit-requests/pending' : '/evangelism/edit-requests/completed';
      const res = await api.get<any>(`${url}?username=${u.username}&role=${u.role}&name=${encodeURIComponent(u.name)}`);
      
      setRequests(res.data || []);
    } catch (e: any) {
      console.error('Failed to fetch approval requests', e);
      setError('결재 내역을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    setSelectedRequest(null);
  }, [mode]);

  useEffect(() => {
    setOpinion('');
  }, [selectedRequest]);

  const handleApprove = async (id: number, comment: string) => {
    setActionLoadingId(id);
    try {
      await api.post(`/evangelism/edit-requests/${id}/approve?comment=${encodeURIComponent(comment)}`);
      alert('성공적으로 승인되었습니다.');
      window.dispatchEvent(new Event('refreshEditRequests'));
      fetchRequests();
    } catch (e) {
      console.error('Failed to approve request', e);
      alert('승인 처리 중 오류가 발생했습니다.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id: number, comment: string) => {
    setActionLoadingId(id);
    try {
      await api.post(`/evangelism/edit-requests/${id}/reject?comment=${encodeURIComponent(comment)}`);
      alert('요청이 반려되었습니다.');
      window.dispatchEvent(new Event('refreshEditRequests'));
      fetchRequests();
    } catch (e) {
      console.error('Failed to reject request', e);
      alert('반려 처리 중 오류가 발생했습니다.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

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
            <X size={12} /> 반려됨
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

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            {mode === 'pending' ? '📥 실적 수정 결재 대기함' : '📋 실적 수정 결재 완료함'}
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '6px 0 0 0' }}>
            {mode === 'pending' 
              ? '지사 및 교회 담당자가 요청한 주차별 전도 실적 수정 요청 목록입니다. (목록을 누르면 세부 내용을 확인하고 결재할 수 있습니다.)' 
              : '과거에 승인 완료 또는 반려 처리된 결재 이력 목록입니다. (목록을 누르면 결재 상세 정보를 확인할 수 있습니다.)'}
          </p>
        </div>
        <button
          onClick={fetchRequests}
          disabled={loading}
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#334155',
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}
        >
          <RefreshCw size={14} className={loading ? 'spin-anim' : ''} /> 새로고침
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '16px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem' }}>
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>
          <RefreshCw size={36} className="spin-anim" style={{ color: '#3b82f6', marginBottom: '12px' }} />
          <p style={{ fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>결재 요청 목록을 로드하고 있습니다...</p>
        </div>
      ) : requests.length === 0 ? (
        <div style={{ padding: '80px 0', textAlign: 'center', border: '2px dashed #e2e8f0', borderRadius: '16px', background: '#fafafa' }}>
          <Clock size={48} style={{ color: '#94a3b8', marginBottom: '16px' }} />
          <p style={{ fontWeight: 800, fontSize: '1rem', color: '#334155', margin: '0 0 6px 0' }}>
            {mode === 'pending' ? '대기 중인 결재 건이 없습니다.' : '완료된 결재 이력이 없습니다.'}
          </p>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
            {mode === 'pending' ? '모든 실적 수정 요청에 대한 결재가 완료되었습니다.' : '결재가 처리되면 이곳에 이력이 표시됩니다.'}
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '14px', fontWeight: 800, color: '#334155' }}>신청 교회</th>
                <th style={{ padding: '14px', fontWeight: 800, color: '#334155' }}>대상 주차</th>
                <th style={{ padding: '14px', fontWeight: 800, color: '#334155' }}>수정 사유</th>
                <th style={{ padding: '14px', fontWeight: 800, color: '#334155' }}>요청자</th>
                <th style={{ padding: '14px', fontWeight: 800, color: '#334155' }}>결재선(대상)</th>
                <th style={{ padding: '14px', fontWeight: 800, color: '#334155' }}>신청 일시</th>
                <th style={{ padding: '14px', fontWeight: 800, color: '#334155', textAlign: 'center' }}>상태/작업</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr 
                  key={req.requestId} 
                  onClick={() => setSelectedRequest(req)}
                  style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s', cursor: 'pointer' }} 
                  className="table-row-hover"
                >
                  <td style={{ padding: '14px', fontWeight: 700, color: '#0f172a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={14} style={{ color: '#3b82f6' }} />
                      {req.churchName}
                    </div>
                  </td>
                  <td style={{ padding: '14px', color: '#334155', fontWeight: 700 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} style={{ color: '#64748b' }} />
                      {req.yearStr} {req.weekKey}
                    </div>
                  </td>
                  <td style={{ padding: '14px', color: '#475569', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MessageSquare size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                      <span>{req.reason}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px', color: '#475569' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={14} style={{ color: '#94a3b8' }} />
                      {req.requestedBy}
                    </div>
                  </td>
                  <td style={{ padding: '14px', color: '#64748b', fontSize: '0.8rem' }}>
                    {req.requestedTo}
                  </td>
                  <td style={{ padding: '14px', color: '#64748b', fontSize: '0.8rem' }}>
                    {formatDate(req.requestedAt)}
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    {mode === 'pending' ? (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => {
                            const comment = window.prompt('승인 결재 의견을 입력해 주세요 (선택사항):');
                            if (comment === null) return;
                            handleApprove(req.requestId, comment);
                          }}
                          disabled={actionLoadingId !== null}
                          style={{
                            background: '#22c55e',
                            color: '#ffffff',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.8rem',
                            boxShadow: '0 2px 4px rgba(34, 197, 94, 0.2)'
                          }}
                        >
                          <Check size={14} /> 승인
                        </button>
                        <button
                          onClick={() => {
                            const comment = window.prompt('반려 사유를 입력해 주세요 (필수):');
                            if (comment === null) return;
                            if (!comment.trim()) {
                              alert('반려 사유를 입력해야 반려 처리가 가능합니다.');
                              return;
                            }
                            handleReject(req.requestId, comment);
                          }}
                          disabled={actionLoadingId !== null}
                          style={{
                            background: '#ef4444',
                            color: '#ffffff',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.8rem',
                            boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)'
                          }}
                        >
                          <X size={14} /> 반려
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        {getStatusBadge(req.status)}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 결재 건 상세보기 모달 */}
      {selectedRequest && (
        <div 
          onClick={() => setSelectedRequest(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '600px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              animation: 'modalSlideUp 0.2s ease-out'
            }}
          >
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              color: '#ffffff',
              padding: '24px 28px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>
                  No. {selectedRequest.requestId} · 실적 결재 문서
                </span>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>결재 상세 내용</h3>
              </div>
              <button 
                onClick={() => setSelectedRequest(null)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: '#ffffff',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
              
              {/* Type & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}>결재 구분</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Info size={14} style={{ color: '#3b82f6' }} /> 전도 실적 수정 허용 요청
                  </span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}>진행 상태</span>
                  <div>{getStatusBadge(selectedRequest.status)}</div>
                </div>
              </div>

              {/* Targets and Requesters */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '6px' }}>
                    <MapPin size={12} style={{ color: '#3b82f6' }} /> 신청 교회
                  </span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1e293b' }}>{selectedRequest.churchName}</span>
                </div>
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '6px' }}>
                    <Calendar size={12} style={{ color: '#10b981' }} /> 대상 주차
                  </span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1e293b' }}>{selectedRequest.yearStr} {selectedRequest.weekKey}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '6px' }}>
                    <User size={12} style={{ color: '#8b5cf6' }} /> 기안자 (요청자)
                  </span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#334155' }}>{selectedRequest.requestedBy}</span>
                </div>
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '6px' }}>
                    <User size={12} style={{ color: '#64748b' }} /> 대상 결재선 (수신자)
                  </span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#334155' }}>{selectedRequest.requestedTo}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '6px' }}>
                    <Clock size={12} style={{ color: '#f59e0b' }} /> 기안 일시
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#475569' }}>{formatDate(selectedRequest.requestedAt)}</span>
                </div>
                {selectedRequest.approvedAt && (
                  <div>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '6px' }}>
                      <CheckCircle2 size={12} style={{ color: '#10b981' }} /> 최종 결재 완료 일시
                    </span>
                    <span style={{ fontSize: '0.85rem', color: '#475569' }}>{formatDate(selectedRequest.approvedAt)}</span>
                  </div>
                )}
              </div>

              {/* Request Reason */}
              <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#475569', fontWeight: 800, marginBottom: '8px' }}>
                  <MessageSquare size={14} style={{ color: '#94a3b8' }} /> 기안 사유 및 요청 상세 내용
                </span>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e293b', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {selectedRequest.reason}
                </p>
              </div>

              {/* Display existing Approver Comment for completed items */}
              {selectedRequest.approverComment && (
                <div style={{ 
                  background: selectedRequest.status === 'REJECTED' ? '#fef2f2' : '#f0fdf4', 
                  border: '1px solid ' + (selectedRequest.status === 'REJECTED' ? '#fecaca' : '#bbf7d0'), 
                  padding: '18px', 
                  borderRadius: '12px' 
                }}>
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    fontSize: '0.78rem', 
                    color: selectedRequest.status === 'REJECTED' ? '#991b1b' : '#166534', 
                    fontWeight: 800, 
                    marginBottom: '8px' 
                  }}>
                    <Info size={14} style={{ color: selectedRequest.status === 'REJECTED' ? '#ef4444' : '#16a34a' }} />
                    {selectedRequest.status === 'REJECTED' ? '반려 사유 및 피드백' : '결재자 의견 (승인 코멘트)'}
                  </span>
                  <p style={{ 
                    margin: 0, 
                    fontSize: '0.9rem', 
                    color: selectedRequest.status === 'REJECTED' ? '#7f1d1d' : '#14532d', 
                    lineHeight: '1.6', 
                    whiteSpace: 'pre-wrap', 
                    wordBreak: 'break-all' 
                  }}>
                    {selectedRequest.approverComment}
                  </p>
                </div>
              )}

              {/* Approver Opinion Textarea (Only for PENDING status in modal) */}
              {mode === 'pending' && (
                <div style={{ marginTop: '10px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                    ✍️ 결재 의견 / 반려 사유 작성
                  </label>
                  <textarea
                    rows={2}
                    value={opinion}
                    onChange={(e) => setOpinion(e.target.value)}
                    placeholder="승인 또는 반려 처리 시 등록할 결재 의견을 입력해 주세요. (반려 시에는 사유를 필수 기재해 주세요.)"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.88rem',
                      color: '#0f172a',
                      outline: 'none',
                      resize: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ background: '#f8fafc', padding: '20px 28px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setSelectedRequest(null)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
                onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
              >
                닫기
              </button>

              {mode === 'pending' && (
                <>
                  <button
                    onClick={() => {
                      if (!opinion.trim()) {
                        alert('반려 처리를 하려면 반려 사유를 의견란에 반드시 기재해 주세요.');
                        return;
                      }
                      handleReject(selectedRequest.requestId, opinion);
                      setSelectedRequest(null);
                    }}
                    disabled={actionLoadingId !== null}
                    style={{
                      background: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '10px',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 4px 10px rgba(239, 68, 68, 0.2)'
                    }}
                  >
                    <X size={16} /> 반려
                  </button>
                  <button
                    onClick={() => {
                      handleApprove(selectedRequest.requestId, opinion);
                      setSelectedRequest(null);
                    }}
                    disabled={actionLoadingId !== null}
                    style={{
                      background: '#22c55e',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '10px',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 4px 10px rgba(34, 197, 94, 0.2)'
                    }}
                  >
                    <Check size={16} /> 승인
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Embedded CSS for spinner animation and hover states */}
      <style>{`
        .spin-anim {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .table-row-hover:hover {
          background-color: #f8fafc;
        }
        @keyframes modalSlideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
