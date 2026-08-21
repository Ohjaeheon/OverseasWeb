import api from './api';

export interface Department {
  id: number;
  churchId: number;
  churchName?: string;
  name: string;
  leaderUserId?: number;
  leaderName?: string;
  teamCount: number;
  memberCount: number;
}

export interface Team {
  id: number;
  departmentId: number;
  name: string;
  leaderUserId?: number;
  leaderName?: string;
  memberCount: number;
}

export interface OrgMember {
  userId: number;
  username: string;
  name: string;
  role: string;
  departmentId?: number;
  teamId?: number;
  teamName?: string;
}

export const organizationStructureService = {
  /** 회원 관리 등 다른 화면에서 회원의 소속 부서/팀명을 표시하기 위한 전체 목록 조회. */
  getDirectory: async (): Promise<{ departments: Department[]; teams: Team[] }> => {
    const res = await api.get<{ departments: Department[]; teams: Team[] }>('/admin/org-structure/directory');
    return res.data;
  },

  getDepartments: async (churchId: number): Promise<Department[]> => {
    const res = await api.get<Department[]>('/admin/org-structure/departments', { params: { churchId } });
    return res.data;
  },

  createDepartment: async (churchId: number, name: string): Promise<Department> => {
    const res = await api.post<Department>('/admin/org-structure/departments', { churchId, name });
    return res.data;
  },

  renameDepartment: async (id: number, name: string): Promise<Department> => {
    const res = await api.put<Department>(`/admin/org-structure/departments/${id}`, { name });
    return res.data;
  },

  deleteDepartment: async (id: number): Promise<void> => {
    await api.delete(`/admin/org-structure/departments/${id}`);
  },

  setDepartmentLeader: async (id: number, userId: number | null): Promise<Department> => {
    const res = await api.put<Department>(`/admin/org-structure/departments/${id}/leader`, { userId });
    return res.data;
  },

  getTeams: async (departmentId: number): Promise<Team[]> => {
    const res = await api.get<Team[]>(`/admin/org-structure/departments/${departmentId}/teams`);
    return res.data;
  },

  createTeam: async (departmentId: number, name: string): Promise<Team> => {
    const res = await api.post<Team>(`/admin/org-structure/departments/${departmentId}/teams`, { name });
    return res.data;
  },

  renameTeam: async (id: number, name: string): Promise<Team> => {
    const res = await api.put<Team>(`/admin/org-structure/teams/${id}`, { name });
    return res.data;
  },

  deleteTeam: async (id: number): Promise<void> => {
    await api.delete(`/admin/org-structure/teams/${id}`);
  },

  setTeamLeader: async (id: number, userId: number | null): Promise<Team> => {
    const res = await api.put<Team>(`/admin/org-structure/teams/${id}/leader`, { userId });
    return res.data;
  },

  getDepartmentMembers: async (departmentId: number): Promise<OrgMember[]> => {
    const res = await api.get<OrgMember[]>(`/admin/org-structure/departments/${departmentId}/members`);
    return res.data;
  },

  assignUser: async (userId: number, departmentId: number | null, teamId: number | null): Promise<OrgMember> => {
    const res = await api.put<OrgMember>(`/admin/org-structure/users/${userId}/assignment`, { departmentId, teamId });
    return res.data;
  }
};
