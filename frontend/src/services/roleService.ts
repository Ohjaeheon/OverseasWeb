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
  // User Diagnosis Portal Menus
  { menuKey: 'home', menuName: '🏠 해외 총괄 요약', category: '🖥️ 일반 사용자 진단서 포탈', path: '/' },
  { menuKey: 'diag', menuName: '🩺 교회 진단서', category: '🖥️ 일반 사용자 진단서 포탈', path: '/diag' },
  { menuKey: 'inspect', menuName: '🚨 점검 (양·질)', category: '🖥️ 일반 사용자 진단서 포탈', path: '/inspect' },
  { menuKey: 'funnel', menuName: '🚦 관문별 통과율', category: '🖥️ 일반 사용자 진단서 포탈', path: '/funnel' },
  { menuKey: 'trend', menuName: '📈 12개월 추이', category: '🖥️ 일반 사용자 진단서 포탈', path: '/trend' },
  { menuKey: 'map', menuName: '🗺️ 지리적 분포 (지도)', category: '🖥️ 일반 사용자 진단서 포탈', path: '/map' },
  { menuKey: 'globe', menuName: '🌐 3D 지구본', category: '🖥️ 일반 사용자 진단서 포탈', path: '/globe' },
  { menuKey: 'p1', menuName: '① 전도 · 가개강 (전체)', category: '🖥️ 일반 사용자 진단서 포탈', path: '/evangelism' },
  { menuKey: 'p1_check', menuName: '   ㄴ ①-1. 교회별 데이터 확인', category: '🖥️ 일반 사용자 진단서 포탈', path: '/evangelism/check' },
  { menuKey: 'p1_agg', menuName: '   ㄴ ①-2. 취합 및 실적 입력', category: '🖥️ 일반 사용자 진단서 포탈', path: '/evangelism/aggregate' },
  { menuKey: 'p2', menuName: '② 센터', category: '🖥️ 일반 사용자 진단서 포탈', path: '/center' },
  { menuKey: 'p3', menuName: '③ 내무', category: '🖥️ 일반 사용자 진단서 포탈', path: '/membership' },
  { menuKey: 'p4', menuName: '④ 예배 · 전성도', category: '🖥️ 일반 사용자 진단서 포탈', path: '/worship' },

  // Admin Portal Menus
  { menuKey: 'admin_dash', menuName: '📊 관리자 대시보드', category: '⚙️ 관리자 전용 (adminsetting)', path: '/adminsetting/dashboard' },
  { menuKey: 'admin_faith', menuName: '🩺 해외교회 · 지역 · 개척지 관리', category: '⚙️ 관리자 전용 (adminsetting)', path: '/adminsetting/faith-records' },
  { menuKey: 'admin_detail', menuName: '🔍 교회 상세 정밀 진단 [구현예정]', category: '⚙️ 관리자 전용 (adminsetting)', path: '/adminsetting/church-detail' },
  { menuKey: 'admin_p1', menuName: '① 전도 현황 관리 [구현예정]', category: '⚙️ 관리자 전용 (adminsetting)', path: '/adminsetting/evangelism' },
  { menuKey: 'admin_p2', menuName: '② 센터 운영 관리 [구현예정]', category: '⚙️ 관리자 전용 (adminsetting)', path: '/adminsetting/center' },
  { menuKey: 'admin_p3', menuName: '③ 재적 및 입교 관리 [구현예정]', category: '⚙️ 관리자 전용 (adminsetting)', path: '/adminsetting/membership' },
  { menuKey: 'admin_p4', menuName: '④ 예배 및 출석 관리 [구현예정]', category: '⚙️ 관리자 전용 (adminsetting)', path: '/adminsetting/worship' },
  { menuKey: 'users', menuName: '🌍 회원 및 담당 범위 관리', category: '⚙️ 관리자 전용 (adminsetting)', path: '/adminsetting/users' },
  { menuKey: 'roles', menuName: '📈 권한 그룹 및 회원 할당', category: '⚙️ 관리자 전용 (adminsetting)', path: '/adminsetting/roles' },
  { menuKey: 'perm', menuName: '🔑 권한별 접근 메뉴 설정', category: '⚙️ 관리자 전용 (adminsetting)', path: '/adminsetting/permissions' },
  { menuKey: 'login_logs', menuName: '📥 로그인 로그 관리', category: '⚙️ 관리자 전용 (adminsetting)', path: '/adminsetting/login-logs' },
  { menuKey: 'access_logs', menuName: '📥 접근 로그 관리', category: '⚙️ 관리자 전용 (adminsetting)', path: '/adminsetting/access-logs' },
  { menuKey: 'i18n', menuName: '🌐 다국어 사전 관리', category: '⚙️ 관리자 전용 (adminsetting)', path: '/adminsetting/i18n' },
  { menuKey: 'sys', menuName: '⚙️ 시스템 설정', category: '⚙️ 관리자 전용 (adminsetting)', path: '/adminsetting/settings' }
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
    const cleanRole = (roleId || '').toUpperCase();
    let cleanRoleId = cleanRole.startsWith('ROLE_') ? cleanRole : `ROLE_${cleanRole}`;

    if (cleanRoleId === 'ROLE_ADMIN' || cleanRoleId === 'ADMIN' || cleanRoleId === '관리자' || cleanRoleId === 'ROLE_관리자') {
      return { read: true, write: true };
    }

    if (cleanRoleId === 'ROLE_해외선교부 담당자' || cleanRoleId === 'ROLE_USER') {
      cleanRoleId = 'ROLE_USER';
    } else if (cleanRoleId === 'ROLE_지파 담당자' || cleanRoleId === 'ROLE_JIPA') {
      cleanRoleId = 'ROLE_JIPA';
    } else if (cleanRoleId === 'ROLE_일반 회원' || cleanRoleId === 'ROLE_GUEST') {
      cleanRoleId = 'ROLE_GUEST';
    }

    let normKey = menuKey;
    if (menuKey === 'evangelism/check') normKey = 'p1_check';
    if (menuKey === 'evangelism/aggregate') normKey = 'p1_agg';
    if (menuKey === 'evangelism') normKey = 'p1';

    const permissions = roleService.getMenuPermissions();
    const matchedMenu = permissions.find(m => m.menuKey === normKey || m.path.includes(normKey));
    if (matchedMenu && matchedMenu.permissions) {
      const roleKeys = Object.keys(matchedMenu.permissions);
      const matchedKey = roleKeys.find(k => k === cleanRoleId);
      if (matchedKey && matchedMenu.permissions[matchedKey]) {
        return matchedMenu.permissions[matchedKey];
      }
    }

    // Default fallbacks if permissions matrix is uninitialized
    if (cleanRoleId === 'ROLE_USER') {
      return { read: true, write: !['users', 'roles', 'perm', 'sys'].includes(normKey) };
    } else if (cleanRoleId === 'ROLE_GUEST') {
      return { read: ['home', 'diag', 'inspect', 'funnel', 'map', 'p1_check'].includes(normKey), write: false };
    }
    return { read: true, write: false };
  },

  getLoginRedirectPath: (role: string): string => {
    const cleanRole = (role || '').toUpperCase();
    const roleId = cleanRole.startsWith('ROLE_') ? cleanRole : `ROLE_${cleanRole}`;

    if (roleId === 'ROLE_ADMIN' || roleId === 'ADMIN' || roleId === '관리자') {
      return '/adminsetting/dashboard';
    }

    try {
      const rawPerms = localStorage.getItem('OVERSEAS_PORTAL_PERMISSIONS');
      if (rawPerms) {
        const perms = JSON.parse(rawPerms);
        const homePerm = perms['home']?.[roleId] || { read: true };
        const checkPerm = perms['p1_check']?.[roleId] || { read: false };
        
        if (!homePerm.read && checkPerm.read) {
          return '/evangelism/check';
        }
      }
    } catch (e) {}

    return '/';
  }
};
