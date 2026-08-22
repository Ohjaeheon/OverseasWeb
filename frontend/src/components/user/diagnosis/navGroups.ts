import { roleService } from '../../../services/roleService';
import { userMenuLayoutService } from '../../../services/userMenuLayoutService';
import {
  SidebarChild,
  SidebarItem,
  SidebarGroup,
  SidebarEntry,
  isGroup,
  menuKeyForGroup,
  menuKeyForItem,
  menuKeyForChild
} from './userMenuCatalog';

export type { SidebarChild, SidebarItem, SidebarGroup, SidebarEntry };
export { isGroup, menuKeyForGroup, menuKeyForItem, menuKeyForChild };

// 상단 내비게이션(대그룹 드롭다운)과 좌측 서브 내비게이션(중그룹/소그룹), 기존 모바일 전체
// 메뉴(DiagnosisSidebar)가 모두 이 함수의 결과를 공유한다 — 메뉴 구조·권한 키가 여러 곳에
// 중복 정의되면 필연적으로 어긋나므로, getSIDEBAR()가 유일한 출처(single source of truth)다.
// 관리자가 /adminsetting/user-menu-layout에서 편집한 배치가 있으면 그것을, 없으면
// userMenuCatalog의 기본값을 반환한다 — 매 호출마다 최신 값을 읽으므로 컴포넌트가 리렌더될
// 때마다(예: 로그인 직후 DB 조회 완료 후) 최신 배치가 반영된다.
export function getSIDEBAR(): SidebarEntry[] {
  return userMenuLayoutService.getUserMenuLayout();
}

export interface Major { key: string; label: string; items: SidebarItem[]; }

/** SIDEBAR의 grp 마커를 경계로 대그룹 단위로 묶는다. grp 이전의 항목(홈·캘린더·조직도)은 plain. */
export function groupSidebar(): { plain: SidebarItem[]; majors: Major[] } {
  const plain: SidebarItem[] = [];
  const majors: Major[] = [];
  let current: Major | null = null;
  for (const entry of getSIDEBAR()) {
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
