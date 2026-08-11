import React, { useEffect, useRef, useState } from 'react';
import { FLAG_IMAGES } from '../../../data/flagImages';
import { UI_TR, Lang } from '../../../utils/diagnosisI18n';
import { useDiagnosisData } from '../../../contexts/DiagnosisDataContext';

// 2차 접속 암호(사내 공유 암호, 실제 로그인과는 별개의 추가 게이트). Ported 1:1 from diagnosisEngine.js ACCESS_PW.
const ACCESS_PW = 'manguk-0759';

/** 인트로 화면의 회전 지구본(국기 텍스처 구체, 픽셀 단위 조명 계산). Ported 1:1 from initFlagGlobe(). */
const FlagGlobeCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    const codes = Object.keys(FLAG_IMAGES);
    if (!cv || !codes.length) return;

    let cancelled = false;
    const imgs: HTMLImageElement[] = [];
    let done = 0;

    const SZ = 600, cx = SZ / 2, cy = SZ / 2, R = SZ / 2 - 10, TW = 1400, TH = 700, N = SZ * SZ;
    const mask = new Uint8Array(N), lonBase = new Float32Array(N), vRow = new Int32Array(N), shade = new Float32Array(N), spec = new Float32Array(N);
    let texData: Uint8ClampedArray | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
    let out: ImageData | null = null;
    let rafId = 0;

    function rrect(t: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
      t.beginPath(); t.moveTo(x + r, y); t.arcTo(x + w, y, x + w, y + h, r); t.arcTo(x + w, y + h, x, y + h, r); t.arcTo(x, y + h, x, y, r); t.arcTo(x, y, x + w, y, r); t.closePath();
    }
    function buildTexture() {
      const tc = document.createElement('canvas'); tc.width = TW; tc.height = TH;
      const t = tc.getContext('2d')!;
      t.fillStyle = '#eef2f7'; t.fillRect(0, 0, TW, TH);
      const cols = 22, rows = 14;
      const cw = TW / cols, ch = TH / rows, g = Math.min(cw, ch) * 0.13;
      const seq: HTMLImageElement[] = []; let pool: HTMLImageElement[] = [];
      for (let i = 0; i < cols * rows; i++) { if (!pool.length) pool = imgs.slice().sort(() => Math.random() - 0.5); seq.push(pool.pop()!); }
      let k = 0;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const im = seq[k++], x = c * cw + g / 2, y = r * ch + g / 2, w = cw - g, h = ch - g, rad = Math.min(w, h) * 0.15;
        t.save(); t.shadowColor = 'rgba(20,36,74,.35)'; t.shadowBlur = 4; t.shadowOffsetY = 2; t.fillStyle = '#fff'; rrect(t, x, y, w, h, rad); t.fill(); t.restore();
        t.save(); rrect(t, x, y, w, h, rad); t.clip(); try { t.drawImage(im, x, y, w, h); } catch { /* ignore */ } t.restore();
        t.save(); rrect(t, x + 0.6, y + 0.6, w - 1.2, h - 1.2, rad); t.strokeStyle = 'rgba(255,255,255,.6)'; t.lineWidth = 1; t.stroke(); t.restore();
      }
      texData = t.getImageData(0, 0, TW, TH).data;
    }
    function precompute() {
      const Lx = -0.38, Ly = 0.44, Lz = 0.81, Ln = Math.hypot(Lx, Ly, Lz), lx = Lx / Ln, ly = Ly / Ln, lz = Lz / Ln;
      for (let py = 0; py < SZ; py++) for (let px = 0; px < SZ; px++) {
        const idx = py * SZ + px, x = (px + 0.5 - cx) / R, y = (py + 0.5 - cy) / R, d2 = x * x + y * y;
        if (d2 > 1) { mask[idx] = 0; continue; }
        mask[idx] = 1;
        const z = Math.sqrt(1 - d2), nx = x, ny = -y, nz = z, lat = Math.asin(ny);
        lonBase[idx] = Math.atan2(nx, nz);
        let vy = (1 - (lat / Math.PI + 0.5)) * (TH - 1); vRow[idx] = vy < 0 ? 0 : (vy > TH - 1 ? TH - 1 : vy | 0);
        const diff = Math.max(0, nx * lx + ny * ly + nz * lz);
        shade[idx] = (0.6 + 0.5 * diff) * (0.82 + 0.18 * nz); spec[idx] = Math.pow(diff, 14) * 66;
      }
    }
    function render(off: number) {
      if (!out || !ctx || !texData) return;
      const p = out.data;
      for (let idx = 0, o = 0; idx < N; idx++, o += 4) {
        if (!mask[idx]) { p[o + 3] = 0; continue; }
        let u = (lonBase[idx] + off) / (2 * Math.PI) + 0.5; u -= Math.floor(u);
        const ti = (vRow[idx] * TW + ((u * TW) | 0)) * 4, s = shade[idx], sp = spec[idx];
        const r = texData[ti] * s + sp, g = texData[ti + 1] * s + sp, b = texData[ti + 2] * s + sp;
        p[o] = r > 255 ? 255 : r; p[o + 1] = g > 255 ? 255 : g; p[o + 2] = b > 255 ? 255 : b; p[o + 3] = 255;
      }
      ctx.putImageData(out, 0, 0);
    }
    let off = 0;
    function loop() { if (cancelled) return; off += 0.0024; render(off); rafId = requestAnimationFrame(loop); }
    function start() { ctx = cv!.getContext('2d'); out = ctx!.createImageData(SZ, SZ); buildTexture(); precompute(); loop(); }

    codes.forEach((c) => {
      const im = new Image();
      im.onload = im.onerror = () => { if (++done === codes.length && !cancelled) start(); };
      im.src = FLAG_IMAGES[c];
      imgs.push(im);
    });

    return () => { cancelled = true; if (rafId) cancelAnimationFrame(rafId); };
  }, []);

  return <canvas ref={canvasRef} className="in-globe" width={600} height={600} />;
};

interface IntroGateProps {
  visible: boolean;
  onEnter: () => void;
}

/** 로그인 이후 추가로 뜨는 2차 공유암호 게이트 + 라이브 통계 인트로 화면. Ported 1:1 from initIntro(). */
export const IntroGate: React.FC<IntroGateProps> = ({ visible, onEnter }) => {
  const { records, months, jipaOrder, lang, setLang } = useDiagnosisData();
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible) {
      setPw(''); setErr(false);
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [visible]);

  if (!ACCESS_PW) return null; // 공유 암호가 설정되지 않은 배포본은 게이트 자체를 표시하지 않음

  const L: Lang = lang;
  const t = (key: keyof typeof UI_TR) => UI_TR[key][L] || UI_TR[key].ko;

  const latestMonth = months[months.length - 1];
  const recs = latestMonth ? records.filter((r) => r.month === latestMonth) : [];
  const nChurch = recs.filter((r) => r.gubun === '교회').length;
  const nRegion = recs.filter((r) => r.gubun === '지역').length;
  const nPion = recs.filter((r) => r.gubun === '개척지').length;
  const nCountry = new Set(recs.map((r) => r.country).filter((c) => c && c !== '-')).size;
  const nJipa = jipaOrder.length;

  const handleEnter = () => {
    if (pw.trim() !== ACCESS_PW) {
      setErr(true); setShake(true);
      setTimeout(() => setShake(false), 450);
      setPw(''); inputRef.current?.focus();
      return;
    }
    setErr(false);
    onEnter();
  };

  return (
    <div id="introScreen" className={visible ? '' : 'hide'}>
      <div id="introStars" />
      <select className="langSel in-langsel" value={lang} onChange={(e) => setLang(e.target.value as Lang)} title="Language / 语言 / 言語">
        <option value="ko">한국어</option>
        <option value="en">English</option>
        <option value="zh">中文</option>
        <option value="ja">日本語</option>
      </select>
      <div className="in-wrap">
        <div className="in-visual">
          <div className="in-orbit"><i /><i /><i /><i /></div>
          <FlagGlobeCanvas />
        </div>
        <div className="in-panel">
          <div className="in-eyebrow">GLOBAL MISSION DASHBOARD</div>
          <div className="in-title" dangerouslySetInnerHTML={{ __html: t('title') }} />
          <div className="in-mission" dangerouslySetInnerHTML={{ __html: t('mission') }} />
          <div className="in-stats">
            <div className="in-stat"><b>{nChurch}{UI_TR.unit[L]}</b><span>{UI_TR.stChurch[L]}</span></div>
            <div className="in-stat"><b>{nRegion}{UI_TR.unit[L]}</b><span>{UI_TR.stRegion[L]}</span></div>
            <div className="in-stat"><b>{nPion}{UI_TR.unit[L]}</b><span>{UI_TR.stPion[L]}</span></div>
            <div className="in-stat"><b>{nCountry}<i className="u">{UI_TR.suffCountry[L]}</i></b><span>{nJipa}{UI_TR.suffJipa[L]}</span></div>
          </div>
          <div className="in-login">
            <div className={`in-field${err ? ' bad' : ''}${shake ? ' shake' : ''}`}>
              <span className="lk">🔒</span>
              <input
                ref={inputRef}
                type={showPw ? 'text' : 'password'}
                autoComplete="off"
                placeholder={t('pw')}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleEnter(); }}
              />
              <button type="button" title="암호 표시" onClick={() => setShowPw((v) => !v)}>👁</button>
            </div>
            <button type="button" onClick={handleEnter} dangerouslySetInnerHTML={{ __html: t('enter') }} />
            <div className={`in-err${err ? ' on' : ''}`}>{err ? (UI_TR.pwErr[L] || UI_TR.pwErr.ko) : ''}</div>
          </div>
        </div>
      </div>
      <div className="in-foot" />
    </div>
  );
};
