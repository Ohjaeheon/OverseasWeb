import api from './api';

export interface UserItem {
  userId?: number;
  username: string;
  name: string;
  role: string;
  assignedCountry?: string;
  mustChangePassword?: boolean;
  telegramId?: string;
  telegramChatId?: string;
  isActive?: boolean;
  isOtpExempt?: boolean;
  isWorshipPermitted?: boolean;
}

export interface TelegramBotConfig {
  botId: string;
  name: string;
  botToken: string;
  botUsername: string;
  isActive: boolean;
  description: string;
}

export interface ChurchItem {
  churchId?: number;
  continent: string;
  country: string;
  jipa: string;
  gubun: string;
  name: string;
  leaderName?: string;
  flightTime?: string;
  distanceKm?: number;
  timeDiff?: string;
  language?: string;
  religion?: string;
  lat?: number;
  lon?: number;
  sortOrder?: number;
  isActive?: boolean;
}

export interface AdminDashboardData {
  totalUsers: number;
  activeUsers: number;
  totalChurches: number;
  totalFaithRecords: number;
  recentLogs: any[];
}

export const adminService = {
  getDashboard: async (): Promise<AdminDashboardData> => {
    const res = await api.get<AdminDashboardData>('/admin/dashboard');
    return res.data;
  },

  getUsers: async (): Promise<UserItem[]> => {
    const res = await api.get<UserItem[]>('/admin/users');
    return res.data;
  },

  createUser: async (user: UserItem): Promise<UserItem> => {
    const res = await api.post<UserItem>('/admin/users', user);
    return res.data;
  },

  updateUser: async (userId: number, user: UserItem): Promise<UserItem> => {
    const res = await api.put<UserItem>(`/admin/users/${userId}`, user);
    return res.data;
  },

  resetUserPassword: async (userId: number): Promise<UserItem> => {
    const res = await api.post<UserItem>(`/admin/users/${userId}/reset-password`);
    return res.data;
  },

  deleteUser: async (userId: number): Promise<void> => {
    await api.delete(`/admin/users/${userId}`);
  },

  updateTelegramMapping: async (userId: number, telegramId: string, telegramChatId: string) => {
    const res = await api.put(`/admin/users/${userId}/telegram`, { telegramId, telegramChatId });
    return res.data;
  },

  getChurches: async (): Promise<ChurchItem[]> => {
    const res = await api.get<ChurchItem[]>('/admin/churches');
    return res.data;
  },

  createChurch: async (church: ChurchItem): Promise<ChurchItem> => {
    const res = await api.post<ChurchItem>('/admin/churches', church);
    return res.data;
  },

  updateChurch: async (churchId: number, church: ChurchItem): Promise<ChurchItem> => {
    const res = await api.put<ChurchItem>(`/admin/churches/${churchId}`, church);
    return res.data;
  },

  deleteChurch: async (churchId: number): Promise<void> => {
    await api.delete(`/admin/churches/${churchId}`);
  },

  getFaithRecords: async () => {
    const res = await api.get('/admin/faith-records');
    return res.data;
  },

  updateFaithRecord: async (recordId: number, data: any) => {
    const res = await api.put(`/admin/faith-records/${recordId}`, data);
    return res.data;
  },

  getConfigs: async () => {
    const res = await api.get('/admin/configs');
    return res.data;
  },

  updateConfig: async (configKey: string, configValue: string, description?: string) => {
    const res = await api.put('/admin/configs', { configKey, configValue, description });
    return res.data;
  },

  deleteConfig: async (configId: number) => {
    const res = await api.delete(`/admin/configs/${configId}`);
    return res.data;
  },

  getBots: async (): Promise<TelegramBotConfig[]> => {
    const res = await api.get<TelegramBotConfig[]>('/admin/bots');
    return res.data;
  },

  updateBots: async (bots: TelegramBotConfig[]): Promise<TelegramBotConfig[]> => {
    const res = await api.put<TelegramBotConfig[]>('/admin/bots', bots);
    return res.data;
  },

  getFileUploadLogs: async (query?: string): Promise<any[]> => {
    const res = await api.get<any[]>('/admin/logs/file-upload', { params: { query } });
    return res.data;
  },

  getFileDownloadLogs: async (query?: string): Promise<any[]> => {
    const res = await api.get<any[]>('/admin/logs/file-download', { params: { query } });
    return res.data;
  },

  clearFileUploadLogs: async (): Promise<void> => {
    await api.delete('/admin/logs/file-upload');
  },

  clearFileDownloadLogs: async (): Promise<void> => {
    await api.delete('/admin/logs/file-download');
  },

  // =============================================
  // 전도 가개강 데이터 전체 관리
  // =============================================

  getAllEvangelismRecords: async (year?: string, church?: string): Promise<any[]> => {
    const params: any = {};
    if (year) params.year = year;
    if (church) params.church = church;
    const res = await api.get<any[]>('/admin/evangelism/records', { params });
    return res.data;
  },

  updateEvangelismRecord: async (recordId: number, data: any): Promise<any> => {
    const res = await api.put(`/admin/evangelism/records/${recordId}`, data);
    return res.data;
  },

  deleteEvangelismRecord: async (recordId: number): Promise<void> => {
    await api.delete(`/admin/evangelism/records/${recordId}`);
  },

  // =============================================
  // 내무 데이터 전체 관리
  // =============================================

  getAllMembershipRecords: async (year?: string, church?: string): Promise<any[]> => {
    const params: any = {};
    if (year) params.year = year;
    if (church) params.church = church;
    const res = await api.get<any[]>('/admin/membership/records', { params });
    return res.data;
  },

  updateMembershipRecord: async (recordId: number, data: any): Promise<any> => {
    const res = await api.put(`/admin/membership/records/${recordId}`, data);
    return res.data;
  },

  deleteMembershipRecord: async (recordId: number): Promise<void> => {
    await api.delete(`/admin/membership/records/${recordId}`);
  },
};
