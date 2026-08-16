// 진단서 지표 정의 및 집계/점수 계산. Ported 1:1 from diagnosisEngine.js
// (CATS/SUM_FIELDS/aggregate/recordsFor/buildRows/churchQuality/churchQuantity/weakPoints/
//  buildChurchScores/computeFunnel/classifyFunnel/qualityPrior/contOf).
import { DiagnosisRecord } from '../services/diagnosisService';
import { CENTERWK } from '../data/centerWeeklyData';
import { CONT_KO, CONT_COLORS } from './diagnosisI18n';

export function fmt(n: number | null | undefined): string {
  return (n == null || isNaN(n)) ? '-' : Math.round(n).toLocaleString('ko-KR');
}
export function pct(n: number | null | undefined): string {
  return (n == null || isNaN(n)) ? '-' : (n * 100).toFixed(1) + '%';
}
export function rate(num: number | null | undefined, den: number | null | undefined): number | null {
  return (den != null && den > 0) ? (num || 0) / den : null;
}

// month는 "YYYY년 M월" 형식이라 parseInt(month)는 연도(예: 2026)를 반환해버린다 — 반드시 이 헬퍼로 월/연도를 뽑아야 함.
export function getMonthNumFromStr(mStr: string | null | undefined): number {
  if (!mStr) return 0;
  const match = String(mStr).match(/(\d+)월/);
  return match ? parseInt(match[1], 10) : parseInt(String(mStr), 10) || 0;
}
export function getYearNumFromStr(mStr: string | null | undefined): number {
  if (!mStr) return 2026;
  const match = String(mStr).match(/(\d+)년/);
  return match ? parseInt(match[1], 10) : 2026;
}

// CATS 지표 접근자는 원자료(DiagnosisRecord)가 아니라 aggregate()의 결과(AggregateResult)를 대상으로 한다
// (단일 레코드 그룹도 항상 aggregate([r])을 거쳐서 넘어옴 — CENTERWK 파생 필드(catE/catM/catH)까지 포함하기 위함).
export interface MetricDef {
  id: string;
  k: string | ((a: AggregateResult) => number | null);
  l: string;
  t: 'int' | 'pct';
  primary?: boolean;
  signed?: boolean;
  /** 인접한 컬럼끼리 표 헤더에서 하나로 묶어 보여줄 그룹명 (예: "재적"). 없으면 단독 컬럼으로 표시. */
  group?: string;
}

// 서브탭 = 신앙프로세스/총회 점검 5영역 흐름 순(전도→센터→내무→예배). 종합은 요약(맨 앞).
// 각 항목의 id는 관리자 설정(메뉴 관리)에서 system 컬럼을 참조/재정의할 때 쓰는 안정적인 키다.
export const CATS: Record<string, MetricDef[]> = {
  "종합": [
    { id: "registered", k: "registered", l: "현재적", t: "int", primary: true },
    { id: "newAdmit", k: "newAdmit", l: "입교(월)", t: "int" },
    { id: "rate_attTotal_attReg", k: r => rate(r.attTotal, r.attReg), l: "전성도 출석율", t: "pct" },
    { id: "rate_newAttTotal_prevNewAdmitCnt", k: r => rate(r.newAttTotal, r.prevNewAdmitCnt), l: "전월입교자 출석율", t: "pct" },
    { id: "rate_centerMonthTotal_evangReg", k: r => rate(r.centerMonthTotal, r.evangReg), l: "센터 월등록율", t: "pct" },
    { id: "rate_centerMonthGrad_centerTotMonthReg", k: r => rate(r.centerMonthGrad, r.centerTotMonthReg), l: "월 종강율", t: "pct" },
    { id: "rate_cumNewAdmit_retroReg", k: r => rate(r.cumNewAdmit, r.retroReg), l: "입교율(누적)", t: "pct" },
    { id: "evangReg", k: "evangReg", l: "전도재적", t: "int" },
    { id: "centerCumReg", k: "centerCumReg", l: "센터 누적등록", t: "int" },
  ],
  "①전도": [
    { id: "evangRegFrozen", k: "evangRegFrozen", l: "전도재적", t: "int", primary: true },
    { id: "findMonth", k: "findMonth", l: "찾기", t: "int" },
    { id: "findCum", k: "findCum", l: "누적찾기", t: "int" },
    { id: "gospelMonth", k: "gospelMonth", l: "복음방", t: "int" },
    { id: "rate_gospelMonth_evangRegFrozen", k: r => rate(r.gospelMonth, r.evangRegFrozen), l: "복음방율", t: "pct" },
    { id: "gospelCum", k: "gospelCum", l: "누적복음방", t: "int" },
    { id: "rate_gospelCum_evangRegFrozen", k: r => rate(r.gospelCum, r.evangRegFrozen), l: "누적복음방율", t: "pct" },
    { id: "bibleMonthReg", k: "bibleMonthReg", l: "등록", t: "int" },
    { id: "rate_bibleMonthReg_evangRegFrozen", k: r => rate(r.bibleMonthReg, r.evangRegFrozen), l: "등록율", t: "pct" },
    { id: "bibleCumReg", k: "bibleCumReg", l: "누적등록", t: "int" },
    { id: "rate_bibleCumReg_evangRegFrozen", k: r => rate(r.bibleCumReg, r.evangRegFrozen), l: "누적등록율", t: "pct" },
  ],
  "②센터": [
    { id: "evangReg", k: "evangReg", l: "전도재적", t: "int" },
    { id: "centerMonthOn", k: "centerMonthOn", l: "월등록(대면)", t: "int" },
    { id: "centerMonthOff", k: "centerMonthOff", l: "월등록(비대면)", t: "int" },
    { id: "centerMonthTotal", k: "centerMonthTotal", l: "월등록수", t: "int", primary: true },
    { id: "rate_centerMonthTotal_evangReg", k: r => rate(r.centerMonthTotal, r.evangReg), l: "월등록율", t: "pct" },
    { id: "centerCumOn", k: "centerCumOn", l: "누적등록(대면)", t: "int" },
    { id: "rate_centerCumOn_evangReg", k: r => rate(r.centerCumOn, r.evangReg), l: "누적등록율(대면)", t: "pct" },
    { id: "centerCumOff", k: "centerCumOff", l: "누적등록(비대면)", t: "int" },
    { id: "rate_centerCumOff_evangReg", k: r => rate(r.centerCumOff, r.evangReg), l: "누적등록(비대면율)", t: "pct" },
    { id: "centerCumReg", k: "centerCumReg", l: "누적등록수", t: "int" },
    { id: "rate_centerCumReg_evangReg", k: r => rate(r.centerCumReg, r.evangReg), l: "누적등록율", t: "pct" },
    { id: "centerMonthGrad", k: "centerMonthGrad", l: "월종강수", t: "int" },
    { id: "rate_centerMonthGrad_centerTotMonthReg", k: r => rate(r.centerMonthGrad, r.centerTotMonthReg), l: "월종강율", t: "pct" },
    { id: "centerCumGrad", k: "centerCumGrad", l: "누적종강수", t: "int" },
    { id: "rate_centerCumGrad_centerTotCumReg", k: r => rate(r.centerCumGrad, r.centerTotCumReg), l: "누적종강율", t: "pct" },
    { id: "catE", k: a => a.catE, l: "초등출석수", t: "int" },
    { id: "catM", k: a => a.catM, l: "중등출석수", t: "int" },
    { id: "catH", k: a => a.catH, l: "고등출석수", t: "int" },
    { id: "rate_catE_ctwkE", k: a => rate(a.catE, a.ctwkE), l: "초등출석율", t: "pct" },
    { id: "rate_catM_ctwkM", k: a => rate(a.catM, a.ctwkM), l: "중등출석율", t: "pct" },
    { id: "rate_catH_ctwkH", k: a => rate(a.catH, a.ctwkH), l: "고등출석율", t: "pct" },
    { id: "rate_cat_total_ctwk_total", k: a => rate(a.catE + a.catM + a.catH, a.ctwkE + a.ctwkM + a.ctwkH), l: "전체출석율", t: "pct" },
  ],
  "③내무": [
    { id: "registered", k: "registered", l: "현재적", t: "int", primary: true },
    { id: "regChange", k: "regChange", l: "재적증가수", t: "int", signed: true },
    { id: "rate_regChange_retroReg", k: r => rate(r.regChange, r.retroReg), l: "재적증가율", t: "pct" },
    { id: "newAdmit", k: "newAdmit", l: "당월입교", t: "int" },
    { id: "rate_newAdmit_retroReg", k: r => rate(r.newAdmit, r.retroReg), l: "당월입교율", t: "pct" },
    { id: "cumNewAdmit", k: "cumNewAdmit", l: "누적입교수", t: "int" },
    { id: "rate_cumNewAdmit_retroReg", k: r => rate(r.cumNewAdmit, r.retroReg), l: "누적입교율", t: "pct" },
    { id: "discipline", k: "discipline", l: "사고", t: "int" },
    { id: "cumDiscipline", k: "cumDiscipline", l: "누적사고수", t: "int" },
  ],
  "④예배·전월입교자": [
    { id: "prevNewAdmitCnt", k: "prevNewAdmitCnt", l: "전월입교자수", t: "int", primary: true },
    { id: "newAttOnsite", k: "newAttOnsite", l: "대면(정식)", t: "int" },
    { id: "newAttOnline", k: "newAttOnline", l: "온라인(정식)", t: "int" },
    { id: "newAttEtc", k: "newAttEtc", l: "기타(정식외)", t: "int" },
    { id: "newAttTotal", k: "newAttTotal", l: "출석수", t: "int" },
    { id: "rate_newAttTotal_prevNewAdmitCnt", k: r => rate(r.newAttTotal, r.prevNewAdmitCnt), l: "출석율", t: "pct" },
  ],
  "④예배·전성도": [
    { id: "attReg", k: "attReg", l: "출결재적", t: "int", primary: true },
    { id: "attOnsite", k: "attOnsite", l: "대면(정식)", t: "int" },
    { id: "rate_attOnsite_attReg", k: r => rate(r.attOnsite, r.attReg), l: "대면율", t: "pct" },
    { id: "attOnline", k: "attOnline", l: "온라인(정식)", t: "int" },
    { id: "rate_attOnline_attReg", k: r => rate(r.attOnline, r.attReg), l: "온라인율", t: "pct" },
    { id: "attEtc", k: "attEtc", l: "기타(정식외)", t: "int" },
    { id: "rate_attEtc_attReg", k: r => rate(r.attEtc, r.attReg), l: "기타율", t: "pct" },
    { id: "attTotal", k: "attTotal", l: "출석수", t: "int" },
    { id: "rate_attTotal_attReg", k: r => rate(r.attTotal, r.attReg), l: "출석율", t: "pct" },
  ],
  "④예배·결석": [
    { id: "absOnce", k: "absOnce", l: "일회성결석", t: "int" },
    { id: "absLongManage", k: "absLongManage", l: "장기결석(관리가능)", t: "int" },
    { id: "absLongUnmanage", k: "absLongUnmanage", l: "장기결석(관리불가능)", t: "int" },
    { id: "absTotal", k: "absTotal", l: "결석수", t: "int", primary: true },
    { id: "rate_absTotal_attReg", k: r => rate(r.absTotal, r.attReg), l: "결석율", t: "pct" },
  ],
  "해외선교부 현황판": [
    { id: "prevYearEndReg", k: "prevYearEndReg", l: "전년말재적", t: "int", group: "재적" },
    { id: "currentReg", k: "currentReg", l: "현재적", t: "int", primary: true, group: "재적" },
    { id: "preOpen", k: "preOpen", l: "가개강", t: "int" },
    { id: "registrationCount", k: "registrationCount", l: "등록", t: "int" },
    { id: "registrationRate", k: a => (a.registrationRate == null ? null : a.registrationRate / 100), l: "가개강대비등록률", t: "pct" },
    { id: "graduationCount", k: "graduationCount", l: "종강수", t: "int" },
    { id: "graduationRate", k: a => (a.graduationRate == null ? null : a.graduationRate / 100), l: "등록대비종강률", t: "pct" },
    { id: "studentPreOpen", k: "studentPreOpen", l: "가개강", t: "int", group: "수강생현황" },
    { id: "studentElementary", k: "studentElementary", l: "초등", t: "int", group: "수강생현황" },
    { id: "studentMiddle", k: "studentMiddle", l: "중등", t: "int", group: "수강생현황" },
    { id: "studentHigh", k: "studentHigh", l: "고등", t: "int", group: "수강생현황" },
  ],
};
export const CAT_NAMES = Object.keys(CATS);

export function metricVal(row: AggregateResult, m: MetricDef): number | null {
  return (typeof m.k === 'function') ? m.k(row) : ((row as any)[m.k] ?? null);
}
export function fmtVal(v: number | null, m: MetricDef): string {
  if (v == null || isNaN(v)) return '-';
  return m.t === 'pct' ? pct(v) : ((m.signed && v > 0 ? '+' : '') + fmt(v));
}

// 일부 필드(retroReg/prevReg/newAttOnsite/newAttOnline/newAttEtc/newAttTotal/centerTotCumReg)는
// 백엔드 /diagnosis/records 응답에 아직 없다(레거시 앱에서도 항상 undefined였던 기존 결함 — 그대로 이식,
// 임의로 대체 필드를 추정해 넣지 않는다). 그래서 keyof DiagnosisRecord가 아닌 string[]로 느슨하게 둔다.
// 관리자 컬럼/수식 설정 화면에서 "원본 필드" 선택지로도 노출되므로 export.
export const SUM_FIELDS: string[] = [
  "yearStartReg", "retroReg", "prevReg", "newAdmit", "transIn", "transOut", "moveIn", "moveOut",
  "discipline", "dupReg", "registered", "regChange", "cumNewAdmit", "cumDiscipline", "prevNewAdmitCnt",
  "newAttOnsite", "newAttOnline", "newAttEtc", "newAttTotal", "attReg", "attOnsite", "attOnline", "attEtc",
  "attTotal", "absTotal", "evangReg", "bibleMonthReg", "bibleCumReg", "bibleCurAtt",
  "findMonth", "findCum", "gospelMonth", "gospelCum", "evangRegFrozen", "centerMonthOn",
  "centerMonthOff", "centerMonthTotal", "centerTotMonthReg", "centerCumOn", "centerCumOff", "centerCumReg",
  "centerTotCumReg", "centerMonthGrad", "centerCumGrad", "centerAttElem",
  "centerAttMid", "centerAttHigh", "absOnce", "absLongManage", "absLongUnmanage",
];

// 관리자 컬럼/수식 설정에서 "원본 필드(변수)"로 고를 수 있는 전체 목록.
// SUM_FIELDS(교회 원자료 합산값) + CENTERWK에서 파생되는 초/중/고 출석 관련 필드.
export const RAW_FIELD_KEYS: string[] = [
  ...SUM_FIELDS, 'catE', 'catM', 'catH', 'ctwkE', 'ctwkM', 'ctwkH',
  'prevYearEndReg', 'currentReg', 'preOpen', 'registrationCount', 'registrationRate', 'graduationCount', 'graduationRate',
  'studentPreOpen', 'studentElementary', 'studentMiddle', 'studentHigh',
];

// 원본 필드 키 -> 한글 라벨. 관리자 화면(메뉴 관리)에서 영문 키만 보고는 뭔지 알기 어려워
// 드롭다운/수식 힌트에 같이 보여주기 위한 것으로, 계산 로직에는 영향을 주지 않는다.
export const RAW_FIELD_LABELS: Record<string, string> = {
  yearStartReg: '연초재적', retroReg: '소급재적(비율 기준)', prevReg: '전월재적',
  newAdmit: '당월입교', transIn: '전입', transOut: '전출', moveIn: '이동(입)', moveOut: '이동(출)',
  discipline: '사고(당월)', dupReg: '중복재적', registered: '현재적', regChange: '재적증가수',
  cumNewAdmit: '누적입교수', cumDiscipline: '누적사고수', prevNewAdmitCnt: '전월입교자수',
  newAttOnsite: '전월입교자 대면출석', newAttOnline: '전월입교자 온라인출석', newAttEtc: '전월입교자 기타출석',
  newAttTotal: '전월입교자 총출석', attReg: '출결재적', attOnsite: '대면출석(정식)', attOnline: '온라인출석(정식)',
  attEtc: '기타출석(정식외)', attTotal: '전성도 총출석', absTotal: '결석수', evangReg: '전도재적',
  bibleMonthReg: '가개강 당월등록', bibleCumReg: '가개강 누적등록', bibleCurAtt: '복음방 현재출석수',
  findMonth: '당월 찾기', findCum: '누적 찾기', gospelMonth: '당월 복음방', gospelCum: '누적 복음방',
  evangRegFrozen: '전도재적(고정값)', centerMonthOn: '센터 월등록(대면)', centerMonthOff: '센터 월등록(비대면)',
  centerMonthTotal: '센터 월등록수', centerTotMonthReg: '센터 월등록 대상수', centerCumOn: '센터 누적등록(대면)',
  centerCumOff: '센터 누적등록(비대면)', centerCumReg: '센터 누적등록수', centerTotCumReg: '센터 누적등록 대상수',
  centerMonthGrad: '센터 월종강수', centerCumGrad: '센터 누적종강수',
  centerAttElem: '센터출석(초등, 레코드)', centerAttMid: '센터출석(중등, 레코드)', centerAttHigh: '센터출석(고등, 레코드)',
  absOnce: '일회성결석', absLongManage: '장기결석(관리가능)', absLongUnmanage: '장기결석(관리불가능)',
  catE: '초등출석수(주간보고)', catM: '중등출석수(주간보고)', catH: '고등출석수(주간보고)',
  ctwkE: '초등 등록대상(주간보고)', ctwkM: '중등 등록대상(주간보고)', ctwkH: '고등 등록대상(주간보고)',
  prevYearEndReg: '전년말재적', currentReg: '현재적(현황판)', preOpen: '가개강',
  registrationCount: '등록', registrationRate: '가개강대비등록률(비율)', graduationCount: '종강수', graduationRate: '등록대비종강률(비율)',
  studentPreOpen: '수강생현황 가개강', studentElementary: '수강생현황 초등', studentMiddle: '수강생현황 중등', studentHigh: '수강생현황 고등',
};

// 백엔드 응답에 아직 연결되지 않아 항상 0/undefined인 필드(위 SUM_FIELDS 주석 참고) —
// 관리자가 이 필드를 고르면 값이 항상 비어 보일 수 있어 화면에 경고로 표시한다.
export const RAW_FIELD_UNRELIABLE: Set<string> = new Set([
  'retroReg', 'prevReg', 'newAttOnsite', 'newAttOnline', 'newAttEtc', 'newAttTotal', 'centerTotCumReg',
]);

export interface AggregateResult {
  count: number;
  [field: string]: number;
}

/** 레코드 묶음의 수치 필드 합산 + 센터 초/중/고 주간보고서 스냅샷(CENTERWK) 병합. */
export function aggregate(recs: DiagnosisRecord[]): AggregateResult {
  const o: AggregateResult = { count: recs.length };
  SUM_FIELDS.forEach((f) => { o[f as string] = 0; });
  o.ctwkE = 0; o.ctwkM = 0; o.ctwkH = 0; o.catE = 0; o.catM = 0; o.catH = 0;
  recs.forEach((r) => {
    SUM_FIELDS.forEach((f) => { o[f as string] += (+(r as any)[f] || 0); });
    const c = CENTERWK[r.name];
    if (c) {
      o.ctwkE += c[0]; o.ctwkM += c[1]; o.ctwkH += c[2];
      o.catE += (+c[3] || 0); o.catM += (+c[4] || 0); o.catH += (+c[5] || 0);
    }
  });
  return o;
}

export function recordsFor(records: DiagnosisRecord[], month: string, gubunFilter: string): DiagnosisRecord[] {
  return records.filter((r) => r.month === month && (gubunFilter === '전체' || r.gubun === gubunFilter));
}

/** 국가명 → 대륙 폴백 맵 (레코드에 continent가 없을 때만 사용). */
export function buildCountryContMap(records: DiagnosisRecord[]): Record<string, string> {
  const m: Record<string, string> = {};
  records.forEach((r) => {
    const c = CONT_KO[r.continent] || r.continent;
    if (c && r.country && !(r.country in m)) m[r.country] = c;
  });
  return m;
}

/** 레코드의 대륙(6대륙 표시 기준, 중앙아메리카는 북아메리카로 병합). */
export function contOf(r: DiagnosisRecord, countryContMap: Record<string, string>): string {
  let c = CONT_KO[r.continent] || r.continent;
  if (!c) c = countryContMap[r.country] || '기타';
  return c === '중앙아메리카' ? '북아메리카' : c;
}

export interface RowGroup {
  name: string;
  color: string;
  jipa?: string;
  continent?: string;
  agg: AggregateResult;
  kind: 'continent' | 'jipa' | 'entity';
  rec?: DiagnosisRecord;
}

/** 현재 화면(그룹핑 방식)에 맞는 표/막대 그래프용 행 목록. */
export function buildRows(
  records: DiagnosisRecord[], month: string, gubun: string, group: '개별' | '지파별' | '대륙별',
  jipaOrder: string[], jipaColors: Record<string, string>, countryContMap: Record<string, string>
): RowGroup[] {
  const recs = recordsFor(records, month, gubun);
  let groups: RowGroup[] = [];
  if (group === '대륙별') {
    const map: Record<string, DiagnosisRecord[]> = {};
    recs.forEach((r) => { const k = contOf(r, countryContMap); (map[k] = map[k] || []).push(r); });
    groups = Object.entries(map).map(([k, v]) => ({ name: k, color: CONT_COLORS[k] || '#888', agg: aggregate(v), kind: 'continent' as const }));
  } else if (group === '지파별') {
    jipaOrder.forEach((j) => {
      const v = recs.filter((r) => r.jipa === j);
      groups.push({ name: j, color: jipaColors[j] || '#888', agg: aggregate(v), kind: 'jipa' });
    });
  } else {
    recs.forEach((r) => {
      if (r.gubun === '폐쇄') return; // 폐쇄지역(소급 잔여만 반영)은 개별 목록·차트에서 숨김 — 총계엔 포함
      groups.push({
        name: r.name, color: jipaColors[r.jipa] || '#888', jipa: r.jipa,
        continent: CONT_KO[r.continent] || r.continent, agg: aggregate([r]), kind: 'entity', rec: r,
      });
    });
  }
  return groups.filter((g) => g.agg.count > 0);
}

// ── 점검(양·질) 점수 산출. 리더 확정(2026-07-04/05) 가중치·소수표본 보정 그대로 이식 ──
function capR(v: number | null): number | null { return (v == null || isNaN(v)) ? null : Math.min(1, Math.max(0, v)); }
function wAvgAvail(parts: { v: number | null; w: number }[]): number | null {
  let sw = 0, acc = 0;
  parts.forEach((p) => { if (p.v != null && !isNaN(p.v)) { acc += p.v * p.w; sw += p.w; } });
  return sw > 0 ? acc / sw : null;
}
const QUAL_SHRINK_K = 5;      // 소수보정 강도(가상표본 K명 만큼 전체평균을 섞음)
export const QUAL_MIN_SAMPLE = 5; // 전월입교자 이 값 미만이면 '표본 적음'(우수 판정 보류)

export interface QualityPrior { qNew: number | null; qGrad: number | null; qCAtt: number | null; qAtt: number | null; }

/** 전체(당월) 가중평균 prior — 소수표본 보정(shrinkage) 기준값. */
export function qualityPrior(aggs: AggregateResult[]): QualityPrior {
  let a1 = 0, b1 = 0, a2 = 0, b2 = 0, a3 = 0, b3 = 0, a4 = 0, b4 = 0;
  aggs.forEach((a) => {
    if (a.prevNewAdmitCnt > 0) { a1 += (+a.newAttTotal || 0); b1 += a.prevNewAdmitCnt; }
    if (a.centerMonthGrad > 0 && a.centerTotMonthReg > 0) { a2 += a.centerMonthGrad; b2 += a.centerTotMonthReg; }
    const cr = (a.ctwkE || 0) + (a.ctwkM || 0) + (a.ctwkH || 0);
    if (cr > 0) { a3 += (a.catE || 0) + (a.catM || 0); b3 += cr; }
    if (a.attReg > 0) { a4 += (+a.attTotal || 0); b4 += a.attReg; }
  });
  return { qNew: b1 > 0 ? a1 / b1 : null, qGrad: b2 > 0 ? a2 / b2 : null, qCAtt: b3 > 0 ? a3 / b3 : null, qAtt: b4 > 0 ? a4 / b4 : null };
}

export interface ChurchQuality {
  score: number | null; qNew: number | null; qGrad: number | null; qCAtt: number | null; qAtt: number | null;
  qUnabs: number | null; lowSample: boolean; sampleN: number;
}

/** 질(質) 점수: 전월입교자 예배출석·종강율·초중고 센터출석율·전성도 출석률 가중평균 - 관리불가결석율. */
export function churchQuality(a: AggregateResult, prior?: QualityPrior): ChurchQuality {
  const p = prior || {} as QualityPrior;
  const qNew = (a.prevNewAdmitCnt > 0) ? capR(rate(a.newAttTotal, a.prevNewAdmitCnt)) : null;
  const qGrad = (a.centerMonthGrad > 0 && a.centerTotMonthReg > 0) ? capR(rate(a.centerMonthGrad, a.centerTotMonthReg)) : null;
  const cReg = (a.ctwkE || 0) + (a.ctwkM || 0) + (a.ctwkH || 0);
  const qCAtt = cReg > 0 ? capR(rate((a.catE || 0) + (a.catM || 0) + (a.catH || 0), cReg)) : null;
  const qAtt = (a.attReg > 0) ? capR(rate(a.attTotal, a.attReg)) : null;
  const unAbs = (a.absTotal > 0 && a.attReg > 0) ? rate(a.absLongUnmanage, a.attReg) : null;
  const shr = (num: number, den: number, pr: number | null | undefined) =>
    (den > 0) ? capR((num + QUAL_SHRINK_K * (pr == null ? (rate(num, den) || 0) : pr)) / (den + QUAL_SHRINK_K)) : null;
  const sNew = (a.prevNewAdmitCnt > 0) ? shr(a.newAttTotal, a.prevNewAdmitCnt, p.qNew) : null;
  const sGrad = (a.centerMonthGrad > 0 && a.centerTotMonthReg > 0) ? shr(a.centerMonthGrad, a.centerTotMonthReg, p.qGrad) : null;
  const sCAtt = cReg > 0 ? shr((a.catE || 0) + (a.catM || 0) + (a.catH || 0), cReg, p.qCAtt) : null;
  const sAtt = (a.attReg > 0) ? shr(a.attTotal, a.attReg, p.qAtt) : null;
  const base = wAvgAvail([{ v: sNew, w: .40 }, { v: sGrad, w: .25 }, { v: sCAtt, w: .20 }, { v: sAtt, w: .15 }]);
  const s = (base == null) ? null : Math.max(0, base - (unAbs || 0));
  const lowSample = (a.prevNewAdmitCnt > 0 && a.prevNewAdmitCnt < QUAL_MIN_SAMPLE);
  return { score: s == null ? null : Math.round(s * 100), qNew, qGrad, qCAtt, qAtt, qUnabs: unAbs, lowSample, sampleN: a.prevNewAdmitCnt || 0 };
}

export interface ChurchQuantity { score: number | null; aCen: number | null; aBib: number | null; aAdm: number | null; }

/** 양(量) 점수: 센터등록율·가개강 누적등록율·입교율(누적) 가중평균. */
export function churchQuantity(a: AggregateResult): ChurchQuantity {
  const aCen = capR(rate(a.centerMonthTotal, a.evangReg));
  const aBib = capR(rate(a.bibleCumReg, a.registered));
  const aAdm = capR(rate(a.cumNewAdmit, a.retroReg));
  const s = wAvgAvail([{ v: aCen, w: .50 }, { v: aBib, w: .25 }, { v: aAdm, w: .25 }]);
  return { score: s == null ? null : Math.round(s * 100), aCen, aBib, aAdm };
}

export function median(arr: number[]): number | null {
  if (!arr.length) return null;
  const s = arr.slice().sort((a, b) => a - b), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export interface WeakPoint { label: string; owner: string; v: number; disp: number | null; }

/** 질 점수 하위요인 취약점 목록(낮은 순 정렬). */
export function weakPoints(q: ChurchQuality): WeakPoint[] {
  return ([
    { label: '전월 입교자 예배출석률', owner: '센터 창조력', v: q.qNew, disp: q.qNew },
    { label: '종강율', owner: '센터 사명자', v: q.qGrad, disp: q.qGrad },
    { label: '초·중·고 센터 출석율', owner: '센터 사명자', v: q.qCAtt, disp: q.qCAtt },
    { label: '전성도 예배출석률', owner: '담임강사', v: q.qAtt, disp: q.qAtt },
    { label: '관리불가 결석율', owner: '담임강사', v: (q.qUnabs == null ? null : 1 - q.qUnabs), disp: q.qUnabs },
  ] as WeakPoint[]).filter((x) => x.v != null).sort((a, b) => a.v - b.v);
}

export interface ChurchScore {
  name: string; jipa: string; country: string; color: string; rec: DiagnosisRecord;
  agg: AggregateResult; q: ChurchQuality; n: ChurchQuantity;
}

/** 점검(양·질) 화면용 — 당월 "지역" 구분 전체 교회 점수 목록. */
export function buildChurchScores(records: DiagnosisRecord[], month: string, jipaColors: Record<string, string>, gubun: string = '전체'): ChurchScore[] {
  const recs = recordsFor(records, month, gubun || '전체');
  const aggs = recs.map((r) => aggregate([r]));
  const prior = qualityPrior(aggs);
  return recs.map((r, i) => {
    const a = aggs[i];
    const q = churchQuality(a, prior), n = churchQuantity(a);
    return { name: r.name, jipa: r.jipa, country: r.country, color: jipaColors[r.jipa] || '#888', rec: r, agg: a, q, n };
  });
}

// ── 관문별 통과율(퍼널) ──
export interface FunnelChurch {
  name: string; jipa: string; country: string; continent: string; color: string; agg: AggregateResult;
  t: { t1: number | null; regReg: number | null; t2: number | null; t2mid: number | null; t2midR: number | null; t2high: number | null; t2highR: number | null; t3: number | null; t4: number | null; t5: number | null };
  absOnceCur: number | null; absLongCur: number | null; absOncePrev: number | null; absLongPrev: number | null;
  cls?: '자료부족' | '우수' | '점검' | '저조' | '관찰';
}

/** 관문별통과율 화면 원자료: 교회별 5단계(가등록→센터등록→출석→종강→입교자예배출석) 지표. */
export function computeFunnel(
  records: DiagnosisRecord[], month: string, months: string[], countryContMap: Record<string, string>
): FunnelChurch[] {
  const recs = recordsFor(records, month, '전체').filter((r) => r.gubun === '교회');
  const mi = months.indexOf(month), pm = mi > 0 ? months[mi - 1] : null;
  return recs.map((r) => {
    const a = aggregate([r]);
    const onsiteBreak = (a.newAttOnsite > 0 || a.newAttOnline > 0);
    const cMid = a.ctwkM || null, cHigh = a.ctwkH || null;
    const t = {
      t1: rate(a.centerCumReg, a.bibleCumReg),
      regReg: rate(a.centerCumReg, a.retroReg),
      t2: rate(a.catM + a.catH, a.ctwkM + a.ctwkH),
      t2mid: rate(a.catM, cMid),
      t2midR: rate(a.catM, a.evangReg),
      t2high: rate(a.catH, cHigh),
      t2highR: rate(a.catH, a.evangReg),
      t3: (a.centerMonthGrad > 0 && a.centerTotMonthReg > 0) ? rate(a.centerMonthGrad, a.centerTotMonthReg) : null,
      t4: rate(a.newAttTotal, a.prevNewAdmitCnt),
      t5: onsiteBreak ? rate(a.newAttOnsite, a.prevNewAdmitCnt) : null,
    };
    let aOnce = rate(a.absOnce, a.attReg), aLong = rate(a.absLongManage + a.absLongUnmanage, a.attReg);
    let aOnceP: number | null = null, aLongP: number | null = null;
    if (pm) {
      const pr = records.find((x) => x.name === r.name && x.month === pm);
      if (pr) { const pa = aggregate([pr]); aOnceP = rate(pa.absOnce, pa.attReg); aLongP = rate(pa.absLongManage + pa.absLongUnmanage, pa.attReg); }
    }
    return {
      name: r.name, jipa: r.jipa, country: r.country, continent: contOf(r, countryContMap), color: '#888', agg: a, t,
      absOnceCur: aOnce, absLongCur: aLong, absOncePrev: aOnceP, absLongPrev: aLongP,
    };
  });
}

/** 관문별통과율 교회 분류(우수/점검/저조/관찰/자료부족) — 입구(중앙값)·후속단계(평균) 대비. */
export function classifyFunnel(churches: FunnelChurch[]): { aT1: number | null; aT2: number | null; aT3: number | null; aT4: number | null; aT2mid: number | null; aT2high: number | null } {
  const avgOf = (k: keyof FunnelChurch['t']) => {
    const vs = churches.map((c) => c.t[k]).filter((v): v is number => v != null && !isNaN(v));
    return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null;
  };
  const medReg = median(churches.map((c) => c.t.regReg).filter((v): v is number => v != null));
  const aT2 = avgOf('t2'), aT3 = avgOf('t3'), aT4 = avgOf('t4'), aT2mid = avgOf('t2mid'), aT2high = avgOf('t2high');
  churches.forEach((c) => {
    const entryStrong = c.t.regReg != null && medReg != null && c.t.regReg >= medReg;
    const fol: boolean[] = [];
    if (c.t.t2 != null && aT2 != null) fol.push(c.t.t2 >= aT2);
    if (c.t.t3 != null && aT3 != null) fol.push(c.t.t3 >= aT3);
    if (c.t.t4 != null && aT4 != null) fol.push(c.t.t4 >= aT4);
    const followGood = fol.length ? (fol.filter(Boolean).length >= Math.ceil(fol.length / 2)) : null;
    if (c.t.regReg == null || followGood == null) c.cls = '자료부족';
    else if (entryStrong && followGood) c.cls = '우수';
    else if (entryStrong && !followGood) c.cls = '점검';
    else if (!entryStrong && !followGood) c.cls = '저조';
    else c.cls = '관찰';
  });
  return { aT1: avgOf('t1'), aT2, aT3, aT4, aT2mid, aT2high };
}
