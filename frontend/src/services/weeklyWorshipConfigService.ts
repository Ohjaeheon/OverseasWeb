import api from './api';

// ─── 타입 정의 ───────────────────────────────────────────

export interface RegionMapping {
  mappingId: number;
  regionNo: number;
  displayName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorshipTemplateItem {
  templateId: number;
  originalFilename: string;
  storedPath: string;
  regionCount: number | null;
  isActive: boolean;
  uploadedBy: string;
  uploadedAt: string;
}

// ─── API 함수 ────────────────────────────────────────────

export const weeklyWorshipConfigService = {

  // 지역 매핑 전체 조회
  listRegions: async (): Promise<RegionMapping[]> => {
    const res = await api.get<RegionMapping[]>('/admin/weekly-worship/regions');
    return res.data;
  },

  // 지역 매핑 신규 등록
  createRegion: async (regionNo: number, displayName: string): Promise<RegionMapping> => {
    const res = await api.post<RegionMapping>('/admin/weekly-worship/regions', { regionNo, displayName });
    return res.data;
  },

  // 지역 매핑 수정 (번호/표시명/활성여부)
  updateRegion: async (mappingId: number, payload: Partial<Pick<RegionMapping, 'regionNo' | 'displayName' | 'isActive'>>): Promise<RegionMapping> => {
    const res = await api.put<RegionMapping>(`/admin/weekly-worship/regions/${mappingId}`, payload);
    return res.data;
  },

  // 지역 매핑 삭제
  deleteRegion: async (mappingId: number): Promise<void> => {
    await api.delete(`/admin/weekly-worship/regions/${mappingId}`);
  },

  // 업로드된 템플릿 이력 전체 조회
  listTemplates: async (): Promise<WorshipTemplateItem[]> => {
    const res = await api.get<WorshipTemplateItem[]>('/admin/weekly-worship/template');
    return res.data;
  },

  // 새 템플릿 업로드 및 즉시 활성화
  uploadTemplate: async (file: File): Promise<WorshipTemplateItem> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<WorshipTemplateItem>('/admin/weekly-worship/template', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  // 과거 템플릿으로 롤백(활성 전환)
  activateTemplate: async (templateId: number): Promise<WorshipTemplateItem> => {
    const res = await api.post<WorshipTemplateItem>(`/admin/weekly-worship/template/${templateId}/activate`);
    return res.data;
  },
};
