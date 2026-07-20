import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { diagnosisService } from '../../services/diagnosisService';

export const DiagnosisPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  const filterByAssignedLocation = (records: any[]) => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return records;
    try {
      const u = JSON.parse(userStr);
      const role = u.role || 'ROLE_USER';
      const assignedLocation = u.assignedCountry || '전체';

      if (role === 'ROLE_ADMIN' || role === 'ADMIN' || role === '관리자' || assignedLocation === '전체') {
        return records;
      }

      return records.filter((r: any) =>
        r.name === assignedLocation ||
        r.country === assignedLocation ||
        `${r.jipa} · ${r.name}` === assignedLocation
      );
    } catch (e) {
      return records;
    }
  };

  useEffect(() => {
    // 0-1. Strict Auth Guard: Redirect to /login if unauthenticated
    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');

    if (!token && !userStr) {
      navigate('/login', { replace: true });
      return;
    }

    const baseUrl = (import.meta as any).env?.BASE_URL || '/OverseasPortal/';
    const getUrl = (path: string) => baseUrl.endsWith('/') ? baseUrl + path : baseUrl + '/' + path;

    // Global Window Functions for Logout & Admin System Buttons
    (window as any).handleUserLogout = () => {
      if (window.confirm("정말 로그아웃 하시겠습니까?")) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        navigate('/login', { replace: true });
      }
    };

    (window as any).handleGoToAdminSystem = () => {
      navigate('/adminsetting/dashboard');
    };

    // Show Admin System Button if logged in as Admin
    setTimeout(() => {
      try {
        if (userStr) {
          const u = JSON.parse(userStr);
          const role = u.role || '';
          if (role === 'ROLE_ADMIN' || role === 'ADMIN' || role === '관리자') {
            const adminBtn = document.getElementById('btnAdminSystem');
            if (adminBtn) adminBtn.style.display = 'inline-flex';
          }
        }
      } catch (e) {}
    }, 200);

    // 0-2. Dynamic CSS Loader
    const loadCss = (id: string, href: string) => {
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
      }
    };

    loadCss('diag-engine-css', getUrl('assets/diagnosisEngine.css'));

    const initEngine = async () => {
      // 1. Try to fetch live records from Spring Boot API (/api/v1/diagnosis/records)
      try {
        const months = await diagnosisService.getMonths();
        if (months && months.length > 0) {
          const currentMonth = months[0];
          const apiRecords = await diagnosisService.getRecords(currentMonth);

          if (apiRecords && apiRecords.length > 0) {
            const filteredApiRecords = filterByAssignedLocation(apiRecords);

            (window as any).DATA = {
              months: (window as any).DATA?.months || months.map((m: string) => m.endsWith('월') ? m : m.substring(5) + '월'),
              jipaOrder: (window as any).DATA?.jipaOrder || ["맛디아", "서울", "무등", "베드로", "요한"],
              jipaColors: (window as any).DATA?.jipaColors || { "맛디아": "#6FBA2C", "서울": "#6FBA2C", "무등": "#3b82f6", "베드로": "#06b6d4", "요한": "#f59e0b" },
              records: filteredApiRecords.map((r: any) => ({
                ...r,
                month: r.month ? (r.month.endsWith('월') ? r.month : r.month.substring(5) + '월') : '5월'
              }))
            };
          }
        }
      } catch (err) {
        console.warn("Spring Boot API unavailable or empty, using embedded data.js:", err);
      }

      // Filter embedded data.js if fallback was used
      if ((window as any).DATA && (window as any).DATA.records) {
        (window as any).DATA.records = filterByAssignedLocation((window as any).DATA.records);
      }

      // 2. Trigger Diagnosis Engine Initialization
      if (typeof (window as any).startDiagnosisApp === 'function') {
        (window as any).startDiagnosisApp();
      }
      if (typeof (window as any).buildSidebar === 'function') {
        (window as any).buildSidebar();
      }
      if (typeof (window as any).render === 'function') {
        (window as any).render();
      }
    };

    // Sequential Script Loader: data.js -> diagnosisEngine.js -> initEngine
    const loadScript = (id: string, src: string): Promise<void> => {
      return new Promise((resolve) => {
        if (document.getElementById(id)) {
          resolve();
          return;
        }
        const s = document.createElement('script');
        s.id = id;
        s.src = src;
        s.onload = () => resolve();
        document.body.appendChild(s);
      });
    };

    loadScript('data-js-script', getUrl('data.js'))
      .then(() => loadScript('diag-engine-script', getUrl('assets/diagnosisEngine.js')))
      .then(() => {
        initEngine();
      });
  }, [navigate]);

  return (
    <div
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: `
<div id="introScreen">
  <div id="introStars"></div>
  <select class="langSel in-langsel" onchange="setLang(this.value)" title="Language / 语言 / 言語">
    <option value="ko">한국어</option><option value="en">English</option><option value="zh">中文</option><option value="ja">日本語</option>
  </select>
  <div class="in-wrap">
    <div class="in-visual">
      <div class="in-orbit"><i></i><i></i><i></i><i></i></div>
      <canvas id="flagGlobe" class="in-globe" width="600" height="600"></canvas>
    </div>
    <div class="in-panel">
      <div class="in-eyebrow">GLOBAL MISSION DASHBOARD</div>
      <div class="in-title" id="inTitle">계시록의 실상,<br><b>만국(萬國)</b>으로 흐르다</div>
      <div class="in-mission" id="inMission">전 세계 해외교회의 걸음을 한자리에서 봅니다.<br>
        양(量)에 속지 않고 <b>질(質)</b>을 보며, 확인을 넘어 <b>행함</b>으로.</div>
      <div class="in-stats" id="introStats"></div>
      <div class="in-login">
        <div class="in-field">
          <span class="lk">&#128274;</span>
          <input id="introPw" type="password" autocomplete="off" placeholder="접속 암호를 입력하세요">
          <button id="introEye" type="button" title="암호 표시">&#128065;</button>
        </div>
        <button id="introEnter" type="button">들어가기 &rarr;</button>
        <div class="in-err" id="introErr"></div>
      </div>
    </div>
  </div>
  <div class="in-foot" id="introFoot"></div>
</div>

<div class="topbar">
  <div class="logo">🌐</div>
  <div class="brandwrap">
    <div class="brand" id="tbBrand">해외선교부 <b>업무포탈</b></div>
    <div class="brandsub">GLOBAL MISSION DASHBOARD</div>
  </div>
  <span class="spacer"></span>
  <div class="months" id="months"></div>
  <div class="searchwrap">
    <span class="si">🔍</span>
    <input class="searchin" id="globalSearch" placeholder="교회명 검색…" autocomplete="off">
    <div class="searchsug" id="searchSug"></div>
  </div>
  <select class="langSel tb-langsel" onchange="setLang(this.value)" title="Language / 语言 / 言語">
    <option value="ko">한국어</option><option value="en">English</option><option value="zh">中文</option><option value="ja">日本語</option>
  </select>
  <button class="repbtn" id="btnCover" onclick="showIntro()" title="인트로 화면으로 돌아가기">🏠 인트로</button>
  <button class="repbtn" id="btnShare" onclick="openShareModal()" title="선택한 교회/구역의 데이터를 포함한 Standalone HTML 파일을 생성합니다">📤 공유</button>
  <button class="repbtn" id="btnPrint" onclick="window.print()" title="선택한 교회의 진단서만 컬러로 인쇄 — 인쇄창에서 '대상: PDF로 저장'을 고르면 컬러 PDF로 저장됩니다">📄 출력 · PDF 저장</button>
  <button class="repbtn" id="btnAdminSystem" onclick="handleGoToAdminSystem()" style="display:none;background:#2563eb;color:white;border:none;font-weight:700" title="관리자 시스템으로 이동">⚙️ 관리자 시스템</button>
  <button class="repbtn" id="btnLogout" onclick="handleUserLogout()" style="background:#ef4444;color:white;border:none;font-weight:700" title="로그아웃">🔒 로그아웃</button>
</div>

<div class="shell">
  <nav class="side" id="side"></nav>
  <main class="main">
    <div id="homeview"></div>
    <div id="diagview" style="display:none"></div>

    <div class="chips" id="chips"></div>
    <div class="kpis" id="kpis"></div>
    <div id="mapGlobeToggle" class="toggle" style="display:none;margin-bottom:14px">
      <button data-v="map" class="on">🗺️ 평면지도</button>
      <button data-v="globe">🌐 3D 지구본</button>
    </div>
    <div id="ctrlbar"></div>

    <div id="dataview">
      <div id="secinfo"></div>
      <div class="subtabs" id="subtabs"></div>
      <div class="homerow" id="secCharts" style="display:none"></div>
      <div class="grid" id="mainGrid">
        <div class="card">
          <h3 id="barTtl">순위</h3>
          <div class="desc" id="barDesc"></div>
          <div class="bars" id="bars"></div>
        </div>
        <div class="card">
          <h3 id="tblTtl">상세 표</h3>
          <div class="desc">행을 클릭하면 해당 대상의 전체 현황(추이 포함)을 볼 수 있습니다.</div>
          <div class="tblwrap"><table id="tbl"></table></div>
        </div>
      </div>
      <div id="trendview" style="display:none"></div>
      <div id="inspectview" style="display:none"></div>
      <div id="funnelview" style="display:none"></div>
    </div>

    <div id="mapview">
      <div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap;">
        <div class="card" style="flex:1;min-width:360px;padding-bottom:18px;">
          <h3>🗺️ 지리적 분포</h3>
          <div style="display:flex;align-items:center;gap:10px;margin:2px 0 10px;flex-wrap:wrap">
            <div style="position:relative;flex:1;min-width:200px;max-width:340px">
              <input id="mapSearchInp" placeholder="🔍 교회·지역명 검색" autocomplete="off" oninput="mapSearchInput()" style="width:100%;padding:8px 12px;border:1px solid var(--line);border-radius:9px;font-size:13px;box-sizing:border-box">
              <div id="mapSug" style="display:none;position:absolute;z-index:30;left:0;right:0;top:calc(100% + 3px);background:#fff;border:1px solid var(--line);border-radius:9px;box-shadow:0 8px 24px rgba(0,0,0,.12);max-height:280px;overflow:auto"></div>
            </div>
            <button id="mapResetBtn" onclick="resetMapZoom()" class="rotbtn" style="display:none">🌐 전체 보기</button>
          </div>
          <div class="mapbox"><svg id="map" viewBox="0 0 1000 500" width="1000" height="500" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;display:block;aspect-ratio:2/1;"></svg></div>
          <div id="maplegend" style="display:flex;flex-wrap:wrap;gap:10px;margin-top:12px;"></div>
        </div>
        <div class="card" id="mapInfo" style="width:330px;flex-shrink:0;min-height:300px;"></div>
      </div>
    </div>

    <div id="globeview">
      <div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap;">
        <div class="card" style="flex:1;min-width:360px;padding-bottom:18px;">
          <h3>🌐 3D 지구본</h3>
          <div style="position:relative;max-width:340px;margin:2px 0 10px">
            <input id="globeSearchInp" placeholder="🔍 교회·지역명 검색" autocomplete="off" oninput="globeSearchInput()" style="width:100%;padding:8px 12px;border:1px solid var(--line);border-radius:9px;font-size:13px;box-sizing:border-box">
            <div id="globeSug" style="display:none;position:absolute;z-index:30;left:0;right:0;top:calc(100% + 3px);background:#fff;border:1px solid var(--line);border-radius:9px;box-shadow:0 8px 24px rgba(0,0,0,.12);max-height:280px;overflow:auto"></div>
          </div>
          <div style="margin-bottom:10px"><button id="globeRotBtn" onclick="toggleGlobeRot()" class="rotbtn on">⏸ 회전 정지</button></div>
          <div class="mapbox" style="display:flex;justify-content:center;background:radial-gradient(circle at 50% 45%,#0c1d38,#070f1f);">
            <svg id="globe" viewBox="0 0 680 680" width="680" height="680"
                 style="width:100%;max-width:620px;height:auto;aspect-ratio:1/1;cursor:grab;touch-action:none;"></svg>
          </div>
          <div id="globelegend" style="display:flex;flex-wrap:wrap;gap:10px;margin-top:12px;justify-content:center;"></div>
        </div>
        <div class="card" id="globeInfo" style="width:330px;flex-shrink:0;min-height:300px;"></div>
      </div>
    </div>

    <div class="foot"></div>
  </main>
</div>

<div class="ovl" id="ovl"><div class="modal" id="modal"></div></div>

<button id="toTop" onclick="goTop()" title="맨 위로" aria-label="맨 위로">↑</button>
      ` }}
    />
  );
};
