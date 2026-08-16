import api from './api';

export interface OverseasBoardRow {
  churchId: number;
  name: string;
  jipa: string;
  gubun: string;
  continent: string;
  country: string;
  foundingDate: string | null;
  leaderName: string | null;
  prevYearEndReg: number;
  currentReg: number;
  preOpen: number;
  registrationCount: number | null;
  registrationRate: number | null;
  graduationCount: number | null;
  graduationRate: number | null;
  studentPreOpen: number | null;
  studentElementary: number | null;
  studentMiddle: number | null;
  studentHigh: number | null;
}

export const homeDashboardService = {
  getOverseasBoard: async (year: number, month: number): Promise<OverseasBoardRow[]> => {
    const res = await api.get<OverseasBoardRow[]>('/home-dashboard/overseas-board', { params: { year, month } });
    return res.data;
  },
};
