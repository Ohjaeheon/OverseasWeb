import React, { useState } from 'react';
import { X, Download, Lock, CheckCircle } from 'lucide-react';
import { DiagnosisRecord } from '../../services/diagnosisService';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMonth: string;
  records: DiagnosisRecord[];
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  selectedMonth,
  records
}) => {
  const [password, setPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  if (!isOpen) return null;

  const handleDownloadHtml = () => {
    const jsonStr = JSON.stringify({ month: selectedMonth, records }, null, 2);
    const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>진단서 - ${selectedMonth}</title>
  <style>
    body { font-family: sans-serif; background: #0f172a; color: white; padding: 30px; }
    h1 { color: #3b82f6; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #334155; padding: 10px; text-align: left; }
    th { background: #1e293b; }
  </style>
</head>
<body>
  <h1>해외선교부 교회 진단서 (${selectedMonth})</h1>
  <p>생성일시: ${new Date().toLocaleString()}</p>
  <table>
    <thead>
      <tr>
        <th>국가</th><th>지파</th><th>교회명</th><th>구분</th><th>현재적</th><th>전도재적</th><th>센터등록</th><th>출석수</th>
      </tr>
    </thead>
    <tbody>
      ${records.map(r => `
        <tr>
          <td>${r.country}</td>
          <td>${r.jipa}</td>
          <td><b>${r.name}</b></td>
          <td>${r.gubun}</td>
          <td>${r.registered}</td>
          <td>${r.evangReg}</td>
          <td>${r.centerMonthTotal}</td>
          <td>${r.attTotal}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  <script>
    window.DATA = ${jsonStr};
  <\/script>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `진단서-${selectedMonth}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setStatusMsg('성공! 진단서 HTML 파일이 다운로드 되었습니다.');
    setTimeout(() => {
      setStatusMsg('');
      onClose();
    }, 1500);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 10000,
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '480px',
        width: '100%',
        padding: '28px',
        borderRadius: '16px',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            right: '20px',
            top: '20px',
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px' }}>
          📤 진단서 공유 및 내보내기
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '20px' }}>
          선택한 <b>{selectedMonth}</b> 진단서 데이터를 오프라인 HTML 보고서로 다운로드합니다.
        </p>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>
            보안 암호 설정 (선택 사항)
          </label>
          <div style={{ position: 'relative' }}>
            <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="password"
              placeholder="파일 열기 암호 (미입력 가능)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--navy-border)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '0.875rem'
              }}
            />
          </div>
        </div>

        <button
          onClick={handleDownloadHtml}
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
        >
          <Download size={18} /> 오프라인 진단서.html 파일 다운로드
        </button>

        {statusMsg && (
          <div style={{
            marginTop: '16px',
            color: '#10b981',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            justifyContent: 'center'
          }}>
            <CheckCircle size={16} /> {statusMsg}
          </div>
        )}
      </div>
    </div>
  );
};
