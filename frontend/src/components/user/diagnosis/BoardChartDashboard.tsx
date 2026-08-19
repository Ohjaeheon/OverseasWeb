/**
 * 홈 화면 "해외선교부 현황판" 표 아래에 렌더되는 커스텀 그래프 영역.
 * 그래프 구성은 관리자 페이지(adminsetting/graph-management/board)에서 정의하며,
 * 이 컴포넌트는 그 구성을 읽어와 recharts로 그리기만 한다.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { OverseasBoardRow } from '../../../services/homeDashboardService';
import { graphConfigService, BoardChartConfig } from '../../../services/graphConfigService';
import { MetricDef, metricVal } from '../../../utils/diagnosisMetrics';

/** 관리자 화면(AdminGraphManagementPage)과 홈 화면이 함께 참조하는 그래프 설정 카테고리 키. */
export const GRAPH_CATEGORY_KEY = 'overseas_board_home';

export const GROUP_BY_LABELS: Record<BoardChartConfig['groupBy'], string> = {
  gubun: '구분(교회/지역/개척지)', jipa: '지파', continent: '대륙',
};

const METRIC_COLOR_PALETTE = [
  '#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c',
  '#0891b2', '#d97706', '#db2777', '#65a30d', '#7c3aed',
];

export interface EnrichedBoardRow { r: OverseasBoardRow; agg: any; }

interface Props {
  enriched: EnrichedBoardRow[];
  catDef: MetricDef[];
}

export const BoardChartDashboard: React.FC<Props> = ({ enriched, catDef }) => {
  const [charts, setCharts] = useState<BoardChartConfig[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    graphConfigService.getEffectiveConfigs()
      .then((all) => { if (!cancelled) setCharts(all[GRAPH_CATEGORY_KEY] || []); })
      .catch(() => { if (!cancelled) setCharts([]); });
    return () => { cancelled = true; };
  }, []);

  const enabledCharts = useMemo(
    () => (charts || []).filter((c) => c.enabled).sort((a, b) => a.order - b.order),
    [charts]
  );

  if (charts === null || enabledCharts.length === 0) return null;

  const metricById = new Map(catDef.map((m) => [m.id, m]));

  return (
    <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 18 }}>
      {enabledCharts.map((chart) => (
        <ChartCard key={chart.id} chart={chart} enriched={enriched} metricById={metricById} />
      ))}
    </div>
  );
};

function groupRows(enriched: EnrichedBoardRow[], groupBy: BoardChartConfig['groupBy']): { name: string; rows: EnrichedBoardRow[] }[] {
  const map = new Map<string, EnrichedBoardRow[]>();
  enriched.forEach((item) => {
    const key = item.r[groupBy] || '기타';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  });
  return Array.from(map.entries()).map(([name, rows]) => ({ name, rows }));
}

function sumMetric(rows: EnrichedBoardRow[], m: MetricDef): number {
  return rows.reduce((s, item) => s + (metricVal(item.agg, m) || 0), 0);
}

function ChartCard({ chart, enriched, metricById }: { chart: BoardChartConfig; enriched: EnrichedBoardRow[]; metricById: Map<string, MetricDef> }) {
  const metrics = chart.metricIds.map((id) => metricById.get(id)).filter((m): m is MetricDef => !!m);
  const groups = groupRows(enriched, chart.groupBy);
  const data = groups.map(({ name, rows }) => {
    const row: Record<string, string | number> = { name };
    metrics.forEach((m) => { row[m.id] = sumMetric(rows, m); });
    return row;
  });

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px 10px', borderBottom: '1px solid #f1f5f9' }}>
        <h3 style={{ margin: 0, fontSize: '1.02rem' }}>{chart.title}</h3>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
          {GROUP_BY_LABELS[chart.groupBy]}별 · {metrics.map((m) => m.l).join(', ') || '지표 없음'}
        </div>
      </div>
      <div style={{ padding: '14px 18px 18px' }}>
        {metrics.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 0', fontSize: 13 }}>선택된 지표가 없습니다.</div>
        ) : chart.chartType === 'bar' ? (
          <BarSVG data={data} metrics={metrics} />
        ) : chart.chartType === 'line' ? (
          <LineSVG data={data} metrics={metrics} />
        ) : (
          <PieSVG groups={groups} metric={metrics[0]} />
        )}
      </div>
    </div>
  );
}

function BarSVG({ data, metrics }: { data: Record<string, string | number>[]; metrics: MetricDef[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 6, right: 10, left: -10, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 700, fill: '#475569' }} />
        <YAxis tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }} allowDecimals={false} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
        {metrics.map((m, i) => (
          <Bar key={m.id} dataKey={m.id} name={m.l} fill={METRIC_COLOR_PALETTE[i % METRIC_COLOR_PALETTE.length]} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function LineSVG({ data, metrics }: { data: Record<string, string | number>[]; metrics: MetricDef[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 6, right: 10, left: -10, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 700, fill: '#475569' }} />
        <YAxis tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }} allowDecimals={false} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
        {metrics.map((m, i) => {
          const color = METRIC_COLOR_PALETTE[i % METRIC_COLOR_PALETTE.length];
          return <Line key={m.id} type="monotone" dataKey={m.id} name={m.l} stroke={color} strokeWidth={3} dot={{ r: 4, fill: color, stroke: '#fff', strokeWidth: 2 }} />;
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}

function PieSVG({ groups, metric }: { groups: { name: string; rows: EnrichedBoardRow[] }[]; metric?: MetricDef }) {
  if (!metric) return null;
  const slices = groups.map((g, i) => ({ name: g.name, value: sumMetric(g.rows, metric), color: METRIC_COLOR_PALETTE[i % METRIC_COLOR_PALETTE.length] }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={slices} dataKey="value" nameKey="name" cx="38%" cy="50%" outerRadius={85} strokeWidth={2} stroke="#fff">
          {slices.map((s, i) => <Cell key={i} fill={s.color} />)}
        </Pie>
        <Tooltip />
        <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
