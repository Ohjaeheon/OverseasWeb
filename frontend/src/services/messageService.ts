import api from './api';

function getCurrentUsername(): string {
  const userStr = localStorage.getItem('user');
  if (!userStr) return 'admin';
  try {
    const u = JSON.parse(userStr);
    return u.username || u.name || 'admin';
  } catch {
    return 'admin';
  }
}

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

  /** 지정한 key/langCode 항목이 있으면 값만 갱신하고, 없으면 새로 만든다. */
  upsertMessage: async (
    messageKey: string,
    langCode: string,
    messageValue: string,
    category?: string
  ): Promise<MessageItem> => {
    const existing = await messageService.search({ messageKey, langCode, size: 1 });
    const match = existing.content.find((m) => m.messageKey === messageKey && m.langCode === langCode);
    const updatedBy = getCurrentUsername();
    if (match) {
      return messageService.update(match.dictId, {
        messageValue,
        category: category ?? match.category,
        useYn: 'Y',
        updatedBy
      });
    }
    return messageService.create({
      messageKey,
      langCode,
      messageValue,
      category,
      useYn: 'Y',
      updatedBy
    });
  },
};
