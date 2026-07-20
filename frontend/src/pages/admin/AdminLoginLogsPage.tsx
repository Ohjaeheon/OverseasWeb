import React, { useState, useEffect } from 'react';
import { logService, LoginLogItem } from '../../services/logService';
import { LogIn, Search, CheckCircle, XCircle, Trash2, Clock, ShieldCheck, Monitor, ChevronLeft, ChevronRight } from 'lucide-react';

export const AdminLoginLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<LoginLogItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const loadLogs = () => {
    setLogs(logService.getLoginLogs());
  };

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, pageSize]);

  const handleClear = () => {
    if (!window.confirm("로그인 로그 기록을 전체 삭제하시겠습니까?")) return;
    logService.clearLoginLogs();
    loadLogs();
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ipAddress.includes(searchTerm) ||
      log.timestamp.includes(searchTerm);
    const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + pageSize);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1f2a44', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            📥 로그인 로그 관리 (Login Logs)
          </h1>
          <p style={{ color: '#6b7a99', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
            시스템에 접속한 회원들의 접속 시각(밀리초 포함), 계정명, IP 주소 및 로그인 성공/실패 기록을 조회합니다.
          </p>
        </div>

        <button
          onClick={handleClear}
          style={{
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            color: '#dc2626',
            borderRadius: '10px',
            padding: '9px 16px',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Trash2 size={16} /> 로그 비우기
        </button>
      </div>

      {/* Control Bar */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e6edf8',
        borderRadius: '16px',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 2px 8px rgba(20, 40, 90, 0.03)'
      }}>
        {/* Status Filter Chips */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {[
            { key: 'ALL', label: '전체 로그' },
            { key: 'SUCCESS', label: '성공 (SUCCESS)' },
            { key: 'FAILED', label: '실패 (FAILED)' }
          ].map((chip) => {
            const isSelected = statusFilter === chip.key;
            return (
              <button
                key={chip.key}
                onClick={() => setStatusFilter(chip.key)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '20px',
                  border: isSelected ? '1px solid #c7d2fe' : '1px solid #e6edf8',
                  background: isSelected ? '#e0e7ff' : '#ffffff',
                  color: isSelected ? '#2563eb' : '#6b7a99',
                  fontWeight: isSelected ? 700 : 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Page Size & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.85rem', color: '#6b7a99', fontWeight: 600 }}>목록 수:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              style={{
                padding: '8px 12px',
                border: '1px solid #dbe2ef',
                borderRadius: '8px',
                fontSize: '0.85rem',
                color: '#1f2a44',
                fontWeight: 700,
                outline: 'none',
                background: '#ffffff',
                cursor: 'pointer'
              }}
            >
              <option value={10}>10개씩 보기</option>
              <option value={30}>30개씩 보기</option>
              <option value={50}>50개씩 보기</option>
              <option value={100}>100개씩 보기</option>
            </select>
          </div>

          <div style={{ position: 'relative', minWidth: '240px' }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="계정명, IP주소, 시각 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 14px 9px 40px',
                background: '#ffffff',
                border: '1px solid #dbe2ef',
                borderRadius: '10px',
                color: '#1f2a44',
                fontSize: '0.88rem',
                outline: 'none'
              }}
            />
          </div>
        </div>
      </div>

      {/* Login Logs Table */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e6edf8',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 4px 14px rgba(20, 40, 90, 0.04)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '14px 18px', fontWeight: 700 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={15} color="#2563eb" /> 시간 (년/월/일 시:분:초.000)
                </span>
              </th>
              <th style={{ padding: '14px 18px', fontWeight: 700 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={15} color="#2563eb" /> 계정명
                </span>
              </th>
              <th style={{ padding: '14px 18px', fontWeight: 700 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Monitor size={15} color="#2563eb" /> IP 주소
                </span>
              </th>
              <th style={{ padding: '14px 18px', fontWeight: 700 }}>로그인 상태</th>
              <th style={{ padding: '14px 18px', fontWeight: 700 }}>비고</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLogs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#6b7a99' }}>
                  로그인 로그 데이터가 없습니다.
                </td>
              </tr>
            ) : (
              paginatedLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}>
                  <td style={{ padding: '14px 18px', fontWeight: 700, color: '#2563eb', fontFamily: 'monospace' }}>
                    {log.timestamp}
                  </td>
                  <td style={{ padding: '14px 18px', fontWeight: 800, color: '#1f2a44' }}>
                    {log.username}
                  </td>
                  <td style={{ padding: '14px 18px', color: '#475569', fontFamily: 'monospace', fontWeight: 600 }}>
                    {log.ipAddress}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    {log.status === 'SUCCESS' ? (
                      <span style={{ background: '#d1fae5', color: '#047857', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={13} /> 성공 (SUCCESS)
                      </span>
                    ) : (
                      <span style={{ background: '#fee2e2', color: '#dc2626', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <XCircle size={13} /> 실패 (FAILED)
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px 18px', color: '#64748b', fontSize: '0.82rem' }}>
                    {log.details || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Bar */}
        <div style={{
          padding: '14px 20px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
            총 <b style={{ color: '#2563eb' }}>{filteredLogs.length}</b>건 중{' '}
            {filteredLogs.length > 0 ? `${startIndex + 1} ~ ${Math.min(startIndex + pageSize, filteredLogs.length)}` : 0}건 표시
            (페이지 {currentPage} / {totalPages})
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #dbe2ef',
                background: currentPage === 1 ? '#f1f5f9' : '#ffffff',
                color: currentPage === 1 ? '#94a3b8' : '#334155',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <ChevronLeft size={16} /> 이전
            </button>

            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: currentPage === p ? '1px solid #2563eb' : '1px solid #dbe2ef',
                  background: currentPage === p ? '#2563eb' : '#ffffff',
                  color: currentPage === p ? '#ffffff' : '#334155',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                {p}
              </button>
            ))}

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #dbe2ef',
                background: currentPage === totalPages ? '#f1f5f9' : '#ffffff',
                color: currentPage === totalPages ? '#94a3b8' : '#334155',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              다음 <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
