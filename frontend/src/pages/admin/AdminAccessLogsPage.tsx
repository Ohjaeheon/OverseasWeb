import React, { useState, useEffect } from 'react';
import { logService, AccessLogItem } from '../../services/logService';
import { Search, Trash2, Clock, ShieldCheck, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

export const AdminAccessLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AccessLogItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const loadLogs = () => {
    setLogs(logService.getAccessLogs());
  };

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  const handleClear = () => {
    if (!window.confirm("접근 로그 기록을 전체 삭제하시겠습니까?")) return;
    logService.clearAccessLogs();
    loadLogs();
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.pageName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.timestamp.includes(searchTerm);
    return matchesSearch;
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
            📥 접근 로그 관리 (Access Logs)
          </h1>
          <p style={{ color: '#6b7a99', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
            로그인한 사용자들이 시스템 내부 각 메뉴 및 진단서 포탈 페이지에 접근한 이력 시각(밀리초 포함)을 기록 조회합니다.
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
        <div style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 700 }}>
          총 <span style={{ color: '#2563eb' }}>{filteredLogs.length}</span>개의 접근 기록이 조회되었습니다.
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

          <div style={{ position: 'relative', minWidth: '260px' }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="계정명, 접근 페이지명, 경로 검색..."
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

      {/* Access Logs Table */}
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
                  <FileText size={15} color="#2563eb" /> 접근 페이지 (Path)
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedLogs.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: '30px', textAlign: 'center', color: '#6b7a99' }}>
                  접근 로그 데이터가 없습니다.
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
                  <td style={{ padding: '14px 18px', color: '#334155', fontWeight: 600 }}>
                    {log.pageName}{' '}
                    <code style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#64748b', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>
                      {log.path}
                    </code>
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
