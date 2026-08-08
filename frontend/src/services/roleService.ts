import api from './api';

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
  { menuKey: 'calendar', menuName: '📅 캘린더', category: '🖥️ 일반 사용자 진단서 포탈', path: '/calendar' },
  { menuKey: 'organization', menuName: '🌳 조직도', category: '🖥️ 일반 사용자 진단서 포탈', path: '/organization' },
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
  { menuKey: 'p3', menuName: '③ 내무 (전체)', category: '🖥️ 일반 사용자 진단서 포탈', path: '/membership' },
  { menuKey: 'p3_check', menuName: '   ㄴ ③-1. 교회별 데이터 확인', category: '🖥️ 일반 사용자 진단서 포탈', path: '/membership/check' },
  { menuKey: 'p3_input', menuName: '   ㄴ ③-2. 월별 데이터 입력', category: '🖥️ 일반 사용자 진단서 포탈', path: '/membership/input' },
  { menuKey: 'p4', menuName: '④ 예배 · 전성도', category: '🖥️ 일반 사용자 진단서 포탈', path: '/worship' },
  { menuKey: 'business', menuName: '💼 업무 (전체)', category: '🖥️ 일반 사용자 진단서 포탈', path: '/business' },
  { menuKey: 'business_ledger', menuName: '   ㄴ 원장헌금', category: '🖥️ 일반 사용자 진단서 포탈', path: '/business/ledger' },
  { menuKey: 'business_ledger_archive', menuName: '     ㄴ 품의서 및 회의록 보관', category: '🖥️ 일반 사용자 진단서 포탈', path: '/business/ledger/archive' },
  { menuKey: 'business_ledger_report', menuName: '     ㄴ 품의서 및 회의록 작성', category: '🖥️ 일반 사용자 진단서 포탈', path: '/business/ledger/report' },
  { menuKey: 'business_fruit', menuName: '   ㄴ 열매헌금', category: '🖥️ 일반 사용자 진단서 포탈', path: '/business/fruit' },
  { menuKey: 'business_fruit_archive', menuName: '     ㄴ 품의서 및 회의록 보관', category: '🖥️ 일반 사용자 진단서 포탈', path: '/business/fruit/archive' },
  { menuKey: 'business_transport', menuName: '   ㄴ 교통비', category: '🖥️ 일반 사용자 진단서 포탈', path: '/business/transport' },
  { menuKey: 'business_transport_archive', menuName: '     ㄴ 품의서 및 회의록 보관', category: '🖥️ 일반 사용자 진단서 포탈', path: '/business/transport/archive' },
  { menuKey: 'business_mission', menuName: '   ㄴ 선교비', category: '🖥️ 일반 사용자 진단서 포탈', path: '/business/mission' },
  { menuKey: 'business_mission_archive', menuName: '     ㄴ 품의서 및 회의록 보관', category: '🖥️ 일반 사용자 진단서 포탈', path: '/business/mission/archive' },
  { menuKey: 'approvals_pending', menuName: '📥 결재 대기중인 건', category: '🖥️ 일반 사용자 진단서 포탈', path: '/approvals/pending' },
  { menuKey: 'approvals_completed', menuName: '📋 결재 완료 건', category: '🖥️ 일반 사용자 진단서 포탈', path: '/approvals/completed' },

  // Admin Portal Menus
  { menuKey: 'admin_dash', menuName: '📊 관리자 대시보드', category: '⚙️ 관리자 전용 (adminsetting)', path: '/adminsetting/dashboard' },
  { menuKey: 'admin_faith', menuName: '🩺 해외교회 · 지역 · 개척지 관리', category: '⚙️ 관리자 전용 (adminsetting)', path: '/adminsetting/faith-records' },
  { menuKey: 'admin_detail', menuName: '🔍 교회 상세 정밀 진단 [구현예정]', category: '⚙️ 관리자 전용 (adminsetting)', path: '/adminsetting/church-detail' },
  { menuKey: 'weekly_worship', menuName: '📅 주간예배 출결 - 취합 실행', category: '⚙️ 관리자 전용 (adminsetting)', path: '/adminsetting/weekly-worship' },
  { menuKey: 'weekly_worship_history', menuName: '   ㄴ 이전 데이터 확인', category: '⚙️ 관리자 전용 (adminsetting)', path: '/adminsetting/weekly-worship/history' },
  { menuKey: 'evangelism_bulk', menuName: '📊 전도 가개강 데이터 전체관리', category: '⚙️ 관리자 전용 (adminsetting)', path: '/adminsetting/evangelism-bulk' },
  { menuKey: 'membership_bulk', menuName: '👥 내무 데이터 전체관리', category: '⚙️ 관리자 전용 (adminsetting)', path: '/adminsetting/membership-bulk' },
  { menuKey: 'users', menuName: '🌍 회원 및 담당 범위 관리', category: '⚙️ 관리자 전용 (adminsetting)', path: '/adminsetting/users' },
  { menuKey: 'roles', menuName: '📈 권한 그룹 및 회원 할당', category: '⚙️ 관리자 전용 (adminsetting)', path: '/adminsetting/roles' },
  { menuKey: 'perm', menuName: '🔑 권한별 접근 메뉴 설정', category: '⚙️ 관리자 전용 (adminsetting)', path: '/adminsetting/permissions' },
  { menuKey: 'login_logs', menuName: '📥 로그인 로그 관리', category: '⚙️ 관리자 전용 (adminsetting)', path: '/adminsetting/login-logs' },
  { menuKey: 'access_logs', menuName: '📥 접근 로그 관리', category: '⚙️ 관리자 전용 (adminsetting)', path: '/adminsetting/access-logs' },
  { menuKey: 'file_upload_logs', menuName: '📥 파일 업로드 로그 관리', category: '⚙️ 관리자 전용 (adminsetting)', path: '/adminsetting/file-upload-logs' },
  { menuKey: 'file_download_logs', menuName: '📥 파일 다운로드 로그 관리', category: '⚙️ 관리자 전용 (adminsetting)', path: '/adminsetting/file-download-logs' },
  { menuKey: 'i18n', menuName: '🌐 다국어 사전 관리', category: '⚙️ 관리자 전용 (adminsetting)', path: '/adminsetting/i18n' },
  { menuKey: 'sys', menuName: '⚙️ 시스템 설정', category: '⚙️ 관리자 전용 (adminsetting)', path: '/adminsetting/settings' },
  { menuKey: 'admin_bot', menuName: '🤖 봇 연결 관리', category: '⚙️ 관리자 전용 (adminsetting)', path: '/adminsetting/bot' }
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
            const isRestricted = ['users', 'roles', 'perm', 'sys', 'admin_bot', 'business', 'business_ledger', 'business_ledger_report', 'business_fruit', 'business_transport', 'business_mission', 'approvals_pending', 'approvals_completed'].includes(m.menuKey);
            permObj[r.roleId] = { read: !isRestricted, write: !isRestricted };
          } else if (r.roleId === 'ROLE_GUEST') {
            permObj[r.roleId] = { read: ['home', 'diag', 'inspect', 'funnel', 'map', 'calendar', 'organization'].includes(m.menuKey), write: false };
          } else {
            // Custom roles default read access
            permObj[r.roleId] = { read: ['home', 'diag', 'calendar', 'organization'].includes(m.menuKey), write: false };
          }
        }
      });

      return {
        ...m,
        permissions: permObj
      };
    });
  },

  fetchMenuPermissionsFromDb: async (): Promise<void> => {
    try {
      const res = await api.get<{ permissions: string }>('/diagnosis/permissions');
      if (res.data && res.data.permissions) {
        localStorage.setItem(PERM_STORAGE_KEY, res.data.permissions);
      }
    } catch (e) {
      console.warn("Failed to fetch menu permissions from DB", e);
    }
  },

  saveMenuPermissions: async (menus: MenuPermission[]): Promise<void> => {
    const matrixToSave: Record<string, Record<string, { read: boolean; write: boolean }>> = {};
    menus.forEach((m) => {
      matrixToSave[m.menuKey] = m.permissions;
    });
    const jsonStr = JSON.stringify(matrixToSave);
    try {
      localStorage.setItem(PERM_STORAGE_KEY, jsonStr);
    } catch (e) {
      console.warn("Failed to save permissions matrix locally", e);
    }
    try {
      await api.put('/admin/configs', {
        configKey: 'menu_permissions_matrix',
        configValue: jsonStr
      });
    } catch (e) {
      console.warn("Failed to save permissions matrix to DB", e);
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
    if (menuKey === 'membership/check') normKey = 'p3_check';
    if (menuKey === 'membership/input') normKey = 'p3_input';
    if (menuKey === 'membership') normKey = 'p3';
    if (menuKey === 'business/ledger/report') normKey = 'business_ledger_report';
    if (menuKey === 'business/ledger/archive') normKey = 'business_ledger_archive';
    if (menuKey === 'business/fruit/archive') normKey = 'business_fruit_archive';
    if (menuKey === 'business/transport/archive') normKey = 'business_transport_archive';
    if (menuKey === 'business/mission/archive') normKey = 'business_mission_archive';
    if (menuKey === 'business/ledger') normKey = 'business_ledger';
    if (menuKey === 'business/fruit') normKey = 'business_fruit';
    if (menuKey === 'business/transport') normKey = 'business_transport';
    if (menuKey === 'business/mission') normKey = 'business_mission';
    if (menuKey === 'business') normKey = 'business';
    if (menuKey === 'approvals/pending') normKey = 'approvals_pending';
    if (menuKey === 'approvals/completed') normKey = 'approvals_completed';

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
      const isRestricted = ['users', 'roles', 'perm', 'sys', 'admin_bot', 'login_logs', 'access_logs', 'file_upload_logs', 'file_download_logs', 'business', 'business_ledger', 'business_ledger_report', 'business_fruit', 'business_transport', 'business_mission', 'approvals_pending', 'approvals_completed'].includes(normKey);
      return { read: !isRestricted, write: !isRestricted };
    } else if (cleanRoleId === 'ROLE_GUEST') {
      return { read: ['home', 'diag', 'inspect', 'funnel', 'map', 'calendar', 'organization'].includes(normKey), write: false };
    }
    return { read: ['home', 'diag', 'calendar', 'organization'].includes(normKey), write: false };
  },

  getLoginRedirectPath: (role: string): string => {
    const cleanRole = (role || '').toUpperCase();
    const roleId = cleanRole.startsWith('ROLE_') ? cleanRole : `ROLE_${cleanRole}`;

    if (roleId === 'ROLE_ADMIN' || roleId === 'ADMIN' || roleId === '관리자' || roleId === 'ROLE_관리자') {
      return '/adminsetting/dashboard';
    }

    try {
      // 1. If user has home access, return main root path
      if (roleService.canRoleAccessMenu(roleId, 'home').read) {
        return '/';
      }

      // 2. If no home access, dynamically find the first menu that has read permission
      const permissions = roleService.getMenuPermissions();
      const accessibleMenu = permissions.find(m => roleService.canRoleAccessMenu(roleId, m.menuKey).read);
      if (accessibleMenu) {
        return accessibleMenu.path;
      }
    } catch (e) {
      console.warn("Failed to determine login redirect path dynamically", e);
    }

    return '/';
  }
};

(window as any).roleService = roleService;
