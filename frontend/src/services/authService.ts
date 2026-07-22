import api from './api';

export interface LoginParams {
  username: string;
  password: string;
  isTelegramWebApp: boolean;
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
  message: string;
}

export const authService = {
  login: async (params: LoginParams): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/login', params);
    return res.data;
  },

  verifyOtp: async (params: VerifyOtpParams): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/verify-otp', params);
    return res.data;
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
  }
};
