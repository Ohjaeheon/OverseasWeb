import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

interface MessageDictionaryContextValue {
  /** 사전에 값이 있으면 그 값을, 없으면 "__" + fallback을 반환한다 (미등록 상태 표시). */
  getMsg: (key: string, fallback: string) => string;
}

const MessageDictionaryContext = createContext<MessageDictionaryContextValue | null>(null);

function normalizeLang(lang: string | undefined): string {
  return lang && lang.toLowerCase().startsWith('en') ? 'en' : 'ko';
}

export const MessageDictionaryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const [dict, setDict] = useState<Record<string, string>>({});

  const load = useCallback((lang: string) => {
    api.get<Record<string, string>>(`/i18n/${normalizeLang(lang)}`)
      .then((res) => setDict(res.data || {}))
      .catch((e) => { console.warn('메시지 사전 조회 실패', e); setDict({}); });
  }, []);

  useEffect(() => {
    load(i18n.language);
    const onChanged = (lng: string) => load(lng);
    i18n.on('languageChanged', onChanged);
    return () => { i18n.off('languageChanged', onChanged); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getMsg = useCallback((key: string, fallback: string): string => {
    const value = dict[key];
    return value && value.trim().length > 0 ? value : `__${fallback}`;
  }, [dict]);

  return (
    <MessageDictionaryContext.Provider value={{ getMsg }}>
      {children}
    </MessageDictionaryContext.Provider>
  );
};

export function useMessageDictionary(): MessageDictionaryContextValue {
  const ctx = useContext(MessageDictionaryContext);
  if (!ctx) throw new Error('useMessageDictionary는 MessageDictionaryProvider 내부에서만 사용할 수 있습니다.');
  return ctx;
}
