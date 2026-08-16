import api from './api';

export interface ManualMetricRow {
  churchId: number;
  churchName: string;
  jipa: string;
  country: string;
  yearMonth: string;
  registrationCount: number | null;
  registrationRate: number | null;
  graduationCount: number | null;
  graduationRate: number | null;
  studentPreOpen: number | null;
  studentElementary: number | null;
  studentMiddle: number | null;
  studentHigh: number | null;
}

export const homeDashboardManualService = {
  getAll: async (year: number, month: number): Promise<ManualMetricRow[]> => {
    const res = await api.get<ManualMetricRow[]>('/admin/home-dashboard-manual', { params: { year, month } });
    return res.data;
  },
  bulkSave: async (rows: ManualMetricRow[]): Promise<void> => {
    await api.put('/admin/home-dashboard-manual', rows);
  },
};
