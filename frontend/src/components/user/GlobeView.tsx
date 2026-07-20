import React, { useEffect, useRef } from 'react';
import { DiagnosisRecord } from '../../services/diagnosisService';

interface GlobeViewProps {
  records: DiagnosisRecord[];
}

export const GlobeView: React.FC<GlobeViewProps> = ({ records }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let rotation = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const radius = Math.min(width, height) / 2 - 20;
      const centerX = width / 2;
      const centerY = height / 2;

      // Draw Outer Orbit Glow
      const glowGrad = ctx.createRadialGradient(centerX, centerY, radius * 0.8, centerX, centerY, radius * 1.1);
      glowGrad.addColorStop(0, 'rgba(59, 130, 246, 0.15)');
      glowGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.1, 0, Math.PI * 2);
      ctx.fill();

      // Draw Base Globe
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw Grid Lines (Latitude & Longitude)
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.lineWidth = 1;
      for (let i = -60; i <= 60; i += 30) {
        ctx.beginPath();
        const r = radius * Math.cos((i * Math.PI) / 180);
        const y = centerY + radius * Math.sin((i * Math.PI) / 180);
        ctx.ellipse(centerX, y, r, r * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw Church Markers based on lat & lon + rotation
      rotation += 0.005;
      records.forEach((r) => {
        if (r.lat == null || r.lon == null) return;
        const lonRad = ((r.lon + rotation * 50) * Math.PI) / 180;
        const latRad = (r.lat * Math.PI) / 180;

        const x = centerX + radius * Math.cos(latRad) * Math.sin(lonRad);
        const y = centerY - radius * Math.sin(latRad);
        const visible = Math.cos(latRad) * Math.cos(lonRad) > 0;

        if (visible) {
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#06b6d4';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Church Name Label
          ctx.fillStyle = '#ffffff';
          ctx.font = '10px Noto Sans KR';
          ctx.fillText(r.name, x + 8, y + 3);
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [records]);

  return (
    <div className="glass-panel" style={{
      margin: '0 24px 24px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      borderRadius: '12px'
    }}>
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
          🌐 전 세계 해외교회 글로벌 미션 맵
        </h3>
        <span className="badge badge-blue">실시간 시각화</span>
      </div>
      <canvas
        ref={canvasRef}
        width={600}
        height={320}
        style={{ maxWidth: '100%', height: 'auto', background: 'transparent' }}
      />
    </div>
  );
};
