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

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [openSubMenu, setOpenSubMenu] = useState<boolean>(true);
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

  // SIDEBAR data structure matching permissions matrix items
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
      s: "weekly_report_status", ico: "📋", label: "주간보고 취합현황", path: "/adminsetting/weekly-report-status",
      children: [
        { label: "제출 현황 확인", path: "/adminsetting/weekly-report-status" },
        { label: "주차별 양식 관리", path: "/adminsetting/weekly-report-schema" }
      ]
    },
    { s: "evangelism_bulk", ico: "📊", label: "전도 가개강 데이터 전체관리", path: "/adminsetting/evangelism-bulk" },
    { s: "membership_bulk", ico: "👥", label: "내무 데이터 전체관리", path: "/adminsetting/membership-bulk" },

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
    { s: "file_download_logs", ico: "📥", label: "파일 다운로드 로그", path: "/adminsetting/file-download-logs" }
  ];

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
          onClick={() => navigate('/')}
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
        <div onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1f2a44', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
            해외선교부 <span style={{ color: '#2563eb' }}>업무포탈</span>
          </div>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#6b7a99', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '1px' }}>
            GLOBAL MISSION DASHBOARD · ADMIN SYSTEM
          </div>
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

        {/* Left Navigation Sidebar matching Image 2 */}
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
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column' }}>
                    <div
                      onClick={() => setOpenSubMenu(!openSubMenu)}
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
                      {openSubMenu ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>

                    {openSubMenu && (
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
