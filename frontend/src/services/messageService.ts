import api from './api';

export interface MessageItem {
  dictId: number;
  messageKey: string;
  langCode: string;
  messageValue: string;
  category?: string;
  useYn: 'Y' | 'N';
  updatedBy?: string;
  updatedAt?: string;
}

export interface MessageSearchParams {
  messageKey?: string;
  langCode?: string;
  messageValue?: string;
  useYn?: string;
  page?: number;
  size?: number;
}

export interface MessagePageResult {
  content: MessageItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export const messageService = {
  search: async (params: MessageSearchParams): Promise<MessagePageResult> => {
    const res = await api.get<MessagePageResult>('/admin/messages', { params });
    return res.data;
  },

  create: async (data: {
    messageKey: string;
    langCode: string;
    messageValue: string;
    category?: string;
    useYn: string;
    updatedBy: string;
  }): Promise<MessageItem> => {
    const res = await api.post<MessageItem>('/admin/messages', data);
    return res.data;
  },

  update: async (
    dictId: number,
    data: { messageValue: string; category?: string; useYn: string; updatedBy: string }
  ): Promise<MessageItem> => {
    const res = await api.put<MessageItem>(`/admin/messages/${dictId}`, data);
    return res.data;
  },

  remove: async (dictId: number): Promise<void> => {
    await api.delete(`/admin/messages/${dictId}`);
  },
};
