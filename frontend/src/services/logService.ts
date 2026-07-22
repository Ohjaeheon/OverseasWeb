export interface LoginLogItem {
  id: number;
  timestamp: string; // YYYY/MM/DD HH:mm:ss.SSS
  username: string;
  ipAddress: string;
  status: 'SUCCESS' | 'FAILED';
  details?: string;
}

export interface AccessLogItem {
  id: number;
  timestamp: string; // YYYY/MM/DD HH:mm:ss.SSS
  username: string;
  pageName: string;
  path: string;
}

const LOGIN_LOGS_KEY = 'OVERSEAS_PORTAL_LOGIN_LOGS';
const ACCESS_LOGS_KEY = 'OVERSEAS_PORTAL_ACCESS_LOGS';

export const formatTimestampWithMs = (d: Date = new Date()): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${yyyy}/${mm}/${dd} ${hh}:${min}:${ss}.${ms}`;
};

const DEFAULT_LOGIN_LOGS: LoginLogItem[] = [
  { id: 1, timestamp: formatTimestampWithMs(new Date(Date.now() - 3600000 * 2)), username: 'admin', ipAddress: '192.168.0.53', status: 'SUCCESS', details: '관리자 로그인 성공' },
  { id: 2, timestamp: formatTimestampWithMs(new Date(Date.now() - 3600000 * 5)), username: 'user', ipAddress: '192.168.0.12', status: 'SUCCESS', details: '일반 사용자 로그인 성공' },
  { id: 3, timestamp: formatTimestampWithMs(new Date(Date.now() - 3600000 * 12)), username: 'guest01', ipAddress: '211.201.32.11', status: 'FAILED', details: '비밀번호 불일치 실패' },
  { id: 4, timestamp: formatTimestampWithMs(new Date(Date.now() - 3600000 * 24)), username: 'admin', ipAddress: '127.0.0.1', status: 'SUCCESS', details: '로컬 관리자 로그인 성공' }
];

const DEFAULT_ACCESS_LOGS: AccessLogItem[] = [
  { id: 1, timestamp: formatTimestampWithMs(new Date(Date.now() - 60000 * 3)), username: 'admin', pageName: '🌍 회원 관리', path: '/adminsetting/users' },
  { id: 2, timestamp: formatTimestampWithMs(new Date(Date.now() - 60000 * 8)), username: 'admin', pageName: '🩺 해외교회 · 지역 · 개척지 관리', path: '/adminsetting/faith-records' },
  { id: 3, timestamp: formatTimestampWithMs(new Date(Date.now() - 60000 * 15)), username: 'user', pageName: '🏠 진단서 포탈 메인', path: '/' },
  { id: 4, timestamp: formatTimestampWithMs(new Date(Date.now() - 60000 * 30)), username: 'admin', pageName: '🔑 권한별 접근 메뉴 설정', path: '/adminsetting/permissions' }
];

export const logService = {
  // Login Logs
  getLoginLogs: (): LoginLogItem[] => {
    try {
      const stored = localStorage.getItem(LOGIN_LOGS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn("Failed to load login logs", e);
    }
    return DEFAULT_LOGIN_LOGS;
  },

  addLoginLog: (username: string, status: 'SUCCESS' | 'FAILED', ipAddress = '192.168.0.53', details = '') => {
    const logs = logService.getLoginLogs();
    const newLog: LoginLogItem = {
      id: Date.now(),
      timestamp: formatTimestampWithMs(),
      username: username || 'unknown',
      ipAddress: ipAddress || '192.168.0.53',
      status,
      details: details || (status === 'SUCCESS' ? '로그인 성공' : '로그인 실패')
    };
    const updated = [newLog, ...logs].slice(0, 100);
    try {
      localStorage.setItem(LOGIN_LOGS_KEY, JSON.stringify(updated));
    } catch (e) {}
    return newLog;
  },

  clearLoginLogs: () => {
    localStorage.removeItem(LOGIN_LOGS_KEY);
  },

  // Access Logs
  getAccessLogs: (): AccessLogItem[] => {
    try {
      const stored = localStorage.getItem(ACCESS_LOGS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn("Failed to load access logs", e);
    }
    return DEFAULT_ACCESS_LOGS;
  },

  addAccessLog: (pageName: string, path: string, username?: string) => {
    const logs = logService.getAccessLogs();
    let currentUsername = username || 'guest';
    if (!username) {
      try {
        const u = localStorage.getItem('user');
        if (u) {
          const parsed = JSON.parse(u);
          currentUsername = parsed.username || parsed.name || 'guest';
        }
      } catch (e) {}
    }

    const newLog: AccessLogItem = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      timestamp: formatTimestampWithMs(),
      username: currentUsername,
      pageName,
      path
    };

    const updated = [newLog, ...logs].slice(0, 500);
    try {
      localStorage.setItem(ACCESS_LOGS_KEY, JSON.stringify(updated));
    } catch (e) {}
    return newLog;
  },

  clearAccessLogs: () => {
    localStorage.removeItem(ACCESS_LOGS_KEY);
  }
};

if (typeof window !== 'undefined') {
  (window as any).addAccessLog = logService.addAccessLog;
  (window as any).addLoginLog = logService.addLoginLog;
}
