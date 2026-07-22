const SESSION_EXPIRY_MS = 30 * 60 * 1000; // 30분 (밀리초)

export const sessionService = {
  // 로그인 성공 시 30분 세션 시작
  startSession: (user: any, accessToken: string) => {
    const now = Date.now();
    const expiryTime = now + SESSION_EXPIRY_MS;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('loginTime', String(now));
    localStorage.setItem('sessionExpiry', String(expiryTime));
  },

  // 유효한 세션인지 30분 만료 여부 검사
  isSessionValid: (): boolean => {
    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');
    const expiryStr = localStorage.getItem('sessionExpiry');

    if (!token && !userStr) return false;

    // 만료 시각이 기록되어 있지 않거나, 현재 시간이 만료 시각(30분)을 초과한 경우
    if (!expiryStr) {
      sessionService.clearSession();
      return false;
    }

    const expiry = parseInt(expiryStr, 10);
    if (isNaN(expiry) || Date.now() > expiry) {
      sessionService.clearSession();
      return false;
    }

    return true;
  },

  // 남은 세션 시간(초) 반환
  getRemainingSeconds: (): number => {
    const expiryStr = localStorage.getItem('sessionExpiry');
    if (!expiryStr) return 0;
    const expiry = parseInt(expiryStr, 10);
    if (isNaN(expiry)) return 0;
    const diff = Math.floor((expiry - Date.now()) / 1000);
    return Math.max(0, diff);
  },

  // 세션 파기 (로그아웃 / 만료)
  clearSession: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    localStorage.removeItem('sessionExpiry');
    localStorage.removeItem('loginTime');
  }
};
