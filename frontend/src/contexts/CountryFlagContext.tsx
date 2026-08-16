import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { countryFlagService } from '../services/countryFlagService';
import { flagFor as defaultFlagFor } from '../utils/countryFlags';

interface CountryFlagContextValue {
  /** 관리자가 등록한 이미지가 있으면 그것을, 없으면 내장 기본 국기를 반환. 둘 다 없으면 null. */
  getFlag: (country: string | null | undefined) => string | null;
  /** 관리자가 이 국가에 커스텀 이미지를 등록했는지(내장 기본 국기가 아니라) 여부. */
  hasCustom: (country: string | null | undefined) => boolean;
  refetch: () => void;
}

const CountryFlagContext = createContext<CountryFlagContextValue | null>(null);

export const CountryFlagProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customFlags, setCustomFlags] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    countryFlagService.getAll()
      .then(setCustomFlags)
      .catch((e) => { console.warn('국기 이미지 조회 실패, 기본 국기로 표시합니다.', e); setCustomFlags({}); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const getFlag = useCallback((country: string | null | undefined): string | null => {
    if (!country) return null;
    return customFlags[country] || defaultFlagFor(country);
  }, [customFlags]);

  const hasCustom = useCallback((country: string | null | undefined): boolean => {
    return !!country && !!customFlags[country];
  }, [customFlags]);

  return (
    <CountryFlagContext.Provider value={{ getFlag, hasCustom, refetch: load }}>
      {children}
    </CountryFlagContext.Provider>
  );
};

export function useCountryFlags(): CountryFlagContextValue {
  const ctx = useContext(CountryFlagContext);
  if (!ctx) throw new Error('useCountryFlags는 CountryFlagProvider 내부에서만 사용할 수 있습니다.');
  return ctx;
}
