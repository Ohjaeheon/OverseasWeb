import api from './api';

export const countryFlagService = {
  getAll: async (): Promise<Record<string, string>> => {
    const res = await api.get<Record<string, string>>('/country-flags');
    return res.data;
  },
  upload: async (country: string, imageDataUrl: string): Promise<void> => {
    await api.put(`/admin/country-flags/${encodeURIComponent(country)}`, { imageDataUrl });
  },
  remove: async (country: string): Promise<void> => {
    await api.delete(`/admin/country-flags/${encodeURIComponent(country)}`);
  },
};
