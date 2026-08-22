// 메시지 사전(i18n_dictionary) 조회용 안정적인 키 도출 — s/grp/cat 식별자를 그대로 재사용한다.
// AdminLayout.tsx(사이드바 렌더링)와 AdminMenuLayoutPage.tsx(배치 편집 화면)가 동일 키를 공유해야
// 편집 화면에서 바꾼 이름이 사이드바에도 그대로 반영된다.
export function menuKeyForAdminGroup(groupKey: string): string { return `menu.admin.grp.${groupKey}`; }
export function menuKeyForAdminItem(it: SidebarItem): string { return `menu.admin.${it.s}`; }
export function menuKeyForAdminChild(ch: { cat?: string; label: string; path: string }): string {
  const id = ch.cat || ch.path.replace(/^\//, '').replace(/\//g, '.');
  return `menu.admin.child.${id}`;
}

export interface SidebarItem {
  s?: string;
  cat?: string;
  ico?: string;
  label?: string;
  grp?: string;
  path?: string;
  tag?: string;
  children?: { cat?: string; label: string; path: string }[];
}

// 관리자 사이드바의 기본 배치 겸 "선택 가능한 페이지" 카탈로그.
// menuLayoutService가 저장한 배치가 없을 때의 폴백이자, 메뉴 배치 관리 화면에서
// 아직 배치에 없는 페이지 목록을 계산하는 기준(=App.tsx에 등록된 관리자 라우트 전체)이다.
export const ADMIN_MENU_CATALOG: SidebarItem[] = [
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
  {
    s: "graph_management", ico: "📈", label: "그래프 관리", path: "/adminsetting/graph-management/board",
    children: [
      { label: "현황판 그래프 관리", path: "/adminsetting/graph-management/board" }
    ]
  },

  { grp: "회원 및 권한" },
  { s: "users", ico: "🌍", label: "회원 관리", path: "/adminsetting/users" },
  { s: "roles", ico: "📈", label: "권한 목록 및 소속 회원 관리", path: "/adminsetting/roles" },
  { s: "perm", ico: "🔑", label: "권한별 접근 메뉴 설정", path: "/adminsetting/permissions" },
  { s: "org_structure", ico: "🏢", label: "조직 관리 (교회·부서·팀)", path: "/adminsetting/org-structure" },
  { s: "approval_line", ico: "📋", label: "결재라인 관리", path: "/adminsetting/approval-line" },
  { s: "approval_log", ico: "🗒️", label: "통합결재 로그", path: "/adminsetting/approval-log" },

  { grp: "로그 및 시스템" },
  { s: "admin_bot", ico: "🤖", label: "봇 연결 관리", path: "/adminsetting/bot" },
  { s: "sys", ico: "⚙️", label: "시스템 설정", path: "/adminsetting/settings" },
  { s: "messages", ico: "💬", label: "메시지 관리", path: "/adminsetting/messages" },
  { s: "menu_layout", ico: "🗂️", label: "메뉴 배치 관리", path: "/adminsetting/menu-layout" },
  { s: "user_menu_layout", ico: "🗂️", label: "사용자 포탈 메뉴 배치 관리", path: "/adminsetting/user-menu-layout" },
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
