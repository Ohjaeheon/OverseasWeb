import api from './api';

export interface LoginLogItem {
  id: number;
  name: string;
  username: string;
  ipAddress: string;
  status: 'SUCCESS' | 'FAILED';
  details?: string;
  createdAt: string; // ISO 8601 or ZonedDateTime string
}

export interface AccessLogItem {
  id: number;
  name: string;
  username: string;
  pageName: string;
  path: string;
  ipAddress: string;
  createdAt: string; // ISO 8601 or ZonedDateTime string
}

export const logService = {
  // Login Logs
  getLoginLogs: async (query = '', status = 'ALL'): Promise<LoginLogItem[]> => {
    try {
      const res = await api.get<LoginLogItem[]>('/admin/logs/login', {
        params: { query, status }
      });
      return res.data;
    } catch (e) {
      console.error("Failed to fetch login logs from server:", e);
      return [];
    }
  },

  // 더 이상 프론트에서 수동 호출하지 않지만, 컴파일 방지용으로 남겨둠
  addLoginLog: async (username: string, status: 'SUCCESS' | 'FAILED', ipAddress = '127.0.0.1', details = '') => {
    return Promise.resolve();
  },

  clearLoginLogs: async (): Promise<void> => {
    await api.delete('/admin/logs/login');
  },

  // Access Logs
  getAccessLogs: async (query = ''): Promise<AccessLogItem[]> => {
    try {
      const res = await api.get<AccessLogItem[]>('/admin/logs/access', {
        params: { query }
      });
      return res.data;
    } catch (e) {
      console.error("Failed to fetch access logs from server:", e);
      return [];
    }
  },

  addAccessLog: async (pageName: string, path: string) => {
    try {
      await api.post('/logs/access', { pageName, path });
    } catch (e) {
      console.warn("Failed to submit access log:", e);
    }
  },

  clearAccessLogs: async (): Promise<void> => {
    await api.delete('/admin/logs/access');
  }
};

if (typeof window !== 'undefined') {
  (window as any).addAccessLog = logService.addAccessLog;
  (window as any).addLoginLog = logService.addLoginLog;
}
