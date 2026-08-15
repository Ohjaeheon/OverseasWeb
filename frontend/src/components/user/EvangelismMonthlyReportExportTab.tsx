import React, { useState } from 'react';
import { Download, FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react';
import { evangelismReportService } from '../../services/evangelismReportService';

interface EvangelismMonthlyReportExportTabProps {
  selectedChurch: string;
  selectedYear: string;
  selectedMonth: string;
}

export const EvangelismMonthlyReportExportTab: React.FC<EvangelismMonthlyReportExportTabProps> = ({ selectedChurch, selectedYear, selectedMonth }) => {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const yearNum = parseInt(selectedYear.replace(/[^0-9]/g, ''), 10);
  const monthNum = parseInt(selectedMonth.replace(/[^0-9]/g, ''), 10);

  const handleDownload = async () => {
    if (!selectedChurch || !yearNum || !monthNum) return;
    setDownloading(true);
    setError(null);
    try {
      const { blob, filename } = await evangelismReportService.exportReport(selectedChurch, yearNum, monthNum);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      const message = e?.response?.data?.message || '보고서 생성에 실패했습니다.';
      setError(message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '16px',
      padding: '40px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      gap: '16px',
      boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
    }}>
      <div style={{
        width: '64px', height: '64px', borderRadius: '50%',
        background: 'rgba(8, 145, 178, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <FileSpreadsheet size={30} color="#0891b2" />
      </div>

      <div>
        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
          {selectedChurch} · {selectedYear} {selectedMonth} 전도 월말 보고서
        </div>
        <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6, maxWidth: '440px' }}>
          내무(전년도 12월 재적) · 전도(당월 개강/연누계) · 월간보고(활동교사수) 데이터를 관리자가 등록한 양식에 자동으로 채워 다운로드합니다.
        </p>
      </div>

      <button
        onClick={handleDownload}
        disabled={downloading}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '12px 28px', borderRadius: '10px', border: 'none',
          fontSize: '0.92rem', fontWeight: 800, cursor: downloading ? 'not-allowed' : 'pointer',
          background: downloading ? '#cbd5e1' : 'linear-gradient(135deg, #22d3ee, #0891b2)',
          color: '#fff', boxShadow: downloading ? 'none' : '0 6px 16px rgba(8, 145, 178, 0.3)'
        }}
      >
        {downloading ? <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={18} />}
        {downloading ? '생성 중...' : '월말보고서 다운로드'}
      </button>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
