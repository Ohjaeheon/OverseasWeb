import React from 'react';
import { useDiagnosisData } from '../../../contexts/DiagnosisDataContext';

const GUBUNS = ['전체', '교회', '지역', '개척지'];

/** 구분(전체/교회/지역/개척지) 선택 칩. Ported 1:1 from buildUI()의 #chips 렌더링. */
export const GubunChips: React.FC = () => {
  const { gubun, setGubun } = useDiagnosisData();
  return (
    <div className="chips">
      {GUBUNS.map((g) => (
        <div key={g} className={`chip ${gubun === g ? 'on' : ''}`} onClick={() => setGubun(g)}>
          {g === '전체' ? '🌐 전체' : g}
        </div>
      ))}
    </div>
  );
};
