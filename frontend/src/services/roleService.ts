export interface RoleDefinition {
  roleId: string;
  roleName: string;
  description: string;
  isSystem?: boolean;
}

export interface MenuPermission {
  menuKey: string;
  menuName: string;
  category: string;
  path: string;
  permissions: Record<string, { read: boolean; write: boolean }>;
}

const STORAGE_KEY = 'OVERSEAS_PORTAL_ROLES';
const PERM_STORAGE_KEY = 'OVERSEAS_PORTAL_PERMISSIONS';

export const DEFAULT_ROLES: RoleDefinition[] = [
  { roleId: 'ROLE_ADMIN', roleName: '관리자', description: '전체 시스템 및 모든 해외교회/회원 관리 권한', isSystem: true },
  { roleId: 'ROLE_USER', roleName: '해외선교부 담당자', description: '진단서 조회 및 담당 국가 신앙 프로세스 입력 권한', isSystem: true },
  { roleId: 'ROLE_JIPA', roleName: '지파 담당자', description: '해당 지파 소속 해외교회 데이터 관리 권한', isSystem: false },
  { roleId: 'ROLE_GUEST', roleName: '일반 회원', description: '진단서 조회 전용 읽기 권한', isSystem: false }
];

export const DEFAULT_MENUS: { menuKey: string; menuName: string; category: string; path: string }[] = [
  { menuKey: 'home', menuName: '🏠 홈 (종합 현황)', category: '사용자 진단서', path: '/' },
  { menuKey: 'diag', menuName: '🩺 교회 진단서', category: '사용자 진단서', path: '/' },
  { menuKey: 'inspect', menuName: '🚨 점검 (양·질)', category: '사용자 진단서', path: '/' },
  { menuKey: 'funnel', menuName: '🚦 관문별 통과율', category: '사용자 진단서', path: '/' },
  { menuKey: 'p1', menuName: '① 전도 · 가개강', category: '신앙 프로세스', path: '/' },
  { menuKey: 'p2', menuName: '② 센터', category: '신앙 프로세스', path: '/' },
  { menuKey: 'p3', menuName: '③ 내무', category: '신앙 프로세스', path: '/' },
  { menuKey: 'p4', menuName: '④ 예배', category: '신앙 프로세스', path: '/' },
  { menuKey: 'map', menuName: '🌐 지도 · 지구본', category: '보기 및 공유', path: '/' },
  { menuKey: 'trend', menuName: '📈 추이 · 비교', category: '보기 및 공유', path: '/' },
  { menuKey: 'export', menuName: '📥 엑셀 내보내기', category: '보기 및 공유', path: '/' },
  { menuKey: 'users', menuName: '🌍 회원 및 텔레그램 연동 관리', category: '관리자 전용', path: '/adminsetting/users' },
  { menuKey: 'roles', menuName: '📈 권한 목록 및 소속 회원 관리', category: '관리자 전용', path: '/adminsetting/roles' },
  { menuKey: 'perm', menuName: '🔑 권한별 접근 메뉴 설정', category: '관리자 전용', path: '/adminsetting/permissions' },
  { menuKey: 'i18n', menuName: '🌐 다국어 사전 관리', category: '관리자 전용', path: '/adminsetting/i18n' },
  { menuKey: 'sys', menuName: '⚙️ 시스템 설정', category: '관리자 전용', path: '/adminsetting/settings' }
];

export const roleService = {
  getRoles: (): RoleDefinition[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Failed to load roles from localStorage", e);
    }
    return DEFAULT_ROLES;
  },

  saveRoles: (roles: RoleDefinition[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(roles));
    } catch (e) {
      console.warn("Failed to save roles to localStorage", e);
    }
  },

  addRole: (roleName: string, roleIdInput?: string, description?: string): RoleDefinition => {
    const roles = roleService.getRoles();
    const cleanName = roleName.trim();
    
    let finalRoleId = (roleIdInput || '').trim().toUpperCase();
    if (!finalRoleId) {
      const asciiOnly = cleanName.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (asciiOnly.length > 0) {
        finalRoleId = `ROLE_${asciiOnly}`;
      } else {
        finalRoleId = `ROLE_CUSTOM_${Date.now().toString().slice(-4)}`;
      }
    } else if (!finalRoleId.startsWith('ROLE_')) {
      finalRoleId = `ROLE_${finalRoleId}`;
    }

    const existingIndex = roles.findIndex(r => r.roleId === finalRoleId);
    const newRole: RoleDefinition = {
      roleId: finalRoleId,
      roleName: cleanName,
      description: (description || '').trim() || '신규 등록된 권한 그룹',
      isSystem: false
    };

    let updated: RoleDefinition[];
    if (existingIndex >= 0) {
      updated = [...roles];
      updated[existingIndex] = newRole;
    } else {
      updated = [...roles, newRole];
    }

    roleService.saveRoles(updated);
    return newRole;
  },

  updateRole: (originalRoleId: string, roleName: string, newRoleId: string, description: string): RoleDefinition => {
    const roles = roleService.getRoles();
    const cleanName = roleName.trim();
    let finalRoleId = newRoleId.trim().toUpperCase();

    if (!finalRoleId.startsWith('ROLE_')) {
      finalRoleId = `ROLE_${finalRoleId}`;
    }

    const index = roles.findIndex(r => r.roleId === originalRoleId);
    const updatedRole: RoleDefinition = {
      roleId: finalRoleId,
      roleName: cleanName,
      description: description.trim(),
      isSystem: roles[index]?.isSystem || false
    };

    if (index >= 0) {
      roles[index] = updatedRole;
    } else {
      roles.push(updatedRole);
    }

    roleService.saveRoles(roles);
    return updatedRole;
  },

  deleteRole: (roleId: string): boolean => {
    const roles = roleService.getRoles();
    const target = roles.find(r => r.roleId === roleId);

    if (target?.isSystem && (roleId === 'ROLE_ADMIN' || roleId === 'ROLE_USER')) {
      alert("시스템 핵심 권한('관리자', '해외선교부 담당자')은 삭제할 수 없습니다.");
      return false;
    }

    const updated = roles.filter(r => r.roleId !== roleId);
    roleService.saveRoles(updated);
    return true;
  },

  getMenuPermissions: (): MenuPermission[] => {
    const roles = roleService.getRoles();
    let storedMatrix: Record<string, Record<string, { read: boolean; write: boolean }>> = {};
    
    try {
      const raw = localStorage.getItem(PERM_STORAGE_KEY);
      if (raw) storedMatrix = JSON.parse(raw);
    } catch (e) {
      console.warn("Failed to parse stored permissions", e);
    }

    return DEFAULT_MENUS.map((m) => {
      const permObj: Record<string, { read: boolean; write: boolean }> = {};

      roles.forEach((r) => {
        if (storedMatrix[m.menuKey] && storedMatrix[m.menuKey][r.roleId]) {
          permObj[r.roleId] = storedMatrix[m.menuKey][r.roleId];
        } else {
          // Default fallbacks
          if (r.roleId === 'ROLE_ADMIN') {
            permObj[r.roleId] = { read: true, write: true };
          } else if (r.roleId === 'ROLE_USER') {
            permObj[r.roleId] = { read: true, write: !['users', 'roles', 'perm', 'sys'].includes(m.menuKey) };
          } else if (r.roleId === 'ROLE_GUEST') {
            permObj[r.roleId] = { read: ['home', 'diag', 'inspect', 'funnel', 'map'].includes(m.menuKey), write: false };
          } else {
            // Custom roles default read access
            permObj[r.roleId] = { read: true, write: false };
          }
        }
      });

      return {
        ...m,
        permissions: permObj
      };
    });
  },

  saveMenuPermissions: (menus: MenuPermission[]) => {
    const matrixToSave: Record<string, Record<string, { read: boolean; write: boolean }>> = {};
    menus.forEach((m) => {
      matrixToSave[m.menuKey] = m.permissions;
    });
    try {
      localStorage.setItem(PERM_STORAGE_KEY, JSON.stringify(matrixToSave));
    } catch (e) {
      console.warn("Failed to save permissions matrix", e);
    }
  },

  canRoleAccessMenu: (roleId: string, menuKey: string): { read: boolean; write: boolean } => {
    if (roleId === 'ROLE_ADMIN' || roleId === 'ADMIN' || roleId === '관리자') {
      return { read: true, write: true };
    }
    const permissions = roleService.getMenuPermissions();
    const matchedMenu = permissions.find(m => m.menuKey === menuKey || m.path.includes(menuKey));
    if (matchedMenu && matchedMenu.permissions) {
      const roleKeys = Object.keys(matchedMenu.permissions);
      const matchedKey = roleKeys.find(k => k === roleId || k === `ROLE_${roleId}`);
      if (matchedKey && matchedMenu.permissions[matchedKey]) {
        return matchedMenu.permissions[matchedKey];
      }
    }
    return { read: true, write: false };
  }
};
