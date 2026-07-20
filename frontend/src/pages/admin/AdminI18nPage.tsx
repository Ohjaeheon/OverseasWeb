import React from 'react';

export const AdminI18nPage: React.FC = () => {
  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px' }}>
        🌐 다국어 사전 리소스 관리
      </h2>
      <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '24px' }}>
        언어별(한국어, 영어, 태국어, 중국어, 일본어) UI 라벨 및 진단 항목 리소스를 관리합니다.
      </p>

      <div className="glass-panel" style={{ padding: '24px', borderRadius: '12px' }}>
        <table className="custom-table">
          <thead>
            <tr>
              <th>메시지 키</th>
              <th>한국어 (ko)</th>
              <th>English (en)</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>brand</code></td>
              <td>해외선교부 업무포탈</td>
              <td>Overseas Mission Church Diagnosis</td>
              <td><span className="badge badge-green">정상</span></td>
            </tr>
            <tr>
              <td><code>login.title</code></td>
              <td>해선부 업무포탈 로그인</td>
              <td>Overseas Portal Login</td>
              <td><span className="badge badge-green">정상</span></td>
            </tr>
            <tr>
              <td><code>login.otpTitle</code></td>
              <td>텔레그램 2차 인증 (OTP)</td>
              <td>Telegram 2FA Verification (OTP)</td>
              <td><span className="badge badge-green">정상</span></td>
            </tr>
            <tr>
              <td><code>dashboard.evangelism</code></td>
              <td>① 전도 현황</td>
              <td>① Evangelism</td>
              <td><span className="badge badge-green">정상</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
