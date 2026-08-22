import api from './api';
import { USER_MENU_CATALOG, SidebarEntry } from '../components/user/diagnosis/userMenuCatalog';

const STORAGE_KEY = 'OVERSEAS_PORTAL_USER_MENU_LAYOUT';

export const userMenuLayoutService = {
  getUserMenuLayout: (): SidebarEntry[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load user menu layout from localStorage', e);
    }
    return USER_MENU_CATALOG;
  },

  saveUserMenuLayout: async (layout: SidebarEntry[]): Promise<void> => {
    const jsonStr = JSON.stringify(layout);
    try {
      localStorage.setItem(STORAGE_KEY, jsonStr);
    } catch (e) {
      console.warn('Failed to save user menu layout to localStorage', e);
    }
    try {
      await api.put('/admin/configs', {
        configKey: 'user_menu_layout',
        configValue: jsonStr
      });
    } catch (e) {
      console.warn('Failed to save user menu layout to DB', e);
    }
  },

  fetchUserMenuLayoutFromDb: async (): Promise<void> => {
    try {
      const res = await api.get<{ userMenuLayout: string }>('/diagnosis/permissions');
      if (res.data && res.data.userMenuLayout) {
        localStorage.setItem(STORAGE_KEY, res.data.userMenuLayout);
      }
    } catch (e) {
      console.warn('Failed to fetch user menu layout from DB', e);
    }
  }
};
