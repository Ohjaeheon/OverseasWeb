import api from './api';
import { Week } from '../utils/weekUtil';

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

/** grouped_table 전용: leaf(최하단) 컬럼. groupLabel이 같은 연속 leaf는 상단에 병합 헤더로 묶인다. */
export interface LeafColumn {
  key: string;
  label: string;
  groupLabel?: string;
  /** 계산식 (선택). 같은 표의 다른 컬럼 key를 변수로 참조하는 사칙연산 수식. 지정 시 사용자 입력 대신 자동 계산됨. */
  formula?: string;
}

/** notes_board 전용: 사용자가 화면에서 자유롭게 추가하는 사진+텍스트 카드 한 장 (제출 데이터에 저장되는 실제 항목) */
export interface NotesBoardEntry {
  cardId: string;
  title: string;
  value: string;
  photoPaths: string[];
}

export interface FormSection {
  sectionId: string;
  title: string;
  type: 'grouped_table' | 'dynamic_table' | 'dynamic_fields' | 'photo_upload' | 'notes_board';
  // grouped_table (표1 예배출결 / 표10 선교센터 / 표11 전도현황처럼 주차당 1행 요약표)
  leafColumns?: LeafColumn[];
  // dynamic_table (표15 주간교육처럼 행을 추가/삭제하는 표)
  columns?: string[];
  allowAddRow?: boolean;
  // notes_board (표19 주간특이사항: 사용자가 자유롭게 추가/삭제하는 사진+텍스트 카드. 관리자는 섹션만 두고
  // 개별 카드는 지정하지 않음 — 사용자가 화면에서 직접 제목/내용/사진을 채운다)
  maxCards?: number;
  // photo_upload
  maxFiles?: number;
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
  startYear: number;
  startMonth: number;
  startWeekOfMonth: number;
  formSchemaJson: string;
  isEnabled: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyReportSubmissionItem {
  submissionId: number;
  schema: { schemaId: number; weekLabel: string };
  reportYear: number;
  reportMonth: number;
  reportWeekOfMonth: number;
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
  jipa: string;
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

  // 관리자: 양식 사용 설정
  enableSchema: async (schemaId: number): Promise<WeeklyReportSchemaItem> => {
    const res = await api.post<WeeklyReportSchemaItem>(`/admin/weekly-report/schemas/${schemaId}/activate`);
    return res.data;
  },

  // 관리자: 양식 사용 중지
  disableSchema: async (schemaId: number): Promise<WeeklyReportSchemaItem> => {
    const res = await api.post<WeeklyReportSchemaItem>(`/admin/weekly-report/schemas/${schemaId}/deactivate`);
    return res.data;
  },

  // 관리자: 양식 삭제
  deleteSchema: async (schemaId: number): Promise<void> => {
    await api.delete(`/admin/weekly-report/schemas/${schemaId}`);
  },

  // 사용자: 현재 주차 기준 적용 양식 조회
  getActiveSchema: async (): Promise<WeeklyReportSchemaItem> => {
    const res = await api.get<WeeklyReportSchemaItem>('/weekly-report/active-schema');
    return res.data;
  },

  // 사용자: 특정 주차에 적용될 양식 조회
  getSchemaForWeek: async (week: Week): Promise<WeeklyReportSchemaItem> => {
    const res = await api.get<WeeklyReportSchemaItem>('/weekly-report/schema-for-week', { params: week });
    return res.data;
  },

  // 서버 기준 현재 주차 조회 (클라이언트 시간 조작/오차 방지)
  getServerCurrentWeek: async (): Promise<Week> => {
    const res = await api.get<Week>('/weekly-report/current-week');
    return res.data;
  },

  // 사용자: 접근 가능 교회 목록 (권한 필터)
  getAccessibleChurches: async (): Promise<ChurchOption[]> => {
    const res = await api.get<ChurchOption[]>('/weekly-report/accessible-churches');
    return res.data;
  },

  // 사용자: 보고 제출 (대상 주차는 현재 주차와 일치해야 함)
  submitReport: async (payload: {
    reportYear: number;
    reportMonth: number;
    reportWeekOfMonth: number;
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

  // 사용자: 내 교회의 특정 주차 제출 확인
  getMySubmission: async (week: Week, churchId: number): Promise<WeeklyReportSubmissionItem | null> => {
    try {
      const res = await api.get<WeeklyReportSubmissionItem>('/weekly-report/my-submission', {
        params: { ...week, churchId }
      });
      return res.data;
    } catch {
      return null;
    }
  },

  // 사용자: 내 교회의 전체 제출 이력 (주차 선택기 표시용)
  getMySubmissions: async (churchId: number): Promise<WeeklyReportSubmissionItem[]> => {
    const res = await api.get<WeeklyReportSubmissionItem[]>('/weekly-report/my-submissions', { params: { churchId } });
    return res.data;
  },

  // 관리자: 제출 현황 조회
  getSubmissions: async (week?: Week): Promise<WeeklyReportSubmissionItem[]> => {
    const params = week ? week : {};
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
