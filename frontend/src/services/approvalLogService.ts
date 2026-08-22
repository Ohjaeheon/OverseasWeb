import api from './api';
import { ApprovalTargetType } from './approvalLineService';

export interface ApprovalLogEntry {
  targetType: ApprovalTargetType;
  requestId: number;
  churchName: string;
  yearStr: string;
  weekKey?: string;
  monthKey?: string;
  reason: string;
  requestedBy: string;
  requestedTo: string;
  status: string;
  requestedAt: string;
  approvedAt?: string;
  approverComment?: string;
}

export const approvalLogService = {
  getAll: async (): Promise<ApprovalLogEntry[]> => {
    const res = await api.get<ApprovalLogEntry[]>('/admin/approval-logs');
    return res.data;
  },
};
