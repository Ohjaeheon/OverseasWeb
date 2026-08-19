import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { roleService } from '../../services/roleService';
import { logService } from '../../services/logService';
import { sessionService } from '../../services/sessionService';
import { telegramService } from '../../services/telegramService';
import { authService } from '../../services/authService';
import {
  ChevronDown,
  ChevronRight,
  LogOut,
  ArrowLeft,
  Menu,
  X
} from 'lucide-react';

interface SidebarItem {
  s?: string;
  cat?: string;
  ico?: string;
  label?: string;
  grp?: string;
  path?: string;
  tag?: string;
  children?: { cat?: string; label: string; path: string }[];
}

// SIDEBAR data structure matching permissions matrix items.
// 컴포넌트 상태와 무관한 정적 데이터라 모듈 스코프로 빼서 openGroups 초기값 계산에도 재사용한다.
const RAW_SIDEBAR: SidebarItem[] = [
  { s: "home", ico: "🏠", label: "홈 (종합 현황)", path: "/adminsetting/dashboard" },

  { grp: "교회/지역/개척지" },
  { s: "diag", ico: "🩺", label: "목록 및 설정", path: "/adminsetting/faith-records" },
  { s: "inspect", ico: "🚨", label: "상세 점검 (양·질)", path: "/adminsetting/church-detail" },

  { grp: "데이터 관리" },
  {
    s: "weekly_worship", ico: "📅", label: "주간예배 출결", path: "/adminsetting/weekly-worship",
    children: [
      { label: "자동 취합 실행", path: "/adminsetting/weekly-worship" },
      { label: "이전 데이터 확인", path: "/adminsetting/weekly-worship/history" },
      { label: "지역/양식 설정", path: "/adminsetting/weekly-worship/settings" }
    ]
  },
  {
    s: "weekly_report_status", ico: "📋", label: "주간보고 관리", path: "/adminsetting/weekly-report-status",
    children: [
      { label: "제출 현황 확인", path: "/adminsetting/weekly-report-status" },
      { label: "주차별 양식 관리", path: "/adminsetting/weekly-report-schema" }
    ]
  },
  {
    s: "evangelism_bulk", ico: "📊", label: "전도 가개강 데이터 전체관리", path: "/adminsetting/evangelism-bulk",
    children: [
      { label: "데이터 전체관리", path: "/adminsetting/evangelism-bulk" },
      { label: "월말보고서 양식관리", path: "/adminsetting/evangelism-bulk/report-template" }
    ]
  },
  { s: "membership_bulk", ico: "👥", label: "내무 데이터 전체관리", path: "/adminsetting/membership-bulk" },
  { s: "overseas_board_manual", ico: "📥", label: "현황판 등록·종강 수기입력", path: "/adminsetting/overseas-board-manual" },
  { s: "dashboard_config", ico: "🗂️", label: "메뉴 관리 (상세표·수식 설정)", path: "/adminsetting/dashboard-config" },

  { grp: "회원 및 권한" },
  { s: "users", ico: "🌍", label: "회원 관리", path: "/adminsetting/users" },
  { s: "roles", ico: "📈", label: "권한 목록 및 소속 회원 관리", path: "/adminsetting/roles" },
  { s: "perm", ico: "🔑", label: "권한별 접근 메뉴 설정", path: "/adminsetting/permissions" },

  { grp: "로그 및 시스템" },
  { s: "admin_bot", ico: "🤖", label: "봇 연결 관리", path: "/adminsetting/bot" },
  { s: "i18n", ico: "🌐", label: "다국어 사전 관리", path: "/adminsetting/i18n" },
  { s: "sys", ico: "⚙️", label: "시스템 설정", path: "/adminsetting/settings" },
  { s: "messages", ico: "💬", label: "메세지 관리", path: "/adminsetting/messages" },
  { s: "login_log", ico: "📥", label: "로그인 로그", path: "/adminsetting/login-logs" },
  { s: "access_log", ico: "📥", label: "접근로그", path: "/adminsetting/access-logs" },
  { s: "file_upload_logs", ico: "📥", label: "파일 업로드 로그", path: "/adminsetting/file-upload-logs" },
  { s: "file_download_logs", ico: "📥", label: "파일 다운로드 로그", path: "/adminsetting/file-download-logs" },

  { grp: "등수예상 시뮬레이션" },
  {
    s: "simulation", ico: "🏆", label: "등수예상 시뮬레이션", path: "/adminsetting/simulation/center",
    children: [
      { label: "센터예상", path: "/adminsetting/simulation/center" },
      { label: "종강수예상", path: "/adminsetting/simulation/termination" },
      { label: "성장율예상", path: "/adminsetting/simulation/growth" },
    ]
  }
];

interface AdminMajor { key: string; label: string; items: SidebarItem[]; }

/** grp 마커를 경계로 대그룹 단위로 묶는다 — 이미 권한 필터링을 마친 SIDEBAR를 입력으로 받는다. */
function groupAdminSidebar(list: SidebarItem[]): { majors: AdminMajor[] } {
  const majors: AdminMajor[] = [];
  let current: AdminMajor | null = null;
  for (const entry of list) {
    if (entry.grp) {
      current = { key: entry.grp.replace(/\s+/g, ''), label: entry.grp, items: [] };
      majors.push(current);
    } else if (current) {
      current.items.push(entry);
    }
  }
  return { majors };
}

function findAdminActiveMajor(majors: AdminMajor[], pathname: string): { major: AdminMajor; item: SidebarItem } | null {
  for (const m of majors) {
    for (const it of m.items) {
      if (it.path && (pathname === it.path || pathname.startsWith(it.path + '/'))) return { major: m, item: it };
      if (it.children) {
        for (const ch of it.children) {
          if (pathname === ch.path) return { major: m, item: it };
        }
      }
    }
  }
  return null;
}

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  // 그룹(children이 있는 항목)별로 펼침 상태를 독립적으로 관리 — item.s를 키로 사용.
  // 현재 경로가 속한 그룹은 처음부터 펼쳐진 채로 시작한다.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    RAW_SIDEBAR.forEach(item => {
      if (item.children && item.s && item.children.some(c => c.path === location.pathname)) {
        initial[item.s] = true;
      }
    });
    return initial;
  });
  const toggleGroup = (key: string) => setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isBackdoorAllowed, setIsBackdoorAllowed] = useState<boolean>(false);

  // Close sidebar drawer on route navigation change (for mobile usability)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const checkIp = async () => {
      try {
        const info = await authService.checkBackdoorIp();
        setIsBackdoorAllowed(info.isBackdoorAllowed);
      } catch (e) {
        console.warn("Failed to check backdoor IP in AdminLayout", e);
      }
    };
    checkIp();
  }, []);

  // Get current logged-in user's role
  const userStr = localStorage.getItem('user');
  let currentUserRole = 'ROLE_ADMIN';
  if (userStr) {
    try {
      const u = JSON.parse(userStr);
      currentUserRole = u.role || 'ROLE_ADMIN';
    } catch (e) {}
  }

  const isAdmin = currentUserRole === 'ROLE_ADMIN' || currentUserRole === 'ADMIN' || currentUserRole === '관리자' || currentUserRole === 'ROLE_관리자';

  const rawSidebarWithBackdoor = [...RAW_SIDEBAR];
  if (isBackdoorAllowed && isAdmin) {
    const sysIdx = rawSidebarWithBackdoor.findIndex(item => item.path === "/adminsetting/settings");
    if (sysIdx !== -1) {
      rawSidebarWithBackdoor.splice(sysIdx + 1, 0, {
        s: "backdoor_ips",
        ico: "🚪",
        label: "백도어 IP 관리",
        path: "/adminsetting/backdoor-ips"
      });
    }
  }

  // Filter sidebar items according to current user's role permissions (hide headers if no children accessible)
  const SIDEBAR = rawSidebarWithBackdoor.filter((item, idx) => {
    if (item.grp) {
      for (let i = idx + 1; i < rawSidebarWithBackdoor.length; i++) {
        const child = rawSidebarWithBackdoor[i];
        if (child.grp) break;
        if (child.s === "backdoor_ips") {
          return true;
        }
        if (child.s && roleService.canRoleAccessMenu(currentUserRole, child.s).read) {
          return true;
        }
      }
      return false;
    }
    if (item.s === "backdoor_ips") return true;
    if (!item.s) return true;
    const access = roleService.canRoleAccessMenu(currentUserRole, item.s);
    return access.read;
  });

  // 데스크톱 상단 대그룹 드롭다운 + 좌측 서브 내비게이션(중그룹/소그룹)용 — 위 SIDEBAR(권한 필터링 완료)를 그대로 재사용
  const { majors: adminMajors } = groupAdminSidebar(SIDEBAR);
  const activeMajor = findAdminActiveMajor(adminMajors, location.pathname);
  const [subOpenItem, setSubOpenItem] = useState<string | null>(activeMajor ? (activeMajor.item.s || activeMajor.item.path || null) : null);
  useEffect(() => {
    if (activeMajor) setSubOpenItem(activeMajor.item.s || activeMajor.item.path || null);
  }, [activeMajor?.item.s, activeMajor?.item.path]);

  // URL Direct Access Guard & Access Logging
  useEffect(() => {
    const currentPath = location.pathname;
    const currentItem = RAW_SIDEBAR.find(item => item.path === currentPath || (item.children && item.children.some(c => c.path === currentPath)));
    const pageName = currentItem?.label || '관리자 시스템';
    logService.addAccessLog(pageName, currentPath);

    if (currentUserRole === 'ROLE_ADMIN' || currentUserRole === 'ADMIN') return;

    if (currentItem && currentItem.s) {
      const access = roleService.canRoleAccessMenu(currentUserRole, currentItem.s);
      if (!access.read) {
        alert(`'${currentItem.label}' 메뉴에 대한 접근 권한이 없습니다.`);
        navigate('/adminsetting/dashboard', { replace: true });
      }
    }
  }, [location.pathname, currentUserRole, navigate]);

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#eef3fb', color: '#1f2a44', fontFamily: '"Pretendard", "Malgun Gothic", sans-serif' }}>
      {/* CSS Media Queries for Mobile Responsiveness */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 991px) {
          .admin-layout-shell {
            flex-direction: column !important;
          }
          .admin-sidebar {
            position: fixed !important;
            left: -260px !important;
            top: 61px !important;
            bottom: 0 !important;
            height: calc(100vh - 61px) !important;
            z-index: 9999 !important;
            transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
          .admin-sidebar.open {
            left: 0 !important;
          }
          .admin-sidebar-overlay {
            position: fixed !important;
            inset: 0 !important;
            top: 61px !important;
            background: rgba(15, 23, 42, 0.4) !important;
            backdrop-filter: blur(4px) !important;
            z-index: 9998 !important;
            display: block !important;
          }
          .admin-main {
            padding: 20px 16px !important;
          }
          .admin-menu-toggle {
            display: flex !important;
          }
          .admin-header-btn-txt {
            display: none !important;
          }
          .admin-header-logo-container {
            gap: 8px !important;
          }
        }
        @media (min-width: 992px) {
          .admin-sidebar-overlay {
            display: none !important;
          }
          .admin-menu-toggle {
            display: none !important;
          }
          .admin-sidebar {
            display: none !important;
          }
        }
        @media (max-width: 991px) {
          .navwrap, .subnav {
            display: none !important;
          }
        }
      ` }} />

      {/* Top Bar matching Diagnosis Page */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'saturate(180%) blur(12px)',
        borderBottom: '1px solid #e6edf8',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '11px 24px',
        boxShadow: '0 1px 10px rgba(20, 40, 90, 0.05)'
      }}>
        {/* Mobile Hamburger Menu Toggle */}
        <button
          className="admin-menu-toggle"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          style={{
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '9px',
            color: '#1f2a44',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Logo */}
        <div
          onClick={() => navigate('/adminsetting/dashboard')}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '11px',
            background: 'linear-gradient(135deg, #4b8bff, #2563eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '19px',
            color: 'white',
            boxShadow: '0 6px 16px rgba(37, 99, 235, 0.32)',
            flexShrink: 0,
            cursor: 'pointer'
          }}
        >
          🌐
        </div>

        {/* Brand Title */}
        <div onClick={() => navigate('/adminsetting/dashboard')} style={{ cursor: 'pointer' }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1f2a44', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
            해외선교부 <span style={{ color: '#2563eb' }}>업무포탈</span>
          </div>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#6b7a99', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '1px' }}>
            GLOBAL MISSION DASHBOARD · ADMIN SYSTEM
          </div>
        </div>

        {/* 대그룹 드롭다운 내비게이션 (데스크톱 전용, 호버로 열림) — 일반 사용자 포탈과 동일한 .navwrap/.navitem/.megamenu 스타일 재사용 */}
        <div className="navwrap">
          {adminMajors.map((m) => (
            <div key={m.key} className={`navitem${activeMajor?.major.key === m.key ? ' active' : ''}`}>
              <span className="lbl">{m.label}</span>
              <span className="car">▾</span>
              <div className="megamenu">
                {m.items.map((it) => (
                  <div key={it.s} className="mm-row" onClick={() => it.path && navigate(it.path)}>
                    <span>{it.label}</span>
                    {it.tag && <span className="tag">{it.tag}</span>}
                    {it.children && <span className="mm-count">{it.children.length}개 하위</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Action Buttons */}
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#ffffff',
            border: '1px solid #e6edf8',
            borderRadius: '9px',
            padding: '7px 14px',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: '#2563eb',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
          }}
        >
          <ArrowLeft size={16} /> <span className="admin-header-btn-txt">해선부 업무 포탈로 이동</span>
        </button>

        {!telegramService.isTelegramWebApp() && (
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#ef4444',
              border: 'none',
              borderRadius: '9px',
              padding: '7px 14px',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: 'white',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(239, 68, 68, 0.25)'
            }}
          >
            <LogOut size={16} /> <span className="admin-header-btn-txt">로그아웃</span>
          </button>
        )}
      </header>

      {/* Main Layout Body */}
      <div className="admin-layout-shell" style={{ display: 'flex', minHeight: 'calc(100vh - 61px)' }}>
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div
            className="admin-sidebar-overlay"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* 좌측 서브 내비게이션: 중그룹/소그룹 (데스크톱 전용, 대그룹 진입 시에만 표시) */}
        {activeMajor && (
          <nav className="subnav">
            <div className="subnav-head">현재 대그룹<b>{activeMajor.major.label}</b></div>
            {activeMajor.major.items.map((it) => {
              const children = it.children || [];
              const itKey = it.s || it.path || '';
              const isOn = children.length === 0 && !!it.path && (location.pathname === it.path || location.pathname.startsWith(it.path + '/'));
              const expanded = subOpenItem === itKey;
              return (
                <div className="subgrp" key={itKey}>
                  <div
                    className={`submid ${isOn ? 'on' : ''} ${expanded && children.length > 0 ? 'expanded' : ''}`}
                    onClick={() => {
                      if (children.length > 0) setSubOpenItem(subOpenItem === itKey ? null : itKey);
                      if (it.path) navigate(it.path);
                    }}
                  >
                    <span>{it.label}</span>
                    {it.tag && <span className="tag">{it.tag}</span>}
                    {children.length > 0 && <span className="subcar">▸</span>}
                  </div>
                  {children.length > 0 && (
                    <div className={`subsub-wrap ${expanded ? 'open' : ''}`}>
                      {children.map((ch) => (
                        <div
                          key={ch.path}
                          className={`subsub ${location.pathname === ch.path ? 'on' : ''}`}
                          onClick={() => navigate(ch.path)}
                        >
                          {ch.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        )}

        {/* Left Navigation Sidebar matching Image 2 — 모바일 햄버거 드로어 전용(데스크톱에서는 숨김) */}
        <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : ''}`} style={{
          width: '260px',
          background: 'linear-gradient(185deg, #22337a, #172554)',
          color: '#ffffff',
          flexShrink: 0,
          padding: '20px 12px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '2px 0 12px rgba(0,0,0,0.1)'
        }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {SIDEBAR.map((item, idx) => {
              if (item.grp) {
                return (
                  <div key={idx} style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: 'rgba(255, 255, 255, 0.45)',
                    letterSpacing: '0.5px',
                    padding: '16px 12px 6px 12px',
                    textTransform: 'uppercase'
                  }}>
                    {item.grp}
                  </div>
                );
              }

              const isActive = location.pathname === item.path;

              if (item.children) {
                const groupKey = item.s || String(idx);
                const isOpen = !!openGroups[groupKey];
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column' }}>
                    <div
                      onClick={() => toggleGroup(groupKey)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        color: 'rgba(255, 255, 255, 0.85)',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        background: 'transparent',
                        transition: 'all 0.2s'
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1rem' }}>{item.ico}</span>
                        <span>{item.label}</span>
                      </span>
                      {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>

                    {isOpen && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '32px', marginTop: '2px' }}>
                        {item.children.map((sub, sIdx) => {
                          const isSubActive = location.pathname === sub.path;
                          return (
                            <div
                              key={sIdx}
                              onClick={() => navigate(sub.path)}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '0.83rem',
                                color: isSubActive ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
                                fontWeight: isSubActive ? 700 : 500,
                                background: isSubActive ? 'rgba(59, 110, 245, 0.35)' : 'transparent',
                                borderLeft: isSubActive ? '3px solid #5fb0ff' : '3px solid transparent'
                              }}
                            >
                              • {sub.label}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div
                  key={idx}
                  onClick={() => item.path && navigate(item.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.85)',
                    background: isActive ? 'rgba(91, 176, 255, 0.22)' : 'transparent',
                    boxShadow: isActive ? 'inset 0 0 12px rgba(95, 176, 255, 0.18)' : 'none',
                    borderLeft: isActive ? '3px solid #5fb0ff' : '3px solid transparent',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1rem' }}>{item.ico}</span>
                    <span>{item.label}</span>
                  </span>
                  {item.tag && (
                    <span style={{
                      fontSize: '0.68rem',
                      background: '#ef4444',
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 800
                    }}>
                      {item.tag}
                    </span>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Right Main Content Area */}
        <main className="admin-main" style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
