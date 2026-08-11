import React from 'react';

export interface HBarChartDatum {
  label: string;
  value: number;
  color?: string;
}

interface HBarChartProps {
  data: HBarChartDatum[];
}

const fmt = (n: number | null | undefined) => (n == null || isNaN(n)) ? '-' : Math.round(n).toLocaleString('ko-KR');

// Ported 1:1 from public/assets/diagnosisEngine.js hbarSVG()
export const HBarChart: React.FC<HBarChartProps> = ({ data }) => {
  const max = Math.max(1, ...data.map(d => d.value || 0));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '84px 1fr 52px', alignItems: 'center', gap: 9 }}>
          <span style={{ fontSize: 12, color: '#41506f', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {d.label}
          </span>
          <span style={{ height: 15, background: '#eef2fa', borderRadius: 5, overflow: 'hidden' }}>
            <span className="gbar" style={{ display: 'block', height: '100%', width: `${(((d.value || 0) / max) * 100).toFixed(1)}%`, background: d.color || '#2563eb', borderRadius: 5 }}></span>
          </span>
          <span style={{ fontSize: 12, fontWeight: 800, textAlign: 'right', color: '#16224a', fontVariantNumeric: 'tabular-nums' }}>
            {fmt(d.value)}
          </span>
        </div>
      ))}
    </div>
  );
};
