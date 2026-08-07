import api from './api';

export interface OrgCard {
  id: string;
  role: string;
  name: string;
  photo?: string; // Base64 encoded image string
}

export interface OrgColumn {
  id: string;
  title: string;
  cards: OrgCard[];
}

export interface OrgChartData {
  leaderCard: OrgCard;
  columns: OrgColumn[];
}

export interface OrganizationChart {
  churchId: number;
  chartData: string;
  updatedAt?: string;
}

export const organizationService = {
  getChart: async (churchId: number): Promise<OrganizationChart> => {
    const res = await api.get<OrganizationChart>(`/organization/${churchId}`);
    return res.data;
  },
  saveChart: async (churchId: number, chartData: string): Promise<OrganizationChart> => {
    const res = await api.put<OrganizationChart>(`/organization/${churchId}`, { churchId, chartData });
    return res.data;
  }
};
