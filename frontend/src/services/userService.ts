import api from './api';

export interface UserProfileResponse {
  userId: number;
  username: string;
  name: string;
  role: string;
  assignedCountry: string;
  telegramId?: string;
  telegramChatId?: string;
  isActive: boolean;
  isOtpExempt: boolean;
  mustChangePassword?: boolean;
}

export interface ProfileUpdateParams {
  telegramId?: string;
  telegramChatId?: string;
}

export interface ProfileBotTestParams {
  botId: string;
  testMessage: string;
}

export const userService = {
  getProfile: async (): Promise<UserProfileResponse> => {
    const res = await api.get<UserProfileResponse>('/users/profile');
    return res.data;
  },

  updateProfile: async (params: ProfileUpdateParams): Promise<UserProfileResponse> => {
    const res = await api.put<UserProfileResponse>('/users/profile', params);
    return res.data;
  },

  testBotMessage: async (params: ProfileBotTestParams): Promise<string> => {
    const res = await api.post<string>('/users/profile/bot-test', params);
    return res.data;
  },

  updatePassword: async (params: { currentPassword?: string; newPassword?: string }): Promise<string> => {
    const res = await api.put<string>('/users/profile/password', params);
    return res.data;
  }
};
