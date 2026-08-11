import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDiagnosisData } from '../../../contexts/DiagnosisDataContext';
import { recordsFor, fmt } from '../../../utils/diagnosisMetrics';
import { CONT_KO, CONT_COLORS } from '../../../utils/diagnosisI18n';
import { mapProj, MAP_W, MAP_H } from '../../../utils/mapProjection';
import { buildLandPaths, buildLandByCont, CONT_CODES } from '../../../utils/worldTopology';
import { EntityCompactPanel, PanelHint, EntityDetailModal } from './EntityDetailPanel';
import { DiagnosisRecord } from '../../../services/diagnosisService';

const CB: Record<string, string> = { 아시아: '#dcdcc4', 유럽: '#d7dcc2', 아프리카: '#e2dabf', 북아메리카: '#d6ddc6', 중앙아메리카: '#d6ddc6', 남아메리카: '#d2dbbe', 오세아니아: '#dcd8bf' };

/** 지도 화면. Ported 1:1 from renderMap()/applyMapZoom()/mapSearchInput()/mapPick(). */
export const MapPage: React.FC = () => {
  const navigate = useNavigate();
  const { records, month, gubun, jipaColors } = useDiagnosisData();
  const [zoomCont, setZoomCont] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ lat: number; lon: number } | null>(null);
  const [hl, setHl] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showSug, setShowSug] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);

  const landPaths = useMemo(() => buildLandPaths(), []);
  const landByCont = useMemo(() => buildLandByCont(), []);

  if (!month) return null;
  const recs = recordsFor(records, month, gubun).filter((r) => r.lat != null && r.lon != null);
  const mx = Math.max(1, ...recs.map((r) => r.registered || 0));
  const sortedRecs = recs.slice().sort((a, b) => (b.registered || 0) - (a.registered || 0));

  let viewBox = '0 0 1000 500';
  if (focus) {
    const [fx, fy] = mapProj(focus.lat, focus.lon);
    viewBox = `${(fx - 170).toFixed(1)} ${(fy - 85).toFixed(1)} 340 170`;
  } else if (zoomCont) {
    const zrecs = recs.filter((r) => (CONT_KO[r.continent] || r.continent) === zoomCont);
    if (zrecs.length) {
      let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
      zrecs.forEach((r) => { const [x, y] = mapProj(r.lat!, r.lon!); minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); });
      let w = maxX - minX, h = maxY - minY;
      const PADF: Record<string, number> = { 북아메리카: 0.28, 중앙아메리카: 0.28 }, MINWS: Record<string, number> = { 북아메리카: 360, 중앙아메리카: 320 };
      const padF = PADF[zoomCont] != null ? PADF[zoomCont] : 0.5;
      const padX = Math.max(55, w * padF), padY = Math.max(55, h * padF);
      minX -= padX; maxX += padX; minY -= padY; maxY += padY; w = maxX - minX; h = maxY - minY;
      const MINW = MINWS[zoomCont] != null ? MINWS[zoomCont] : 500;
      if (w < MINW) { const cx = (minX + maxX) / 2; minX = cx - MINW / 2; w = MINW; }
      if (w / h < 2) { const nw = h * 2; minX -= (nw - w) / 2; w = nw; } else { const nh = w / 2; minY -= (nh - h) / 2; h = nh; }
      viewBox = `${minX.toFixed(1)} ${minY.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`;
    }
  }

  const results = query.trim() ? recs.filter((r) => (r.name || '').includes(query) || (r.country || '').includes(query)).slice(0, 12) : [];

  const pick = (r: DiagnosisRecord) => {
    setQuery(r.name); setShowSug(false);
    setHl(r.name); setZoomCont(null);
    if (r.lat != null && r.lon != null) setFocus({ lat: r.lat, lon: r.lon }); else setFocus(null);
    setOpenDetail(true);
  };
  const clickMarker = (r: DiagnosisRecord) => { setHl(r.name); setOpenDetail(true); };
  const resetZoom = () => { setZoomCont(null); setFocus(null); setHl(null); };

  const hr = hl ? sortedRecs.find((r) => r.name === hl) : null;

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div className="card" style={{ flex: 1, minWidth: 360, paddingBottom: 18 }}>
        <h3>🗺️ 지리적 분포</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '2px 0 10px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 340 }}>
            <input
              placeholder="🔍 교회·지역명 검색" autoComplete="off" value={query}
              onChange={(e) => { setQuery(e.target.value); setShowSug(true); }}
              onFocus={() => setShowSug(true)} onBlur={() => setTimeout(() => setShowSug(false), 150)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 9, fontSize: 13, boxSizing: 'border-box' }}
            />
            {showSug && query.trim() && (
              <div style={{ display: 'block', position: 'absolute', zIndex: 30, left: 0, right: 0, top: 'calc(100% + 3px)', background: '#fff', border: '1px solid var(--line)', borderRadius: 9, boxShadow: '0 8px 24px rgba(0,0,0,.12)', maxHeight: 280, overflow: 'auto' }}>
                {results.length ? results.map((r) => (
                  <div key={r.recordId} onMouseDown={() => pick(r)} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f0f3f8', fontSize: 13 }}>
                    <b>{r.name}</b> <span style={{ color: 'var(--muted)', fontSize: 11.5 }}>· {r.jipa || ''} · {fmt(r.registered)}명</span>
                  </div>
                )) : <div style={{ padding: '9px 12px', color: 'var(--muted)', fontSize: 13 }}>검색 결과 없음</div>}
              </div>
            )}
          </div>
          {(zoomCont || focus) && <button className="rotbtn" onClick={resetZoom}>🌐 전체 보기</button>}
        </div>
        <div className="mapbox">
          <svg viewBox={viewBox} width={MAP_W} height={MAP_H} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 'auto', display: 'block', aspectRatio: '2/1' }}>
            <defs>
              <linearGradient id="oceanG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e6eef4" /><stop offset="55%" stopColor="#d3e2ec" /><stop offset="100%" stopColor="#c0d6e4" />
              </linearGradient>
              <filter id="mkGlow" x="-60%" y="-60%" width="220%" height="220%">
                <feDropShadow dx="0" dy="0.5" stdDeviation="0.7" floodColor="#2b3a54" floodOpacity="0.38" />
              </filter>
            </defs>
            <rect x={0} y={0} width={MAP_W} height={MAP_H} fill="url(#oceanG)" />
            {Array.from({ length: 13 }, (_, i) => -180 + i * 30).map((lon) => { const [x] = mapProj(0, lon); return <line key={lon} x1={x} y1={0} x2={x} y2={MAP_H} stroke="rgba(70,120,170,.09)" />; })}
            {Array.from({ length: 5 }, (_, i) => -60 + i * 30).map((lat) => { const [, y] = mapProj(lat, 0); return <line key={lat} x1={0} y1={y} x2={MAP_W} y2={y} stroke="rgba(70,120,170,.09)" />; })}
            {Object.keys(landByCont).map((c) => {
              const col = c === '_default' ? '#d9dcc6' : (CB[c] || '#d9dcc6');
              const fo = zoomCont ? (c === zoomCont ? 1 : 0.45) : 0.92;
              return <path key={c} d={landByCont[c]} fill={col} fillOpacity={fo} />;
            })}
            <path d={landPaths} fill="none" stroke="#9ca485" strokeOpacity={zoomCont ? 0.5 : 0.32} strokeWidth={0.4} />
            <g filter="url(#mkGlow)">
              {sortedRecs.map((r) => {
                if (focus && r.name !== hl) return null;
                const [x, y] = mapProj(r.lat!, r.lon!);
                const rad = 2.5 + Math.sqrt((r.registered || 0) / mx) * 15;
                const color = jipaColors[r.jipa] || '#888';
                const isFocus = !zoomCont || (CONT_KO[r.continent] || r.continent) === zoomCont;
                return (
                  <circle
                    key={r.recordId} style={{ cursor: 'pointer' }} cx={x} cy={y} r={rad} fill={color}
                    fillOpacity={isFocus ? 0.9 : 0.16} stroke={isFocus ? '#ffffff' : undefined} strokeWidth={isFocus ? 0.5 : undefined} strokeOpacity={isFocus ? 0.7 : 0}
                    onClick={() => clickMarker(r)}
                  >
                    <title>{r.name} ({r.jipa}){'\n'}{CONT_KO[r.continent] || r.continent || ''} {r.country || ''}{'\n'}현재적 {fmt(r.registered)}</title>
                  </circle>
                );
              })}
            </g>
            {hl && hr && hr.lat != null && (() => {
              const [hx, hy] = mapProj(hr.lat, hr.lon!);
              const hrad = 2.5 + Math.sqrt((hr.registered || 0) / mx) * 15;
              return (
                <circle cx={hx} cy={hy} r={hrad + 5} fill="none" stroke="#ff2d55" strokeWidth={2} pointerEvents="none">
                  <animate attributeName="r" values={`${hrad + 2};${hrad + 14};${hrad + 2}`} dur="1.3s" repeatCount="indefinite" />
                  <animate attributeName="stroke-opacity" values="1;0.1;1" dur="1.3s" repeatCount="indefinite" />
                </circle>
              );
            })()}
          </svg>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginRight: 2 }}>대륙</span>
          {Object.keys(CONT_CODES).filter((c) => CONT_COLORS[c]).map((c) => (
            <span key={c} onClick={() => { setZoomCont(c); setFocus(null); setHl(null); }} title={`${c}로 확대`} style={{ fontSize: 12, color: 'var(--muted)', cursor: 'pointer', padding: '3px 7px', borderRadius: 6 }}>
              <span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: 3, background: CB[c] || '#8fb4e6', marginRight: 5, verticalAlign: 'middle' }} />{c}
            </span>
          ))}
          <span style={{ color: 'var(--line)', margin: '0 5px' }}>|</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>● 점 = 지파색 · 크기=재적</span>
        </div>
      </div>
      <div className="card" style={{ width: 330, flexShrink: 0, minHeight: 300 }}>
        {hl ? <EntityCompactPanel name={hl} onOpenFull={() => setOpenDetail(true)} onOpenDiag={(name) => navigate(`/diag?entity=${encodeURIComponent(name)}`)} /> : <PanelHint />}
      </div>
      {openDetail && hl && <EntityDetailModal target={{ name: hl, kind: 'entity' }} gubun={gubun} onClose={() => setOpenDetail(false)} />}
    </div>
  );
};
