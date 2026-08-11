import React from 'react';

export interface DonutChartDatum {
  label: string;
  value: number;
  color: string;
}

export interface DonutChartOpts {
  center?: string;
  centerSub?: string;
}

interface DonutChartProps {
  data: DonutChartDatum[];
  opts?: DonutChartOpts;
}

// Ported 1:1 from public/assets/diagnosisEngine.js donutSVG()
export const DonutChart: React.FC<DonutChartProps> = ({ data, opts = {} }) => {
  const total = data.reduce((s, d) => s + (d.value || 0), 0) || 1;
  const cx = 82, cy = 82, r = 62, rin = 39;
  let ang = -Math.PI / 2;
  const segments: React.ReactNode[] = [];

  data.forEach((d, i) => {
    const frac = (d.value || 0) / total;
    if (frac <= 0) return;

    if (frac >= 0.9999) {
      segments.push(
        <circle key={i} cx={cx} cy={cy} r={(r + rin) / 2} fill="none" stroke={d.color} strokeWidth={r - rin}>
          <title>{d.label} 100%</title>
        </circle>
      );
      return;
    }

    const a2 = ang + frac * 2 * Math.PI;
    const large = frac > 0.5 ? 1 : 0;
    const x1 = cx + r * Math.cos(ang), y1 = cy + r * Math.sin(ang);
    const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
    const xi2 = cx + rin * Math.cos(a2), yi2 = cy + rin * Math.sin(a2);
    const xi1 = cx + rin * Math.cos(ang), yi1 = cy + rin * Math.sin(ang);
    const d0 = `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L${xi2.toFixed(2)} ${yi2.toFixed(2)} A${rin} ${rin} 0 ${large} 0 ${xi1.toFixed(2)} ${yi1.toFixed(2)} Z`;

    segments.push(
      <path key={i} d={d0} fill={d.color}>
        <title>{d.label} {(frac * 100).toFixed(1)}%</title>
      </path>
    );
    ang = a2;
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
      <svg className="donutanim" viewBox="0 0 164 164" style={{ width: 150, height: 150, flexShrink: 0 }}>
        {segments}
        {opts.center && (
          <>
            <text x={cx} y={cy - 1} textAnchor="middle" fontSize={21} fontWeight={900} fill="#16224a">{opts.center}</text>
            <text x={cx} y={cy + 16} textAnchor="middle" fontSize={10} fill="#6b7a99">{opts.centerSub || ''}</text>
          </>
        )}
      </svg>
      <div style={{ flex: 1, minWidth: 128, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.map((d, i) => (
          <div className="dleg" key={i}>
            <span className="sw" style={{ background: d.color }}></span>
            <span className="nm">{d.label}</span>
            <span className="pc">{((d.value || 0) / total * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
