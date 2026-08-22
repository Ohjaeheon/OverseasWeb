import api from './api';
import { ADMIN_MENU_CATALOG, SidebarItem } from '../components/admin/adminMenuCatalog';

const STORAGE_KEY = 'OVERSEAS_PORTAL_ADMIN_MENU_LAYOUT';

export const menuLayoutService = {
  getAdminMenuLayout: (): SidebarItem[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load admin menu layout from localStorage', e);
    }
    return ADMIN_MENU_CATALOG;
  },

  saveAdminMenuLayout: async (layout: SidebarItem[]): Promise<void> => {
    const jsonStr = JSON.stringify(layout);
    try {
      localStorage.setItem(STORAGE_KEY, jsonStr);
    } catch (e) {
      console.warn('Failed to save admin menu layout to localStorage', e);
    }
    try {
      await api.put('/admin/configs', {
        configKey: 'admin_menu_layout',
        configValue: jsonStr
      });
    } catch (e) {
      console.warn('Failed to save admin menu layout to DB', e);
    }
  },

  fetchAdminMenuLayoutFromDb: async (): Promise<void> => {
    try {
      const res = await api.get<{ adminMenuLayout: string }>('/diagnosis/permissions');
      if (res.data && res.data.adminMenuLayout) {
        localStorage.setItem(STORAGE_KEY, res.data.adminMenuLayout);
      }
    } catch (e) {
      console.warn('Failed to fetch admin menu layout from DB', e);
    }
  }
};
