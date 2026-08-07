import api from './api';

export interface LoginParams {
  username: string;
  password: string;
  isTelegramWebApp: boolean;
  telegramInitData?: string;
}

export interface VerifyOtpParams {
  preAuthToken: string;
  otpCode: string;
}

export interface AuthResponse {
  requireOtp: boolean;
  preAuthToken?: string;
  accessToken?: string;
  username?: string;
  name?: string;
  role?: string;
  assignedCountry?: string;
  mustChangePassword?: boolean;
  isOtpExempt?: boolean;
  telegramChatId?: string;
  telegramUsername?: string;
  message: string;
}

export const authService = {
  login: async (params: LoginParams): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/login', params);
    return res.data;
  },

  telegramLogin: async (initData: string): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/telegram-login', { initData });
    return res.data;
  },

  verifyOtp: async (params: VerifyOtpParams): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/verify-otp', params);
    return res.data;
  },

  checkBackdoorIp: async (): Promise<{ clientIp: string; isLocalhost: boolean; isBackdoorAllowed: boolean }> => {
    const res = await api.get<{ clientIp: string; isLocalhost: boolean; isBackdoorAllowed: boolean }>('/auth/backdoor/check-ip');
    return res.data;
  },

  getBackdoorIps: async (): Promise<string[]> => {
    const res = await api.get<string[]>('/auth/backdoor/ips');
    return res.data;
  },

  addBackdoorIp: async (ip: string): Promise<string[]> => {
    const res = await api.post<string[]>('/auth/backdoor/ips', { ip });
    return res.data;
  },

  deleteBackdoorIp: async (ip: string): Promise<string[]> => {
    const res = await api.delete<string[]>('/auth/backdoor/ips', { data: { ip } });
    return res.data;
  },

  searchBackdoorUsers: async (query: string): Promise<Array<{ username: string; name: string; role: string }>> => {
    const res = await api.get<Array<{ username: string; name: string; role: string }>>('/auth/backdoor/users', { params: { query } });
    return res.data;
  },

  backdoorLogin: async (username: string): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/backdoor/login', { username });
    return res.data;
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.warn("Failed to call logout API", e);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      localStorage.removeItem('sessionExpiry');
      localStorage.removeItem('loginTime');
    }
  }
};
