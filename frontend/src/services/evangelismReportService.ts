import api from './api';

// ─── 타입 정의 ───────────────────────────────────────────

export interface EvangelismReportTemplateItem {
  templateId: number;
  originalFilename: string;
  isActive: boolean;
  uploadedBy: string;
  uploadedAt: string;
}

export type EvangelismReportDataSource =
  | 'MEMBERSHIP_PREV_DEC'
  | 'EVANGELISM_MONTHLY_ADMIT'
  | 'EVANGELISM_YTD_ADMIT'
  | 'EVANGELISM_MONTHLY_TEACHER'
  | 'NONE';

export interface EvangelismReportFieldMapping {
  mappingId: number;
  fieldKey: string;
  label: string;
  columnLetter: string;
  dataSource: EvangelismReportDataSource;
  isEnabled: boolean;
}

// ─── API 함수 ────────────────────────────────────────────

export const evangelismReportService = {

  // 템플릿 이력 전체 조회
  listTemplates: async (): Promise<EvangelismReportTemplateItem[]> => {
    const res = await api.get<EvangelismReportTemplateItem[]>('/evangelism/monthly-report/template');
    return res.data;
  },

  // 새 템플릿 업로드 및 즉시 활성화 (비밀번호 필수)
  uploadTemplate: async (file: File, password: string): Promise<EvangelismReportTemplateItem> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('password', password);
    const res = await api.post<EvangelismReportTemplateItem>('/evangelism/monthly-report/template', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  // 과거 템플릿으로 롤백(활성 전환)
  activateTemplate: async (templateId: number): Promise<EvangelismReportTemplateItem> => {
    const res = await api.post<EvangelismReportTemplateItem>(`/evangelism/monthly-report/template/${templateId}/activate`);
    return res.data;
  },

  // 필드(열) 매핑 전체 조회
  listFieldMappings: async (): Promise<EvangelismReportFieldMapping[]> => {
    const res = await api.get<EvangelismReportFieldMapping[]>('/evangelism/monthly-report/field-mappings');
    return res.data;
  },

  // 필드(열) 매핑 수정
  updateFieldMapping: async (mappingId: number, payload: Partial<Pick<EvangelismReportFieldMapping, 'columnLetter' | 'dataSource' | 'isEnabled'>>): Promise<EvangelismReportFieldMapping> => {
    const res = await api.put<EvangelismReportFieldMapping>(`/evangelism/monthly-report/field-mappings/${mappingId}`, payload);
    return res.data;
  },

  // 선택한 교회·연·월 기준 월말보고서 다운로드
  exportReport: async (church: string, year: number, month: number): Promise<{ blob: Blob; filename: string }> => {
    const res = await api.get('/evangelism/monthly-report/export', {
      params: { church, year, month },
      responseType: 'blob'
    });
    let filename = `${church}_${year}년${month}월_전도월말보고서.xlsx`;
    const disposition = res.headers['content-disposition'] as string | undefined;
    if (disposition) {
      const match = /filename\*?=(?:UTF-8'')?["']?([^;"'\n]+)/.exec(disposition);
      if (match && match[1]) filename = decodeURIComponent(match[1].replace(/["']/g, ''));
    }
    return { blob: new Blob([res.data]), filename };
  },
};
