// 로그인 사용자의 접근 범위(users 관리 페이지의 assignedCountry) 기반 데이터 필터링.
// assignedCountry는 필드명과 달리 실제로는 교회/지역명(또는 '전체')이 저장된다.
export interface AssignedScope {
  role: string;
  assignedLocation: string;
  isFullAccess: boolean;
}

export function getAssignedScope(): AssignedScope {
  const userStr = localStorage.getItem('user');
  if (!userStr) return { role: 'ROLE_USER', assignedLocation: '전체', isFullAccess: true };
  try {
    const u = JSON.parse(userStr);
    const role = u.role || 'ROLE_USER';
    const assignedLocation = u.assignedCountry || '전체';
    const isFullAccess = role === 'ROLE_ADMIN' || role === 'ADMIN' || role === '관리자' || assignedLocation === '전체';
    return { role, assignedLocation, isFullAccess };
  } catch {
    return { role: 'ROLE_USER', assignedLocation: '전체', isFullAccess: true };
  }
}

export function matchesAssignedLocation(entity: { name: string; country?: string; jipa?: string }, assignedLocation: string): boolean {
  return entity.name === assignedLocation ||
    entity.country === assignedLocation ||
    (!!entity.jipa && `${entity.jipa} · ${entity.name}` === assignedLocation);
}

/** 접근 범위가 '전체'/관리자가 아니면 배정된 교회/지역에 해당하는 항목만 남긴다. */
export function filterByAssignedScope<T extends { name: string; country?: string; jipa?: string }>(items: T[]): T[] {
  const scope = getAssignedScope();
  if (scope.isFullAccess) return items;
  return items.filter((item) => matchesAssignedLocation(item, scope.assignedLocation));
}
