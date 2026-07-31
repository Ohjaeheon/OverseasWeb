import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Play, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Terminal, 
  Copy, 
  FileArchive, 
  Loader2 
} from 'lucide-react';
import api from '../../services/api';

export const AdminWeeklyWorshipPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [executing, setExecuting] = useState<boolean>(false);
  const [logs, setLogs] = useState<string>('');
  const [result, setResult] = useState<{ historyId: number; sundayFileName: string; wednesdayFileName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs terminal to bottom
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.zip')) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError('ZIP 파일(.zip)만 업로드할 수 있습니다.');
        setFile(null);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith('.zip')) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('ZIP 파일(.zip)만 업로드할 수 있습니다.');
        setFile(null);
      }
    }
  };

  const handleExecute = async () => {
    if (!file) return;

    setExecuting(true);
    setError(null);
    setResult(null);
    setLogs('[시스템] 파일 업로드 및 백엔드 연동 작업 준비 중...\n');

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLogs(prev => prev + '[시스템] 압축 파일 업로드 중...\n');
      const response = await api.post('/admin/weekly-worship/execute', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const data = response.data;
      if (data.success) {
        setLogs(data.logs);
        setResult({
          historyId: data.historyId,
          sundayFileName: data.sundayFileName,
          wednesdayFileName: data.wednesdayFileName
        });
      } else {
        setLogs(data.logs || '[에러] 취합 처리 중 오류가 발생했습니다.\n');
        setError(data.errorMessage || '취합 처리 실패');
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = '네트워크 통신 오류가 발생했습니다.';
      let serverLogs = '';

      if (err.response && err.response.data) {
        errMsg = err.response.data.errorMessage || errMsg;
        serverLogs = err.response.data.logs || '';
      } else if (err.message) {
        errMsg = err.message;
      }

      if (serverLogs) {
        setLogs(serverLogs);
      } else {
        setLogs(prev => prev + `\n[에러] 취합 처리 실패: ${errMsg}\n`);
      }
      setError(errMsg);
    } finally {
      setExecuting(false);
    }
  };

  const handleDownload = async (type: 'SUNDAY' | 'WEDNESDAY' | 'ALL_ZIP', defaultName: string) => {
    if (!result) return;
    try {
      const response = await api.get('/admin/weekly-worship/history/download', {
        params: { historyId: result.historyId, type },
        responseType: 'blob'
      });

      const contentType = response.headers['content-type'] as string;
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      let filename = defaultName;
      const disposition = response.headers['content-disposition'] as string;
      if (disposition && disposition.indexOf('attachment') !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) {
          filename = decodeURIComponent(matches[1].replace(/['"]/g, ''));
        }
      }

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed', err);
      alert('파일 다운로드에 실패했습니다.');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(logs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', fontFamily: '"Pretendard", sans-serif' }}>
      {/* Title Header */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          📅 주간예배 출결 자동 취합 관리
        </h2>
        <p style={{ color: '#6b7a99', fontSize: '0.88rem', marginTop: '6px', lineHeight: 1.5 }}>
          해외 19개 지역별 비밀번호 암호화 엑셀 파일들을 메인 템플릿 파일(양식.xlsx)에 자동으로 취합 및 분배하는 도구입니다.<br />
          업로드할 지역별 엑셀 파일들을 하나의 <strong>ZIP 압축파일(.zip)</strong>로 묶어서 제출해 주십시오.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Step 1: File Upload Box */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e6edf8',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 15px rgba(20, 40, 90, 0.02)'
        }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px 0', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            1. 파일 업로드 (.zip)
          </h3>

          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragActive ? '#2563eb' : '#cbd5e1'}`,
              borderRadius: '12px',
              padding: '40px 20px',
              textAlign: 'center',
              background: dragActive ? 'rgba(37, 99, 235, 0.02)' : '#f8fafc',
              cursor: 'pointer',
              transition: 'all 0.2s',
              position: 'relative'
            }}
          >
            <input 
              type="file" 
              accept=".zip" 
              onChange={handleFileChange}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer'
              }}
              disabled={executing}
            />
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: file ? 'rgba(16, 185, 129, 0.1)' : 'rgba(37, 99, 235, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: file ? '#10b981' : '#2563eb',
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.01)'
              }}>
                {file ? <FileArchive size={26} /> : <Upload size={26} />}
              </div>
              
              <div>
                <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>
                  {file ? file.name : '마우스로 ZIP 파일을 끌어서 놓으세요'}
                </p>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : '또는 컴퓨터에서 파일 선택'}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.15)',
              borderRadius: '8px',
              padding: '12px',
              marginTop: '16px',
              color: '#ef4444',
              fontSize: '0.85rem',
              fontWeight: 600
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleExecute}
              disabled={!file || executing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                background: (!file || executing) ? '#cbd5e1' : 'linear-gradient(135deg, #4b8bff, #2563eb)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: (!file || executing) ? 'not-allowed' : 'pointer',
                boxShadow: (!file || executing) ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.25)',
                transition: 'all 0.2s'
              }}
            >
              {executing ? (
                <>
                  <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                  <span>실행 중...</span>
                </>
              ) : (
                <>
                  <Play size={18} />
                  <span>자동 취합 실행</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Console Log Terminal */}
        {(executing || logs) && (
          <div style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
                <Terminal size={18} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace' }}>EXECUTION LOG TERMINAL</span>
                {executing && (
                  <span style={{
                    fontSize: '0.7rem',
                    background: '#1e3a8a',
                    color: '#60a5fa',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 700
                  }}>
                    RUNNING
                  </span>
                )}
              </div>
              {logs && (
                <button
                  onClick={copyToClipboard}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '0.78rem',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s'
                  }}
                >
                  <Copy size={14} />
                  <span>{copied ? '복사 완료!' : '로그 복사'}</span>
                </button>
              )}
            </div>

            <div style={{
              background: '#020617',
              borderRadius: '8px',
              padding: '16px',
              height: '240px',
              overflowY: 'auto',
              fontFamily: 'Consolas, Monaco, "Andale Mono", monospace',
              fontSize: '0.83rem',
              lineHeight: 1.6,
              color: '#34d399',
              whiteSpace: 'pre-wrap',
              border: '1px solid #1e293b'
            }}>
              {logs}
              <div ref={consoleEndRef} />
            </div>
          </div>
        )}

        {/* Step 3: Result & Download Box */}
        {result && (
          <div style={{
            background: '#ffffff',
            border: '1px solid #e6edf8',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 15px rgba(20, 40, 90, 0.02)',
            animation: 'fadeIn 0.4s ease-out'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#10b981',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '12px',
              marginBottom: '20px'
            }}>
              <CheckCircle2 size={24} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#1e293b' }}>
                2. 취합 결과 다운로드
              </h3>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px'
            }}>
              
              {/* Sunday Download Card */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb', background: 'rgba(37, 99, 235, 0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                    주일예배
                  </span>
                  <p style={{ margin: '8px 0 0 0', fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {result.sundayFileName}
                  </p>
                </div>
                <button
                  onClick={() => handleDownload('SUNDAY', result.sundayFileName)}
                  style={{
                    flexShrink: 0,
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: '#2563eb',
                    border: 'none',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 8px rgba(37, 99, 235, 0.2)',
                    transition: 'all 0.15s'
                  }}
                  title="주일예배 엑셀 다운로드"
                >
                  <Download size={18} />
                </button>
              </div>

              {/* Wednesday Download Card */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#db2777', background: 'rgba(219, 39, 119, 0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                    수요예배
                  </span>
                  <p style={{ margin: '8px 0 0 0', fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {result.wednesdayFileName}
                  </p>
                </div>
                <button
                  onClick={() => handleDownload('WEDNESDAY', result.wednesdayFileName)}
                  style={{
                    flexShrink: 0,
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: '#db2777',
                    border: 'none',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 8px rgba(219, 39, 119, 0.2)',
                    transition: 'all 0.15s'
                  }}
                  title="수요예배 엑셀 다운로드"
                >
                  <Download size={18} />
                </button>
              </div>

              {/* Combined ZIP Download Card */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                gridColumn: '1 / -1'
              }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10b981', background: 'rgba(16, 185, 129, 0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                    통합 패키지 (ZIP)
                  </span>
                  <p style={{ margin: '8px 0 0 0', fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>
                    주일 및 수요예배 출결 취합본 통합 압축 파일 (.zip)
                  </p>
                </div>
                <button
                  onClick={() => handleDownload('ALL_ZIP', '해외-예배출결현황_결과.zip')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: '#10b981',
                    border: 'none',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)',
                    transition: 'all 0.15s'
                  }}
                >
                  <Download size={16} />
                  <span>전체 파일 다운로드</span>
                </button>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Embedded Spinner Keyframes */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
