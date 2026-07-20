import api from './api';

export interface DiagnosisRecord {
  recordId: number;
  churchId: number;
  name: string;
  continent: string;
  country: string;
  jipa: string;
  gubun: string;
  lat: number | null;
  lon: number | null;
  month: string;

  evangReg: number;
  bibleMonthReg: number;
  bibleCumReg: number;
  bibleCurAtt: number;

  centerMonthOn: number;
  centerMonthOff: number;
  centerMonthTotal: number;
  centerCumOn: number;
  centerCumOff: number;
  centerCumReg: number;
  centerMonthGrad: number;
  centerTotMonthReg: number;
  centerCumGrad: number;
  centerAttElem: number;
  centerAttMid: number;
  centerAttHigh: number;

  registered: number;
  yearStartReg: number;
  regChange: number;
  newAdmit: number;
  cumNewAdmit: number;
  discipline: number;
  cumDiscipline: number;
  moveIn: number;
  moveOut: number;
  transIn: number;
  transOut: number;
  dupReg: number;
  prevNewAdmitCnt: number;

  attReg: number;
  attOnsite: number;
  attOnline: number;
  attEtc: number;
  attTotal: number;
  absOnce: number;
  absLongManage: number;
  absLongUnmanage: number;
  absTotal: number;
}

export interface SummaryMetric {
  totalChurches: number;
  totalRegistered: number;
  totalEvangReg: number;
  totalCenterMonthReg: number;
  totalAttTotal: number;
  totalAbsTotal: number;
}

export const diagnosisService = {
  getMonths: async (): Promise<string[]> => {
    const res = await api.get<string[]>('/diagnosis/months');
    return res.data;
  },

  getRecords: async (month: string): Promise<DiagnosisRecord[]> => {
    const res = await api.get<DiagnosisRecord[]>(`/diagnosis/records?month=${month}`);
    return res.data;
  },

  getSummaryMetric: async (month: string): Promise<SummaryMetric> => {
    const res = await api.get<SummaryMetric>(`/diagnosis/summary?month=${month}`);
    return res.data;
  },

  getChurches: async (): Promise<any[]> => {
    const res = await api.get<any[]>('/diagnosis/churches');
    return res.data;
  }
};
