import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { diagnosisService } from '../../services/diagnosisService';
import { logService } from '../../services/logService';
import { sessionService } from '../../services/sessionService';
import { EvangelismModule } from '../../components/user/EvangelismModule';
import { ApprovalModule } from '../../components/user/ApprovalModule';
import { roleService } from '../../services/roleService';
import api from '../../services/api';

interface DiagnosisPageProps {
  section?: string;
  tab?: 'check' | 'aggregate';
}

export const DiagnosisPage: React.FC<DiagnosisPageProps> = ({ section = 'home', tab = 'check' }) => {
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
    // 0-1. Strict 30-Minute Session Guard: Redirect to /login if unauthenticated or expired
    if (!sessionService.isSessionValid()) {
      navigate('/login', { replace: true });
      return;
    }

    const userStr = localStorage.getItem('user');
    let userRole = 'ROLE_USER';
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        userRole = u.role || 'ROLE_USER';
      } catch (e) {}
    }

    (window as any).reactNavigate = (path: string) => {
      const cleanPath = path.startsWith('/') ? path : '/' + path;
      navigate(cleanPath);
    };

    // Redirect /evangelism to /evangelism/check or /evangelism/aggregate ONLY IF user lacks access to the main p1 dashboard
    if (section === 'evangelism') {
      const cleanRole = userRole.toUpperCase().startsWith('ROLE_') ? userRole.toUpperCase() : `ROLE_${userRole.toUpperCase()}`;
      let normRole = cleanRole;
      if (cleanRole === 'ROLE_해외선교부 담당자' || cleanRole === 'ROLE_USER') {
        normRole = 'ROLE_USER';
      } else if (cleanRole === 'ROLE_지파 담당자' || cleanRole === 'ROLE_JIPA') {
        normRole = 'ROLE_JIPA';
      } else if (cleanRole === 'ROLE_일반 회원' || cleanRole === 'ROLE_GUEST') {
        normRole = 'ROLE_GUEST';
      }

      const isAdmin = normRole === 'ROLE_ADMIN' || normRole === 'ADMIN' || normRole === 'ROLE_관리자';
      const hasMainAccess = isAdmin || roleService.canRoleAccessMenu(userRole, 'p1').read;

      if (!hasMainAccess) {
        const canCheck = roleService.canRoleAccessMenu(userRole, 'p1_check').read;
        const canAgg = roleService.canRoleAccessMenu(userRole, 'p1_agg').read;
        if (canCheck) {
          navigate('/evangelism/check', { replace: true });
        } else if (canAgg) {
          navigate('/evangelism/aggregate', { replace: true });
        } else {
          alert("해당 메뉴에 대한 접근 권한이 없습니다.");
          navigate('/', { replace: true });
        }
        return;
      }
    }

    const sectionToMenuKey: Record<string, string> = {
      'home': 'home',
      'diag': 'diag',
      'inspect': 'inspect',
      'funnel': 'funnel',
      'trend': 'trend',
      'map': 'map',
      'globe': 'globe',
      'evangelism': 'p1',
      'evangelism/check': 'p1_check',
      'evangelism/aggregate': 'p1_agg',
      'center': 'p2',
      'membership': 'p3',
      'worship': 'p4',
      'approvals/pending': 'approvals_pending',
      'approvals/completed': 'approvals_completed'
    };

    const targetKey = sectionToMenuKey[section] || section;
    const cleanRole = userRole.toUpperCase().startsWith('ROLE_') ? userRole.toUpperCase() : `ROLE_${userRole.toUpperCase()}`;
    let normRole = cleanRole;
    if (cleanRole === 'ROLE_해외선교부 담당자' || cleanRole === 'ROLE_USER') {
      normRole = 'ROLE_USER';
    } else if (cleanRole === 'ROLE_지파 담당자' || cleanRole === 'ROLE_JIPA') {
      normRole = 'ROLE_JIPA';
    } else if (cleanRole === 'ROLE_일반 회원' || cleanRole === 'ROLE_GUEST') {
      normRole = 'ROLE_GUEST';
    }

    console.warn("DiagnosisPage Auth Guard Check:", { section, targetKey, userRole, normRole });

    if (normRole !== 'ROLE_ADMIN' && normRole !== 'ADMIN' && normRole !== 'ROLE_관리자') {
      const access = roleService.canRoleAccessMenu(userRole, targetKey);
      console.warn("canRoleAccessMenu result:", access);
      if (!access.read) {
        alert("해당 메뉴에 대한 접근 권한이 없습니다.");
        const permissions = roleService.getMenuPermissions();
        const accessible = permissions.find(m => {
          const mPerm = m.permissions[normRole] || { read: false };
          return mPerm.read && !m.path.startsWith('/adminsetting');
        });
        if (accessible) {
          navigate(accessible.path, { replace: true });
        } else {
          sessionService.clearSession();
          navigate('/login', { replace: true });
        }
        return;
      }
    }

    // Record Access Log for User Diagnosis Portal Section Page
    const sectionLabels: Record<string, string> = {
      home: '🏠 해외 총괄 요약',
      diag: '🩺 교회 진단서',
      inspect: '🚨 점검 (양·질)',
      funnel: '🚦 관문별 통과율',
      trend: '📈 12개월 추이',
      map: '🗺️ 지리적 분포 (지도)',
      globe: '🌐 3D 지구본',
      evangelism: '① 전도 · 가개강 종합 포탈',
      center: '② 센터',
      membership: '③ 내무',
      worship: '④ 예배 · 전성도'
    };
    const currentLabel = sectionLabels[section] || '🏠 사용자 진단서 포탈';
    const currentPath = section === 'home' ? '/' : `/${section}`;
    logService.addAccessLog(currentLabel, currentPath);

    const baseUrl = (import.meta as any).env?.BASE_URL || '/OverseasPortal/';
    const getUrl = (path: string) => baseUrl.endsWith('/') ? baseUrl + path : baseUrl + '/' + path;

    // Global Window Functions for Logout & Admin System Buttons
    (window as any).handleUserLogout = () => {
      if (window.confirm("정말 로그아웃 하시겠습니까?")) {
        sessionService.clearSession();
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

    const syncEvangelismDbData = async (rawDataRecords: any[]) => {
      try {
        const res = await api.get<any[]>('/evangelism/records');
        const weeklyRecords = res.data || [];
        if (!(window as any).DATA) (window as any).DATA = {};
        (window as any).DATA.weeklyRecords = weeklyRecords;

        if (weeklyRecords.length === 0) {
          return { syncedRecords: rawDataRecords, weeklyRecords };
        }

        const getMonthFromWeekKey = (weekKey: string): string => {
          const match = weekKey.match(/^(\d+월)/);
          return match ? match[1] : '';
        };

        const getMonthNum = (mStr: string): number => {
          const match = mStr.match(/(\d+)월/);
          return match ? parseInt(match[1]) : 0;
        };

        const getYearNum = (str: string): number => {
          const match = str.match(/^(\d+)년/);
          return match ? parseInt(match[1]) : 2026;
        };

        const grouped: Record<string, Record<string, any[]>> = {};
        weeklyRecords.forEach(r => {
          const church = r.churchName;
          const monthPart = getMonthFromWeekKey(r.weekKey);
          if (!monthPart) return;

          const yearPart = r.yearStr ? (r.yearStr.endsWith('년') ? r.yearStr : r.yearStr + '년') : '2026년';
          const fullMonth = `${yearPart} ${monthPart}`;

          if (!grouped[church]) grouped[church] = {};
          if (!grouped[church][fullMonth]) grouped[church][fullMonth] = [];
          grouped[church][fullMonth].push(r);
        });

        const updatedRecords = rawDataRecords.map(rec => {
          const church = rec.name;
          const m = rec.month; // e.g. "2026년 6월"
          const currentYear = getYearNum(m);

          const churchGroup = grouped[church];
          if (!churchGroup) return rec;

          const matchedMonthKey = Object.keys(churchGroup).find(k => 
            k === m || k.replace(/\s+/g,'') === m.replace(/\s+/g,'')
          );

          if (!matchedMonthKey) return rec;

          const weeksInMonth = churchGroup[matchedMonthKey];

          const sortedWeeks = [...new Set(weeksInMonth.map(w => w.weekKey))].sort((a, b) => b.localeCompare(a));
          const lastWeek = sortedWeeks[0];
          const lastWeekRecs = weeksInMonth.filter(w => w.weekKey === lastWeek);
          
          const evangRegSum = lastWeekRecs.reduce((sum, w) => sum + (w.regCount || 0), 0);
          const bibleMonthRegSum = weeksInMonth.reduce((sum, w) => sum + (w.admitCount || 0), 0);
          const bibleCurAttSum = lastWeekRecs.reduce((sum, w) => sum + (w.gospelCount || 0), 0);

          const allChurchWeeklyRecs = weeklyRecords.filter(w => w.churchName === church);
          const limitMonthNum = getMonthNum(matchedMonthKey);
          const bibleCumRegSum = allChurchWeeklyRecs.reduce((sum, w) => {
            const wYear = w.yearStr ? parseInt(w.yearStr.replace(/[^0-9]/g, '')) : 2026;
            if (wYear !== currentYear) return sum;

            const wMonth = getMonthFromWeekKey(w.weekKey);
            if (getMonthNum(wMonth) <= limitMonthNum) {
              return sum + (w.admitCount || 0);
            }
            return sum;
          }, 0);

          return {
            ...rec,
            evangReg: evangRegSum,
            bibleMonthReg: bibleMonthRegSum,
            bibleCumReg: bibleCumRegSum,
            bibleCurAtt: bibleCurAttSum
          };
        });

        return { syncedRecords: updatedRecords, weeklyRecords };
      } catch (err) {
        console.error("Failed to sync database evangelism records", err);
        return { syncedRecords: rawDataRecords, weeklyRecords: [] };
      }
    };

    const formatMonth = (mStr: string) => {
      if (!mStr) return '2026년 5월';
      if (mStr.includes('년') && mStr.includes('월')) return mStr;
      const match = mStr.match(/^(\d{4})-(\d{2})$/);
      if (match) {
        return `${match[1]}년 ${parseInt(match[2])}월`;
      }
      return mStr;
    };

    const updateDebugInfo = (status: string, err?: any) => {
      const debugEl = document.getElementById('debugContent');
      if (debugEl) {
        const u = localStorage.getItem('user');
        const d = (window as any).DATA;
        const st = (window as any).ST || {};
        debugEl.innerHTML = `
          <div style="margin-bottom:4px"><b>Status:</b> ${status}</div>
          <div style="margin-bottom:4px;word-break:break-all"><b>User:</b> ${u ? u.slice(0, 100) : 'null'}</div>
          <div style="margin-bottom:4px"><b>DATA.records:</b> ${d?.records?.length || 0}</div>
          <div style="margin-bottom:4px"><b>DATA.weeklyRecords:</b> ${d?.weeklyRecords?.length || 0}</div>
          <div style="margin-bottom:4px"><b>ST.month:</b> ${st.month || 'null'}</div>
          <div style="margin-bottom:4px"><b>ST.week:</b> ${st.week || 'null'}</div>
          <div style="margin-bottom:4px"><b>ST.section:</b> ${st.section || 'null'}</div>
          ${err ? `<div style="color:#f87171;margin-top:6px"><b>Error:</b> ${err.message || JSON.stringify(err)}</div>` : ''}
        `;
      }
    };

    const initEngine = async () => {
      updateDebugInfo('Init started');

      try {
        const months = await diagnosisService.getMonths();
        updateDebugInfo(`Fetched months: ${months?.length || 0}`);
        
        if (months && months.length > 0) {
          const apiRecords = await diagnosisService.getRecords("all");
          updateDebugInfo(`Fetched records: ${apiRecords?.length || 0}`);

          const filteredApiRecords = apiRecords ? filterByAssignedLocation(apiRecords) : [];
          updateDebugInfo(`Filtered records: ${filteredApiRecords.length}`);

          const mappedRecords = filteredApiRecords.map((r: any) => ({
            ...r,
            month: formatMonth(r.month)
          }));

          const { syncedRecords, weeklyRecords } = await syncEvangelismDbData(mappedRecords);
          updateDebugInfo(`Synced weekly records: ${weeklyRecords.length}`);

          const d = (window as any).DATA || {};
          d.months = months.map((m: string) => formatMonth(m));
          d.records = syncedRecords;
          d.weeklyRecords = weeklyRecords;
          updateDebugInfo('DATA fully populated');
        }
      } catch (err: any) {
        console.error("Failed to load records from database:", err);
        updateDebugInfo('Failed to load', err);
      }

      // 2. Trigger Diagnosis Engine Initialization
      if (typeof (window as any).startDiagnosisApp === 'function') {
        (window as any).startDiagnosisApp();
      }
      if (typeof (window as any).setSection === 'function') {
        (window as any).setSection(section);
      }
      if (typeof (window as any).buildSidebar === 'function') {
        (window as any).buildSidebar();
      }
      if (typeof (window as any).render === 'function') {
        (window as any).render();
      }
      
      const st = (window as any).ST || {};
      updateDebugInfo(`Init completed (ST.month=${st.month}, ST.week=${st.week})`);
    };

    // Sequential Script Loader: diagnosisEngine.js -> initEngine
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

    // Pre-initialize window.DATA BEFORE loading the script so the script's internal DATA variable resolves correctly
    (window as any).DATA = {
      months: ["2026년 6월"],
      jipaOrder: ["맛디아", "서울", "무등", "베드로", "요한"],
      jipaColors: { "맛디아": "#6FBA2C", "서울": "#6FBA2C", "무등": "#3b82f6", "베드로": "#06b6d4", "요한": "#f59e0b" },
      records: [],
      weeklyRecords: []
    };

    loadScript('diag-engine-script', getUrl('assets/diagnosisEngine.js'))
      .then(() => {
        initEngine();
      });

    return () => {
      delete (window as any).reactNavigate;
    };
  }, [navigate, section]);

  useEffect(() => {
    if (typeof (window as any).setSection === 'function') {
      (window as any).setSection(section);
    }
  }, [section]);

  if (section === 'evangelism/check' || section === 'evangelism/aggregate' || section === 'approvals/pending' || section === 'approvals/completed') {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
        <div className="topbar">
          <div className="logo">🌐</div>
          <div className="brandwrap">
            <div className="brand">해외선교부 <b>업무포탈</b></div>
            <div className="brandsub">GLOBAL MISSION DASHBOARD</div>
          </div>
          <span className="spacer"></span>
          <button className="repbtn" onClick={() => navigate('/')}>🏠 인트로</button>
          <button className="repbtn" id="btnLogout" onClick={() => {
            if (window.confirm("정말 로그아웃 하시겠습니까?")) {
              sessionService.clearSession();
              navigate('/login', { replace: true });
            }
          }} style={{ background: '#ef4444', color: 'white', border: 'none', fontWeight: 700 }}>🔒 로그아웃</button>
        </div>
        <div className="shell">
          <nav className="side" id="side" style={{ display: 'block' }}></nav>
          <main className="main" style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
            {(section === 'evangelism/check' || section === 'evangelism/aggregate') ? (
              <EvangelismModule initialTab={section === 'evangelism/check' ? 'check' : 'aggregate'} />
            ) : (
              <ApprovalModule mode={section === 'approvals/pending' ? 'pending' : 'completed'} />
            )}
            <div id="homeview" style={{ display: 'none' }}></div>
            <div id="diagview" style={{ display: 'none' }}></div>
            <div id="dataview" style={{ display: 'none' }}></div>
            <div id="mapview" style={{ display: 'none' }}></div>
            <div id="globeview" style={{ display: 'none' }}></div>
          </main>
        </div>
      </div>
    );
  }

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

${(import.meta as any).env?.DEV ? `
<div id="debugPanel" style="position:fixed;bottom:12px;right:12px;background:rgba(15,23,42,0.95);color:#10b981;padding:12px 16px;border-radius:12px;font-family:monospace;font-size:12px;z-index:9999;width:340px;box-shadow:0 10px 25px rgba(0,0,0,0.4);border:1.5px solid #334155;pointer-events:none">
  <h4 style="margin:0 0 8px 0;color:#ffffff;font-size:13px;border-bottom:1px solid #334155;padding-bottom:4px;display:flex;align-items:center;gap:6px">⚙️ SYSTEM DEBUG PANEL</h4>
  <div id="debugContent">Initializing...</div>
</div>
` : ''}
      ` }}
    />
  );
};
