import React, { useState, useEffect } from 'react';
import { 
  FileArchive, 
  FileSpreadsheet, 
  Terminal, 
  Download, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Search,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import api from '../../services/api';

interface HistoryItem {
  historyId: number;
  fileName: string;
  weekInfo: string;
  status: string;
  logs: string;
  uploadedBy: string;
  createdAt: string;
  originalZipPath: string;
  mergedSundayPath: string;
  mergedWednesdayPath: string;
  mergedZipPath: string;
}

export const AdminWeeklyWorshipHistoryPage: React.FC = () => {
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedLogs, setSelectedLogs] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await api.get<HistoryItem[]>('/admin/weekly-worship/history');
      setHistoryList(response.data || []);
    } catch (e) {
      console.error("Failed to fetch history list", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDownload = async (historyId: number, type: string, defaultName: string) => {
    try {
      const response = await api.get('/admin/weekly-worship/history/download', {
        params: { historyId, type },
        responseType: 'blob'
      });
      
      const contentType = response.headers['content-type'] as string;
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Content-Disposition 헤더에서 파일명 추출 디코딩
      const contentDisposition = response.headers['content-disposition'] as string;
      let filename = defaultName;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*=UTF-8''(.+)$/) || contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch[1]) {
          filename = decodeURIComponent(filenameMatch[1]);
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download failed", e);
      alert("파일 다운로드에 실패했습니다. 서버에서 파일이 영구 삭제되었거나 경로를 찾을 수 없습니다.");
    }
  };

  const handleDeleteFiles = async (historyId: number, weekInfo: string) => {
    const confirm = window.confirm(`[${weekInfo || '선택한 주차'}] 이력의 보관된 모든 물리 파일(원본 ZIP, 주일/수요 결과물)을 서버 디스크에서 영구 삭제하시겠습니까?\n(당시 실행 이력 및 표준 로그는 그대로 보존됩니다.)`);
    if (!confirm) return;

    try {
      await api.post(`/admin/weekly-worship/history/delete-files`, null, {
        params: { historyId }
      });
      alert('물리 파일들이 성공적으로 삭제되었습니다.');
      fetchHistory(); // 새로고침
    } catch (e) {
      console.error("Failed to delete history files", e);
      alert('파일 삭제에 실패했습니다.');
    }
  };

  const handleCopyLogs = () => {
    if (selectedLogs) {
      navigator.clipboard.writeText(selectedLogs);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const filteredHistory = historyList.filter(item => 
    (item.weekInfo && item.weekInfo.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.fileName && item.fileName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (dateStr: string) => {
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

  return (
    <div style={{ padding: '4px' }}>
      {/* Title Header Section */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        padding: '24px 32px',
        borderRadius: '16px',
        color: 'white',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
        marginBottom: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            📅 주간예배 출결 - 이전 데이터 확인
          </h1>
          <p style={{ margin: '8px 0 0 0', fontSize: '0.88rem', color: '#94a3b8', fontWeight: 500 }}>
            누적된 과거 취합 파일 원본과 병합 결과 엑셀 문서들을 확인하고 보관 보존용 파일로 언제든지 다시 안전하게 다운로드합니다.
          </p>
        </div>
        <button
          onClick={fetchHistory}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '10px',
            padding: '10px 18px',
            color: 'white',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
        >
          <RefreshCw size={16} /> 새로고침
        </button>
      </div>

      {/* Filter and Board Box */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
        padding: '24px'
      }}>
        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: '20px', maxWidth: '420px' }}>
          <span style={{ position: 'absolute', left: '14px', top: '12px', color: '#94a3b8' }}>
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="주차 정보(예: 6월4주) 또는 원본 파일명 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 42px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              fontSize: '0.88rem',
              outline: 'none',
              transition: 'all 0.2s',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#2563eb'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
          />
        </div>

        {/* Loading and Board Content */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', gap: '12px', color: '#64748b' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>데이터 로드 중...</span>
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}} />
          </div>
        ) : filteredHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '12px' }}>
            <Calendar size={40} style={{ marginBottom: '12px', opacity: 0.6 }} />
            <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 600 }}>누적된 취합 이력이 존재하지 않습니다.</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem' }}>새로운 주간예배 출결 취합을 먼저 실행하여 이력을 기록해 주세요.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.85rem', fontWeight: 800 }}>
                  <th style={{ padding: '12px 8px', width: '50px', textAlign: 'center' }}>No.</th>
                  <th style={{ padding: '12px 12px', width: '160px' }}>실행 일시</th>
                  <th style={{ padding: '12px 12px', width: '90px' }}>추출 주차</th>
                  <th style={{ padding: '12px 12px' }}>최초 업로드 파일명</th>
                  <th style={{ padding: '12px 12px', width: '100px', textAlign: 'center' }}>실행 결과</th>
                  <th style={{ padding: '12px 12px', width: '100px', textAlign: 'center' }}>당시 로그</th>
                  <th style={{ padding: '12px 12px', width: '380px', textAlign: 'center' }}>다운로드 보관함</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item, index) => {
                  const isSuccess = item.status === 'SUCCESS';
                  return (
                    <tr 
                      key={item.historyId} 
                      style={{ 
                        borderBottom: '1px solid #f1f5f9', 
                        fontSize: '0.88rem',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* No. */}
                      <td style={{ padding: '14px 8px', color: '#94a3b8', fontWeight: 600, textAlign: 'center' }}>
                        {historyList.length - index}
                      </td>
                      
                      {/* Created At */}
                      <td style={{ padding: '14px 12px', color: '#334155', fontWeight: 600 }}>
                        {formatDate(item.createdAt)}
                      </td>
                      
                      {/* Week Info */}
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{ 
                          background: isSuccess ? '#eff6ff' : '#f1f5f9', 
                          color: isSuccess ? '#1d4ed8' : '#475569', 
                          padding: '3px 8px', 
                          borderRadius: '6px', 
                          fontWeight: 700,
                          fontSize: '0.78rem'
                        }}>
                          {item.weekInfo || 'N/A'}
                        </span>
                      </td>
                      
                      {/* File Name */}
                      <td style={{ padding: '14px 12px', color: '#475569', wordBreak: 'break-all', fontWeight: 500 }}>
                        {item.fileName}
                      </td>
                      
                      {/* Status */}
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <span style={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: isSuccess ? '#ecfdf5' : '#fef2f2', 
                          color: isSuccess ? '#047857' : '#b91c1c', 
                          padding: '3px 8px', 
                          borderRadius: '6px', 
                          fontWeight: 700,
                          fontSize: '0.78rem'
                        }}>
                          {isSuccess ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          {isSuccess ? '성공' : '실패'}
                        </span>
                      </td>

                      {/* Log view button */}
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <button
                          onClick={() => setSelectedLogs(item.logs)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '5px 8px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: '#475569',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
                        >
                          <Terminal size={12} /> 로그
                        </button>
                      </td>
                      
                      {/* Download button groups */}
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        {isSuccess ? (
                          item.originalZipPath ? (
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              {/* 업로드 원본 ZIP */}
                              <button
                                onClick={() => handleDownload(item.historyId, 'ORIGINAL', '원본업로드.zip')}
                                title="업로드했던 원본 압축파일(.zip)을 다운로드합니다."
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: '#f8fafc',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '6px',
                                  padding: '5px 8px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  color: '#475569',
                                  cursor: 'pointer'
                                }}
                              >
                                <FileArchive size={12} /> 원본
                              </button>

                              {/* 주일 엑셀 */}
                              <button
                                onClick={() => handleDownload(item.historyId, 'SUNDAY', '해외예배출결_주일.xlsx')}
                                title="취합 완성된 주일예배 출결 현황 엑셀을 다운로드합니다."
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: '#f0fdf4',
                                  border: '1px solid #bbf7d0',
                                  borderRadius: '6px',
                                  padding: '5px 8px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  color: '#166534',
                                  cursor: 'pointer'
                                }}
                              >
                                <FileSpreadsheet size={12} /> 주일결과
                              </button>

                              {/* 수요 엑셀 */}
                              <button
                                onClick={() => handleDownload(item.historyId, 'WEDNESDAY', '해외예배출결_수요.xlsx')}
                                title="취합 완성된 수요예배 출결 현황 엑셀을 다운로드합니다."
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: '#eff6ff',
                                  border: '1px solid #bfdbfe',
                                  borderRadius: '6px',
                                  padding: '5px 8px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  color: '#1e40af',
                                  cursor: 'pointer'
                                }}
                              >
                                <FileSpreadsheet size={12} /> 수요결과
                              </button>

                              {/* 전체 ZIP */}
                              <button
                                onClick={() => handleDownload(item.historyId, 'ALL_ZIP', '해외예배출결_결과전체.zip')}
                                title="주일 및 수요 결과 엑셀이 모두 담긴 통합 압축파일을 다운로드합니다."
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: '#f5f3ff',
                                  border: '1px solid #ddd6fe',
                                  borderRadius: '6px',
                                  padding: '5px 8px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  color: '#5b21b6',
                                  cursor: 'pointer'
                                }}
                              >
                                <Download size={12} /> 전체합본
                              </button>

                              {/* 파일 삭제 버튼 */}
                              <button
                                onClick={() => handleDeleteFiles(item.historyId, item.weekInfo)}
                                title="보관된 물리 파일들을 서버 디스크에서 삭제합니다. (이력은 보존)"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: '#fef2f2',
                                  border: '1px solid #fca5a5',
                                  borderRadius: '6px',
                                  padding: '5px 8px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  color: '#b91c1c',
                                  cursor: 'pointer'
                                }}
                              >
                                <XCircle size={12} /> 파일 삭제
                              </button>
                            </div>
                          ) : (
                            <span style={{ 
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: '#f1f5f9', 
                              color: '#94a3b8', 
                              padding: '4px 10px', 
                              borderRadius: '6px', 
                              fontWeight: 700,
                              fontSize: '0.78rem'
                            }}>
                              📁 파일 삭제됨 (로그 보존)
                            </span>
                          )
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>
                            실패 건은 보관된 파일이 없습니다
                          </span>
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

      {/* Terminal Log Modal */}
      {selectedLogs && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div style={{
            background: '#1e293b',
            width: '100%',
            maxWidth: '800px',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '80vh',
            border: '1px solid #334155'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid #334155',
              color: '#f8fafc'
            }}>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={16} style={{ color: '#38bdf8' }} /> 당시 실행 상세 터미널 로그
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleCopyLogs}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    fontWeight: 700
                  }}
                >
                  {copied ? <Check size={14} style={{ color: '#34d399' }} /> : <Copy size={14} />}
                  {copied ? '복사됨!' : '로그 전체 복사'}
                </button>
                <button
                  onClick={() => setSelectedLogs(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '1.25rem',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    lineHeight: 1
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Console Content */}
            <div style={{
              flex: 1,
              padding: '20px',
              overflowY: 'auto',
              background: '#0f172a',
              margin: '12px',
              borderRadius: '8px',
              border: '1px solid #1e293b'
            }}>
              <pre style={{
                margin: 0,
                color: '#38bdf8',
                fontFamily: '"Fira Code", "Courier New", Courier, monospace',
                fontSize: '0.83rem',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
              }}>
                {selectedLogs}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
