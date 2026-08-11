import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDiagnosisData } from '../../../contexts/DiagnosisDataContext';
import { recordsFor, fmt } from '../../../utils/diagnosisMetrics';
import { CONT_KO, CONT_COLORS } from '../../../utils/diagnosisI18n';
import { GlobeView, DEFAULT_GLOBE_VIEW, orthoPt, globeContPath, globeContinents, globeLandD, globeGratD } from '../../../utils/globeProjection';
import { EntityCompactPanel, PanelHint, EntityDetailModal } from './EntityDetailPanel';
import { DiagnosisRecord } from '../../../services/diagnosisService';

/** 3D 지구본 화면. Ported 1:1 from renderGlobe()/updateGlobe()/toggleGlobeRot()/rotateGlobeTo()/rotateToCont(). */
export const GlobePage: React.FC = () => {
  const navigate = useNavigate();
  const { records, month, gubun, jipaColors } = useDiagnosisData();
  const [view, setView] = useState<GlobeView>(DEFAULT_GLOBE_VIEW);
  const [selCont, setSelCont] = useState<string | null>(null);
  const [hl, setHl] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [zoomedIn, setZoomedIn] = useState(false);
  const [query, setQuery] = useState('');
  const [showSug, setShowSug] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);

  const dragRef = useRef({ dragging: false, moved: false, lx: 0, ly: 0 });
  const rafRef = useRef<number>(0);
  const lastRef = useRef(0);
  const viewRef = useRef(view);
  viewRef.current = view;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const draggingRef = useRef(false);

  useEffect(() => {
    const step = (t: number) => {
      if (!draggingRef.current && !pausedRef.current && t - lastRef.current > 50) {
        setView((v) => ({ ...v, lambda: (v.lambda + 0.16) % 360 }));
        lastRef.current = t;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const animateTo = (targetLat: number, targetLon: number) => {
    setPaused(true);
    const cur = viewRef.current;
    let curLam = ((cur.lambda + 180) % 360 + 360) % 360 - 180;
    let dLam = targetLon - curLam; while (dLam > 180) dLam -= 360; while (dLam < -180) dLam += 360;
    const startLam = curLam, startPhi = cur.phi, targetPhi = Math.max(-80, Math.min(80, targetLat));
    const t0 = performance.now(), dur = 950;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      setView((v) => ({ ...v, lambda: startLam + dLam * e, phi: startPhi + (targetPhi - startPhi) * e }));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  if (!month) return null;
  const recs = recordsFor(records, month, gubun).filter((r) => r.lat != null && r.lon != null);
  const mx = Math.max(1, ...recs.map((r) => r.registered || 0));
  const sortedRecs = recs.slice().sort((a, b) => (b.registered || 0) - (a.registered || 0));
  const availConts = new Set(recs.map((r) => CONT_KO[r.continent] || r.continent));

  const rotateToCont = (cont: string) => {
    const crecs = records.filter((r) => r.month === month && r.lat != null && r.lon != null && (CONT_KO[r.continent] || r.continent) === cont);
    if (!crecs.length) return;
    setSelCont(cont); setHl(null); setZoomedIn(false);
    let la = 0, lo = 0; crecs.forEach((r) => { la += r.lat!; lo += r.lon!; });
    animateTo(la / crecs.length, lo / crecs.length);
  };

  const results = query.trim() ? recs.filter((r) => (r.name || '').includes(query) || (r.country || '').includes(query)).slice(0, 12) : [];
  const pick = (r: DiagnosisRecord) => {
    setQuery(r.name); setShowSug(false);
    setHl(r.name); setSelCont(null);
    if (r.lat != null && r.lon != null) { animateTo(r.lat, r.lon); setZoomedIn(true); }
    setOpenDetail(true);
  };

  const hr = hl ? sortedRecs.find((r) => r.name === hl) : null;

  const onPointerDown = (e: React.PointerEvent) => { dragRef.current = { dragging: true, moved: false, lx: e.clientX, ly: e.clientY }; draggingRef.current = true; };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.lx, dy = e.clientY - dragRef.current.ly;
    if (Math.abs(dx) + Math.abs(dy) > 3) { dragRef.current.moved = true; setZoomedIn(false); }
    dragRef.current.lx = e.clientX; dragRef.current.ly = e.clientY;
    setView((v) => ({ ...v, lambda: (v.lambda + dx * 0.3) % 360, phi: Math.max(-89, Math.min(89, v.phi - dy * 0.3)) }));
  };
  const onPointerUp = () => {
    const moved = dragRef.current.moved;
    dragRef.current.dragging = false; draggingRef.current = false;
    if (!moved) { /* click handled by circle onClick */ }
  };

  const viewBox = zoomedIn ? '218 218 244 244' : '0 0 680 680';

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div className="card" style={{ flex: 1, minWidth: 360, paddingBottom: 18 }}>
        <h3>🌐 3D 지구본</h3>
        <div style={{ position: 'relative', maxWidth: 340, margin: '2px 0 10px' }}>
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
        <div style={{ marginBottom: 10 }}>
          <button
            className={`rotbtn${!paused ? ' on' : ''}`}
            onClick={() => {
              const next = !paused; setPaused(next);
              if (!next) { setSelCont(null); setHl(null); setZoomedIn(false); }
            }}
          >
            {paused ? '▶ 자동회전' : '⏸ 회전 정지'}
          </button>
        </div>
        <div className="mapbox" style={{ display: 'flex', justifyContent: 'center', background: 'radial-gradient(circle at 50% 45%,#0c1d38,#070f1f)' }}>
          <svg
            viewBox={viewBox} width={680} height={680}
            style={{ width: '100%', maxWidth: 620, height: 'auto', aspectRatio: '1/1', cursor: dragRef.current.dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
          >
            <defs>
              <radialGradient id="og" cx="37%" cy="30%" r="82%">
                <stop offset="0%" stopColor="#8fcdf2" /><stop offset="45%" stopColor="#4f9fd8" /><stop offset="100%" stopColor="#2b6aa8" />
              </radialGradient>
              <radialGradient id="atmo" cx="50%" cy="50%" r="50%">
                <stop offset="89%" stopColor="#7fc8ff" stopOpacity={0} /><stop offset="95%" stopColor="#9ad7ff" stopOpacity={0.75} /><stop offset="100%" stopColor="#cdeeff" stopOpacity={0} />
              </radialGradient>
              <filter id="atmoBlur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={4} /></filter>
              <filter id="mkGlowG" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx={0} dy={0.5} stdDeviation={0.7} floodColor="#0a1c30" floodOpacity={0.5} /></filter>
            </defs>
            <circle cx={view.cx} cy={view.cy} r={view.R + 18} fill="url(#atmo)" filter="url(#atmoBlur)" />
            <circle cx={view.cx} cy={view.cy} r={view.R} fill="url(#og)" stroke="#9ad7ff" strokeWidth={1.5} strokeOpacity={0.9} />
            <path fill="none" stroke="rgba(160,200,245,0.18)" strokeWidth={0.5} d={globeGratD(view)} />
            <g>
              {globeContinents().map((c) => {
                const d = globeContPath(c, view); if (!d) return null;
                const sel = selCont === c;
                let fill, fo, stroke, sw, so;
                if (!selCont) { fill = '#d3d6be'; fo = 0.94; stroke = '#a2a986'; sw = 0.4; so = 0.5; }
                else if (sel) { fill = c === '_default' ? '#d3d6be' : (CONT_COLORS[c] || '#d3d6be'); fo = 0.96; stroke = '#ffffff'; sw = 1.0; so = 0.9; }
                else { fill = '#c0c69c'; fo = 0.5; stroke = '#a2a986'; sw = 0.3; so = 0.4; }
                return <path key={c} d={d} fill={fill} fillOpacity={fo} stroke={stroke} strokeWidth={sw} strokeOpacity={so} />;
              })}
            </g>
            <g filter="url(#mkGlowG)">
              {sortedRecs.map((r) => {
                if (hl && r.name !== hl) return null;
                const a = orthoPt(r.lat!, r.lon!, view); if (!a[2]) return null;
                const rad = 2 + Math.sqrt((r.registered || 0) / mx) * 13;
                const color = jipaColors[r.jipa] || '#888';
                const focus = !selCont || (CONT_KO[r.continent] || r.continent) === selCont;
                return (
                  <circle
                    key={r.recordId} style={{ cursor: 'pointer' }} cx={a[0]} cy={a[1]} r={rad} fill={color}
                    fillOpacity={focus ? 0.85 : 0.2} stroke="#fff" strokeWidth={0.4} strokeOpacity={focus ? 0.6 : 0}
                    onClick={() => { if (!dragRef.current.moved) { setHl(r.name); setOpenDetail(true); } }}
                  >
                    <title>{r.name} ({r.jipa}){'\n'}{r.country || ''}{'\n'}현재적 {fmt(r.registered)}</title>
                  </circle>
                );
              })}
              {hl && hr && hr.lat != null && (() => {
                const a = orthoPt(hr.lat, hr.lon!, view); if (!a[2]) return null;
                const rad = 2 + Math.sqrt((hr.registered || 0) / mx) * 13;
                return (
                  <circle cx={a[0]} cy={a[1]} r={rad + 6} fill="none" stroke="#ff2d55" strokeWidth={2.5} pointerEvents="none">
                    <animate attributeName="r" values={`${rad + 3};${rad + 15};${rad + 3}`} dur="1.3s" repeatCount="indefinite" />
                    <animate attributeName="stroke-opacity" values="1;0.12;1" dur="1.3s" repeatCount="indefinite" />
                  </circle>
                );
              })()}
            </g>
          </svg>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12, justifyContent: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginRight: 2 }}>대륙 클릭 → 정면 회전</span>
          {Object.keys(CONT_COLORS).filter((c) => CONT_COLORS[c] !== '#94a3bd' && availConts.has(c)).map((c) => (
            <span key={c} onClick={() => rotateToCont(c)} title={`${c}를 정면으로 회전`} style={{ fontSize: 12.5, color: 'var(--muted)', cursor: 'pointer', padding: '5px 11px', borderRadius: 8, border: '1px solid var(--line)' }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: CONT_COLORS[c], marginRight: 6, verticalAlign: 'middle' }} />{c}
            </span>
          ))}
        </div>
      </div>
      <div className="card" style={{ width: 330, flexShrink: 0, minHeight: 300 }}>
        {hl ? <EntityCompactPanel name={hl} onOpenFull={() => setOpenDetail(true)} onOpenDiag={(name) => navigate(`/diag?entity=${encodeURIComponent(name)}`)} /> : <PanelHint />}
      </div>
      {openDetail && hl && <EntityDetailModal target={{ name: hl, kind: 'entity' }} gubun={gubun} onClose={() => setOpenDetail(false)} />}
    </div>
  );
};
