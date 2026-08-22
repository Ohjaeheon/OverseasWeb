import { roleService } from '../../../services/roleService';

export interface SidebarChild { cat?: string; tab?: string; label: string; path: string; }
export interface SidebarItem { s: string; ico: string; label: string; path: string; tag?: string; children?: SidebarChild[]; }
export interface SidebarGroup { grp: string; }
export type SidebarEntry = SidebarItem | SidebarGroup;

export function isGroup(e: SidebarEntry): e is SidebarGroup { return 'grp' in e; }

// 상단 내비게이션(대그룹 드롭다운)과 좌측 서브 내비게이션(중그룹/소그룹), 기존 모바일 전체
// 메뉴(DiagnosisSidebar)가 모두 이 하나의 목록을 공유한다 — 메뉴 구조·권한 키가 여러 곳에
// 중복 정의되면 필연적으로 어긋나므로, SIDEBAR가 유일한 출처(single source of truth)다.
export const SIDEBAR: SidebarEntry[] = [
  { s: 'home', ico: '🏠', label: '홈 (종합 현황)', path: '/' },
  { s: 'calendar', ico: '📅', label: '캘린더', path: '/calendar' },
  { s: 'organization', ico: '🌳', label: '조직도', path: '/organization' },
  { grp: '게시판' },
  { s: 'notice', ico: '📢', label: '공지사항', path: '/notice' },
  { grp: '진 단' },
  { s: 'diag', ico: '🩺', label: '교회 진단서', path: '/diag', tag: '핵심' },
  { s: 'inspect', ico: '🚨', label: '점검 (양·질)', path: '/inspect' },
  { s: 'funnel', ico: '🚦', label: '관문별 통과율', path: '/funnel' },
  { grp: '신앙 프로세스' },
  {
    s: 'p1', ico: '①', label: '전도·가개강', path: '/evangelism', children: [
      { cat: 'p1_check', label: '①-1. 교회별 데이터 확인', path: '/evangelism/check' },
      { cat: 'p1_agg', label: '①-2. 주간보고', path: '/evangelism/aggregate' },
      { cat: 'p1_plan', label: '①-3. 계획', path: '/evangelism/plan' },
      { cat: 'p1_monthly', label: '①-4. 월간보고', path: '/evangelism/monthly' },
      { cat: 'p1_report', label: '①-5. 월말보고서 출력', path: '/evangelism/report' },
    ],
  },
  { s: 'p2', ico: '②', label: '센터', path: '/center' },
  {
    s: 'p3', ico: '③', label: '내무', path: '/membership', children: [
      { cat: 'p3_check', label: '③-1. 교회별 데이터 확인', path: '/membership/check' },
      { cat: 'p3_input', label: '③-2. 월별 데이터 입력', path: '/membership/input' },
    ],
  },
  { s: 'p4', ico: '④', label: '예배', path: '/worship' },
  { grp: '업 무' },
  {
    s: 'business', ico: '💼', label: '재정', path: '/business', children: [
      { tab: 'ledger', label: '원장헌금', path: '/business/ledger' },
      { tab: 'ledger_archive', label: 'ㄴ 품의서 및 회의록', path: '/business/ledger/archive' },
      { tab: 'ledger_report', label: 'ㄴ 품의서 및 회의록 작성', path: '/business/ledger/report' },
      { tab: 'fruit', label: '열매헌금', path: '/business/fruit' },
      { tab: 'fruit_archive', label: 'ㄴ 품의서 및 회의록', path: '/business/fruit/archive' },
      { tab: 'transport', label: '교통비', path: '/business/transport' },
      { tab: 'transport_archive', label: 'ㄴ 품의서 및 회의록', path: '/business/transport/archive' },
      { tab: 'mission', label: '선교비', path: '/business/mission' },
      { tab: 'mission_archive', label: 'ㄴ 품의서 및 회의록', path: '/business/mission/archive' },
    ],
  },
  // 보기 그룹: 지도·지구본 / 추이·비교는 추후 구현 예정이라 당분간 숨김 처리 (코드는 재사용 대비 보존)
  // { grp: '보 기' },
  // { s: 'map', ico: '🌍', label: '지도·지구본', path: '/map' },
  // { s: 'trend', ico: '📈', label: '추이·비교', path: '/trend' },
  { grp: '보 고' },
  {
    s: 'weekly_report_sub', ico: '🗓️', label: '주간보고', path: '/weekly-report', children: [
      { cat: 'weekly_report_input', label: '보고입력', path: '/weekly-report/input' },
    ],
  },
  { grp: '결 재' },
  { s: 'approvals/pending', ico: '📥', label: '결재 대기중인 건', path: '/approvals/pending' },
  { s: 'approvals/completed', ico: '📋', label: '결재 완료 건', path: '/approvals/completed' },
  { s: 'approvals/submitted', ico: '📝', label: '결재 상신 내역', path: '/approvals/submitted' },
];

// 메시지 사전(i18n_dictionary) 조회용 안정적인 키 도출 — 기존 s/grp/cat/tab 식별자를 그대로 재사용한다.
export function menuKeyForGroup(groupKey: string): string { return `menu.user.grp.${groupKey}`; }
export function menuKeyForItem(it: SidebarItem): string { return `menu.user.${it.s}`; }
export function menuKeyForChild(ch: SidebarChild): string {
  const id = ch.cat || ch.tab || ch.path.replace(/^\//, '').replace(/\//g, '.');
  return `menu.user.child.${id}`;
}

export interface Major { key: string; label: string; items: SidebarItem[]; }

/** SIDEBAR의 grp 마커를 경계로 대그룹 단위로 묶는다. grp 이전의 항목(홈·캘린더·조직도)은 plain. */
export function groupSidebar(): { plain: SidebarItem[]; majors: Major[] } {
  const plain: SidebarItem[] = [];
  const majors: Major[] = [];
  let current: Major | null = null;
  for (const entry of SIDEBAR) {
    if (isGroup(entry)) {
      current = { key: entry.grp.replace(/\s+/g, ''), label: entry.grp, items: [] };
      majors.push(current);
    } else if (current) {
      current.items.push(entry);
    } else {
      plain.push(entry);
    }
  }
  return { plain, majors };
}

export function isUserAdmin(role: string): boolean {
  return role === 'ROLE_ADMIN' || role === 'ADMIN' || role === '관리자' || role === 'ROLE_관리자';
}

function hasAccess(userRole: string, isAdmin: boolean, key: string): boolean {
  return isAdmin || roleService.canRoleAccessMenu(userRole, key).read;
}

function hasChildAccess(userRole: string, isAdmin: boolean, ch: SidebarChild, parentKey: string): boolean {
  const chKey = ch.cat || ch.tab;
  if (!chKey) return hasAccess(userRole, isAdmin, parentKey);
  return hasAccess(userRole, isAdmin, chKey);
}

function canShowItem(userRole: string, isAdmin: boolean, it: SidebarItem): boolean {
  if (!it.children) return hasAccess(userRole, isAdmin, it.s);
  return hasAccess(userRole, isAdmin, it.s) || it.children.some((ch) => hasChildAccess(userRole, isAdmin, ch, it.s));
}

export function filterPlainForRole(plain: SidebarItem[], userRole: string): SidebarItem[] {
  const isAdmin = isUserAdmin(userRole);
  return plain.filter((it) => canShowItem(userRole, isAdmin, it));
}

export function filterMajorsForRole(majors: Major[], userRole: string): Major[] {
  const isAdmin = isUserAdmin(userRole);
  return majors
    .map((m) => ({ ...m, items: m.items.filter((it) => canShowItem(userRole, isAdmin, it)) }))
    .filter((m) => m.items.length > 0);
}

export function visibleChildrenFor(it: SidebarItem, userRole: string): SidebarChild[] {
  if (!it.children) return [];
  const isAdmin = isUserAdmin(userRole);
  return it.children.filter((ch) => hasChildAccess(userRole, isAdmin, ch, it.s));
}

export function isPathActive(path: string, pathname: string): boolean {
  return pathname === path || (path !== '/' && pathname.startsWith(path + '/'));
}

/** 현재 경로가 속한 대그룹·중그룹을 찾는다 (탑바 강조 표시·좌측 서브내비 표시 여부에 공용으로 사용). */
export function findActiveMajor(majors: Major[], pathname: string): { major: Major; item: SidebarItem } | null {
  for (const m of majors) {
    for (const it of m.items) {
      if (isPathActive(it.path, pathname)) return { major: m, item: it };
      if (it.children) {
        for (const ch of it.children) {
          if (pathname === ch.path || pathname.startsWith(ch.path + '/')) return { major: m, item: it };
        }
      }
    }
  }
  return null;
}
