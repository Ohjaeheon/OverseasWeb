import api from './api';

// ─── 타입 정의 ───────────────────────────────────────────

export interface FormField {
  fieldId: string;
  label: string;
  type: 'text' | 'number' | 'church_select' | 'date';
  required?: boolean;
  placeholder?: string;
}

export interface TableRow {
  rowId: string;
  label: string;
}

export interface FormSection {
  sectionId: string;
  title: string;
  type: 'table' | 'dynamic_table' | 'dynamic_fields' | 'photo_upload' | 'fields';
  columns?: string[];
  rows?: TableRow[];
  allowAddRow?: boolean;
  allowAddField?: boolean;
  maxFiles?: number;
  fields?: FormField[];
}

export interface FormPage {
  pageId: string;
  title: string;
  fields?: FormField[];
  sections?: FormSection[];
}

export interface FormSchema {
  pages: FormPage[];
}

export interface WeeklyReportSchemaItem {
  schemaId: number;
  weekLabel: string;
  year: number;
  weekNumber: number;
  formSchemaJson: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyReportSubmissionItem {
  submissionId: number;
  schema: { schemaId: number; weekLabel: string };
  churchId: number;
  churchName: string;
  submittedBy: string;
  submitDataJson: string;
  photoPaths: string | null;
  status: string;
  submittedAt: string;
  updatedAt: string;
}

export interface ChurchOption {
  churchId: number;
  name: string;
  country: string;
  gubun: string;
}

// ─── API 함수 ────────────────────────────────────────────

export const weeklyReportService = {

  // 관리자: 전체 양식 목록
  getSchemas: async (): Promise<WeeklyReportSchemaItem[]> => {
    const res = await api.get<WeeklyReportSchemaItem[]>('/admin/weekly-report/schemas');
    return res.data;
  },

  // 관리자: 양식 생성
  createSchema: async (schema: Partial<WeeklyReportSchemaItem>): Promise<WeeklyReportSchemaItem> => {
    const res = await api.post<WeeklyReportSchemaItem>('/admin/weekly-report/schemas', schema);
    return res.data;
  },

  // 관리자: 양식 수정
  updateSchema: async (schemaId: number, schema: Partial<WeeklyReportSchemaItem>): Promise<WeeklyReportSchemaItem> => {
    const res = await api.put<WeeklyReportSchemaItem>(`/admin/weekly-report/schemas/${schemaId}`, schema);
    return res.data;
  },

  // 관리자: 양식 활성화
  activateSchema: async (schemaId: number): Promise<WeeklyReportSchemaItem> => {
    const res = await api.post<WeeklyReportSchemaItem>(`/admin/weekly-report/schemas/${schemaId}/activate`);
    return res.data;
  },

  // 관리자: 양식 비활성화
  deactivateSchema: async (schemaId: number): Promise<WeeklyReportSchemaItem> => {
    const res = await api.post<WeeklyReportSchemaItem>(`/admin/weekly-report/schemas/${schemaId}/deactivate`);
    return res.data;
  },

  // 관리자: 양식 삭제
  deleteSchema: async (schemaId: number): Promise<void> => {
    await api.delete(`/admin/weekly-report/schemas/${schemaId}`);
  },

  // 사용자: 활성 양식 조회
  getActiveSchema: async (): Promise<WeeklyReportSchemaItem> => {
    const res = await api.get<WeeklyReportSchemaItem>('/weekly-report/active-schema');
    return res.data;
  },

  // 사용자: 접근 가능 교회 목록 (권한 필터)
  getAccessibleChurches: async (): Promise<ChurchOption[]> => {
    const res = await api.get<ChurchOption[]>('/weekly-report/accessible-churches');
    return res.data;
  },

  // 사용자: 보고 제출
  submitReport: async (payload: {
    schemaId: number;
    churchId: number;
    submitDataJson: string;
    photoPaths?: string;
  }): Promise<WeeklyReportSubmissionItem> => {
    const res = await api.post<WeeklyReportSubmissionItem>('/weekly-report/submit', payload);
    return res.data;
  },

  // 사용자: 사진 업로드
  uploadPhotos: async (files: File[]): Promise<string[]> => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    const res = await api.post<{ paths: string[] }>(
      '/weekly-report/submit/photos',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return res.data.paths;
  },

  // 사용자: 내 제출 확인
  getMySubmission: async (schemaId: number, churchId: number): Promise<WeeklyReportSubmissionItem | null> => {
    try {
      const res = await api.get<WeeklyReportSubmissionItem>('/weekly-report/my-submission', {
        params: { schemaId, churchId }
      });
      return res.data;
    } catch {
      return null;
    }
  },

  // 관리자: 제출 현황 조회
  getSubmissions: async (schemaId?: number): Promise<WeeklyReportSubmissionItem[]> => {
    const params = schemaId ? { schemaId } : {};
    const res = await api.get<WeeklyReportSubmissionItem[]>('/admin/weekly-report/submissions', { params });
    return res.data;
  },

  // 관리자: 제출 상세 조회
  getSubmission: async (submissionId: number): Promise<WeeklyReportSubmissionItem> => {
    const res = await api.get<WeeklyReportSubmissionItem>(`/admin/weekly-report/submissions/${submissionId}`);
    return res.data;
  },

  // 관리자: 제출 삭제
  deleteSubmission: async (submissionId: number): Promise<void> => {
    await api.delete(`/admin/weekly-report/submissions/${submissionId}`);
  },
};

