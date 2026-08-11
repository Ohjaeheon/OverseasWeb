import React from 'react';

export interface LineChartSeries {
  name: string;
  color: string;
  values: number[];
}

interface LineChartProps {
  labels: string[];
  series: LineChartSeries[];
}

const fmt = (n: number | null | undefined) => (n == null || isNaN(n)) ? '-' : Math.round(n).toLocaleString('ko-KR');

// Ported 1:1 from public/assets/diagnosisEngine.js lineSVG()
export const LineChart: React.FC<LineChartProps> = ({ labels, series }) => {
  const W = 330, H = 190, PL = 36, PR = 14, PT = 14, PB = 28;
  const pw = W - PL - PR, ph = H - PT - PB;
  let max = 0;
  series.forEach(s => s.values.forEach(v => { if (v > max) max = v; }));
  max = max || 1;
  const N = labels.length;

  const xat = (i: number) => PL + (N <= 1 ? pw / 2 : pw * i / (N - 1));
  const yat = (v: number) => PT + ph - ((v || 0) / max) * ph;
  const axfmt = (v: number) => v >= 10000 ? (v / 10000).toFixed(1).replace(/\.0$/, '') + '만' : (v >= 1000 ? (v / 1000).toFixed(1).replace(/\.0$/, '') + '천' : fmt(Math.round(v)));

  const grid: React.ReactNode[] = [];
  for (let k = 0; k <= 3; k++) {
    const gy = PT + ph * k / 3;
    grid.push(<line key={`gl-${k}`} x1={PL} y1={gy.toFixed(1)} x2={W - PR} y2={gy.toFixed(1)} stroke="#eef2fa" />);
    grid.push(
      <text key={`gt-${k}`} x={PL - 6} y={(gy + 3).toFixed(1)} textAnchor="end" fontSize={9} fill="#9aa8c4">
        {axfmt(max * (1 - k / 3))}
      </text>
    );
  }

  const paths: React.ReactNode[] = [];
  series.forEach((s, si) => {
    let d = '';
    s.values.forEach((v, i) => { d += (i ? 'L' : 'M') + xat(i).toFixed(1) + ' ' + yat(v).toFixed(1); });
    paths.push(<path key={`p-${si}`} d={d} fill="none" stroke={s.color} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />);
    s.values.forEach((v, i) => {
      paths.push(
        <circle key={`c-${si}-${i}`} cx={xat(i).toFixed(1)} cy={yat(v).toFixed(1)} r={2.6} fill="#fff" stroke={s.color} strokeWidth={1.8}>
          <title>{labels[i]}: {fmt(v)}</title>
        </circle>
      );
    });
  });

  const xl: React.ReactNode[] = [];
  labels.forEach((l, i) => {
    if (N > 8 && (i % 2)) return;
    xl.push(<text key={`xl-${i}`} x={xat(i).toFixed(1)} y={H - 9} textAnchor="middle" fontSize={9.5} fill="#8aa0c4">{l}</text>);
  });

  return (
    <svg className="chartanim" viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {grid}
      {paths}
      {xl}
    </svg>
  );
};
