import api from './api';

export type ApprovalTargetType = 'EVANGELISM' | 'MEMBERSHIP' | 'MONTHLY_ACTIVITY';
export type ApprovalResolverType = 'TEAM_LEADER' | 'DEPARTMENT_LEADER' | 'SPECIFIC_USER';

export interface ApprovalLineStepApprover {
  id: number;
  resolverType: ApprovalResolverType;
  specificUserId?: number;
  specificUserName?: string;
}

export interface ApprovalLineStep {
  id: number;
  stepOrder: number;
  name?: string;
  approvers: ApprovalLineStepApprover[];
}

export interface ApprovalLine {
  id: number;
  targetType: ApprovalTargetType;
  churchId?: number;
  churchName?: string;
  departmentId?: number;
  departmentName?: string;
  name: string;
  isActive: boolean;
  steps: ApprovalLineStep[];
}

export interface ApprovalLinePreviewApprover {
  resolverType: ApprovalResolverType;
  resolvedUserId?: number;
  resolvedUserName?: string;
  error?: string;
}

export interface ApprovalLinePreviewStep {
  stepOrder: number;
  name?: string;
  approvers: ApprovalLinePreviewApprover[];
}

export interface ApprovalLinePreview {
  lineId?: number;
  lineName?: string;
  scopeDescription?: string;
  steps?: ApprovalLinePreviewStep[];
  errorMessage?: string;
}

export const APPROVAL_TARGET_TYPE_LABELS: Record<ApprovalTargetType, string> = {
  EVANGELISM: '전도 실적수정',
  MEMBERSHIP: '내무 실적수정',
  MONTHLY_ACTIVITY: '전도 월간활동보고 수정',
};

export const APPROVAL_RESOLVER_TYPE_LABELS: Record<ApprovalResolverType, string> = {
  TEAM_LEADER: '팀장',
  DEPARTMENT_LEADER: '부서장',
  SPECIFIC_USER: '특정인원',
};

export const approvalLineService = {
  getLines: async (targetType: ApprovalTargetType): Promise<ApprovalLine[]> => {
    const res = await api.get<ApprovalLine[]>('/admin/approval-lines', { params: { targetType } });
    return res.data;
  },

  createLine: async (
    targetType: ApprovalTargetType,
    churchId: number | null,
    departmentId: number | null,
    name: string
  ): Promise<ApprovalLine> => {
    const res = await api.post<ApprovalLine>('/admin/approval-lines', { targetType, churchId, departmentId, name });
    return res.data;
  },

  updateLine: async (id: number, name?: string, isActive?: boolean): Promise<ApprovalLine> => {
    const res = await api.put<ApprovalLine>(`/admin/approval-lines/${id}`, { name, isActive });
    return res.data;
  },

  deleteLine: async (id: number): Promise<void> => {
    await api.delete(`/admin/approval-lines/${id}`);
  },

  addStep: async (lineId: number, name?: string): Promise<ApprovalLine> => {
    const res = await api.post<ApprovalLine>(`/admin/approval-lines/${lineId}/steps`, { name });
    return res.data;
  },

  renameStep: async (stepId: number, name: string): Promise<ApprovalLine> => {
    const res = await api.put<ApprovalLine>(`/admin/approval-lines/steps/${stepId}`, { name });
    return res.data;
  },

  reorderSteps: async (lineId: number, orderedStepIds: number[]): Promise<ApprovalLine> => {
    const res = await api.put<ApprovalLine>(`/admin/approval-lines/${lineId}/steps/reorder`, { orderedStepIds });
    return res.data;
  },

  deleteStep: async (stepId: number): Promise<void> => {
    await api.delete(`/admin/approval-lines/steps/${stepId}`);
  },

  addStepApprover: async (
    stepId: number,
    resolverType: ApprovalResolverType,
    specificUserId?: number
  ): Promise<ApprovalLineStepApprover> => {
    const res = await api.post<ApprovalLineStepApprover>(`/admin/approval-lines/steps/${stepId}/approvers`, {
      resolverType,
      specificUserId,
    });
    return res.data;
  },

  removeStepApprover: async (approverId: number): Promise<void> => {
    await api.delete(`/admin/approval-lines/approvers/${approverId}`);
  },

  previewForRequester: async (targetType: ApprovalTargetType, requesterUserId: number): Promise<ApprovalLinePreview> => {
    const res = await api.get<ApprovalLinePreview>('/admin/approval-lines/preview', {
      params: { targetType, requesterUserId },
    });
    return res.data;
  },

  /** 현재 로그인한 사용자 기준 미리보기 - 신청 전 확인용 (수정 요청 모달 등). apiPath는 각 모듈 API 경로(예: 'evangelism', 'membership'). */
  previewForCurrentUser: async (apiPath: string): Promise<ApprovalLinePreview> => {
    const res = await api.get<ApprovalLinePreview>(`/${apiPath}/edit-requests/approval-preview`);
    return res.data;
  },
};
