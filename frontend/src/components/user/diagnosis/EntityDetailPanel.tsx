import React, { useState } from 'react';
import { useDiagnosisData } from '../../../contexts/DiagnosisDataContext';
import { DiagnosisRecord } from '../../../services/diagnosisService';
import { aggregate, AggregateResult, rate, fmt, pct, contOf } from '../../../utils/diagnosisMetrics';
import { CONT_KO, CONT_COLORS } from '../../../utils/diagnosisI18n';

// 국가별 IANA 타임존(현지시각 계산용) / 현지 언어·종교. Ported 1:1 from diagnosisEngine.js
// (COUNTRY_IANA/ianaFor/tzParts/tzOffsetH/computeTime/COUNTRY_INFO).
const COUNTRY_IANA: Record<string, string> = {
  "일본": "Asia/Tokyo", "중국": "Asia/Shanghai", "중화인민공화국": "Asia/Shanghai", "필리핀": "Asia/Manila", "대만": "Asia/Taipei",
  "우즈베키스탄": "Asia/Tashkent", "네팔": "Asia/Kathmandu", "레바논": "Asia/Beirut", "요르단": "Asia/Amman", "베트남": "Asia/Ho_Chi_Minh",
  "인도": "Asia/Kolkata", "방글라데시": "Asia/Dhaka", "미얀마": "Asia/Yangon", "태국": "Asia/Bangkok", "스리랑카": "Asia/Colombo",
  "싱가포르": "Asia/Singapore", "말레이시아": "Asia/Kuala_Lumpur", "몽골": "Asia/Ulaanbaatar", "파키스탄": "Asia/Karachi",
  "캄보디아": "Asia/Phnom_Penh", "아랍에미리트": "Asia/Dubai",
  "우크라이나": "Europe/Kyiv", "조지아": "Asia/Tbilisi", "독일": "Europe/Berlin", "덴마크": "Europe/Copenhagen", "노르웨이": "Europe/Oslo",
  "영국": "Europe/London", "스코틀랜드": "Europe/London", "스위스": "Europe/Zurich", "아일랜드": "Europe/Dublin", "이탈리아": "Europe/Rome",
  "헝가리": "Europe/Budapest", "프랑스": "Europe/Paris", "체코": "Europe/Prague", "스페인": "Europe/Madrid", "오스트리아": "Europe/Vienna",
  "몰도바": "Europe/Chisinau", "폴란드": "Europe/Warsaw", "슬로바키아": "Europe/Bratislava", "네덜란드": "Europe/Amsterdam",
  "벨기에": "Europe/Brussels", "루마니아": "Europe/Bucharest", "튀르키예": "Europe/Istanbul", "포르투갈": "Europe/Lisbon",
  "가나": "Africa/Accra", "나이지리아": "Africa/Lagos", "잠비아": "Africa/Lusaka", "케냐": "Africa/Nairobi", "보츠와나": "Africa/Gaborone",
  "말라위": "Africa/Blantyre", "탄자니아": "Africa/Dar_es_Salaam", "에티오피아": "Africa/Addis_Ababa", "이집트": "Africa/Cairo",
  "부룬디": "Africa/Bujumbura", "카메룬": "Africa/Douala", "르완다": "Africa/Kigali", "라이베리아": "Africa/Monrovia",
  "남아프리카공화국": "Africa/Johannesburg", "나미비아": "Africa/Windhoek", "짐바브웨": "Africa/Harare", "모잠비크": "Africa/Maputo",
  "마다가스카르": "Indian/Antananarivo", "시에라리온": "Africa/Freetown", "코트디부아르": "Africa/Abidjan", "콩고민주공화국": "Africa/Kinshasa", "우간다": "Africa/Kampala",
  "과테말라": "America/Guatemala", "엘살바도르": "America/El_Salvador", "파나마": "America/Panama",
  "아르헨티나": "America/Argentina/Buenos_Aires", "콜롬비아": "America/Bogota", "베네수엘라": "America/Caracas", "칠레": "America/Santiago",
  "페루": "America/Lima", "에콰도르": "America/Guayaquil", "뉴질랜드": "Pacific/Auckland", "피지": "Pacific/Fiji",
};

const COUNTRY_INFO: Record<string, { lang: string; rel: string }> = {
  "일본": { lang: "일본어", rel: "신토·불교" }, "중국": { lang: "중국어(표준)", rel: "불교·도교·무종교" }, "중화인민공화국": { lang: "중국어(표준)", rel: "불교·도교·무종교" },
  "필리핀": { lang: "필리핀어(타갈로그)·영어", rel: "가톨릭" }, "인도네시아": { lang: "인도네시아어", rel: "이슬람교" }, "대만": { lang: "중국어(만다린)", rel: "불교·도교" },
  "카자흐스탄": { lang: "카자흐어·러시아어", rel: "이슬람교(수니)" }, "우즈베키스탄": { lang: "우즈베크어", rel: "이슬람교(수니)" }, "네팔": { lang: "네팔어", rel: "힌두교" },
  "레바논": { lang: "아랍어", rel: "이슬람교·기독교" }, "요르단": { lang: "아랍어", rel: "이슬람교(수니)" }, "베트남": { lang: "베트남어", rel: "불교·무종교" },
  "인도": { lang: "힌디어·영어", rel: "힌두교" }, "방글라데시": { lang: "벵골어", rel: "이슬람교" }, "미얀마": { lang: "미얀마어", rel: "불교(상좌부)" },
  "태국": { lang: "타이어", rel: "불교(상좌부)" }, "스리랑카": { lang: "싱할라어·타밀어", rel: "불교" }, "싱가포르": { lang: "영어·중국어·말레이어", rel: "불교·기독교·이슬람교" },
  "말레이시아": { lang: "말레이어", rel: "이슬람교" }, "몽골": { lang: "몽골어", rel: "불교(티베트)" }, "파키스탄": { lang: "우르두어·영어", rel: "이슬람교" },
  "캄보디아": { lang: "크메르어", rel: "불교(상좌부)" }, "아랍에미리트": { lang: "아랍어", rel: "이슬람교(수니)" },
  "러시아": { lang: "러시아어", rel: "정교회" }, "우크라이나": { lang: "우크라이나어", rel: "정교회" }, "조지아": { lang: "조지아어", rel: "정교회" },
  "독일": { lang: "독일어", rel: "기독교(개신교·가톨릭)" }, "덴마크": { lang: "덴마크어", rel: "개신교(루터교)" }, "노르웨이": { lang: "노르웨이어", rel: "개신교(루터교)" },
  "영국": { lang: "영어", rel: "기독교(성공회)" }, "스코틀랜드": { lang: "영어", rel: "기독교(장로교)" }, "스위스": { lang: "독일어·프랑스어·이탈리아어", rel: "기독교" },
  "아일랜드": { lang: "영어·아일랜드어", rel: "가톨릭" }, "이탈리아": { lang: "이탈리아어", rel: "가톨릭" }, "헝가리": { lang: "헝가리어", rel: "가톨릭" },
  "프랑스": { lang: "프랑스어", rel: "가톨릭" }, "체코": { lang: "체코어", rel: "무종교·가톨릭" }, "스페인": { lang: "스페인어", rel: "가톨릭" },
  "오스트리아": { lang: "독일어", rel: "가톨릭" }, "몰도바": { lang: "루마니아어(몰도바어)", rel: "정교회" }, "폴란드": { lang: "폴란드어", rel: "가톨릭" },
  "슬로바키아": { lang: "슬로바키아어", rel: "가톨릭" }, "네덜란드": { lang: "네덜란드어", rel: "무종교·기독교" }, "벨기에": { lang: "네덜란드어·프랑스어", rel: "가톨릭" },
  "루마니아": { lang: "루마니아어", rel: "정교회" }, "튀르키예": { lang: "튀르키예어", rel: "이슬람교(수니)" }, "포르투갈": { lang: "포르투갈어", rel: "가톨릭" },
  "가나": { lang: "영어", rel: "기독교" }, "나이지리아": { lang: "영어", rel: "기독교·이슬람교" }, "잠비아": { lang: "영어", rel: "기독교" }, "케냐": { lang: "스와힐리어·영어", rel: "기독교" },
  "보츠와나": { lang: "영어·츠와나어", rel: "기독교" }, "말라위": { lang: "영어·치체와어", rel: "기독교" }, "탄자니아": { lang: "스와힐리어·영어", rel: "기독교·이슬람교" },
  "에티오피아": { lang: "암하라어", rel: "정교회·이슬람교" }, "이집트": { lang: "아랍어", rel: "이슬람교(수니)" }, "부룬디": { lang: "키룬디어·프랑스어", rel: "기독교(가톨릭)" },
  "카메룬": { lang: "프랑스어·영어", rel: "기독교·이슬람교" }, "르완다": { lang: "키냐르완다어·영어", rel: "기독교" }, "라이베리아": { lang: "영어", rel: "기독교" },
  "남아프리카공화국": { lang: "영어 등 11개 공용어", rel: "기독교" }, "나미비아": { lang: "영어", rel: "기독교" }, "짐바브웨": { lang: "영어·쇼나어", rel: "기독교" },
  "모잠비크": { lang: "포르투갈어", rel: "기독교·이슬람교" }, "마다가스카르": { lang: "말라가시어·프랑스어", rel: "기독교·토착신앙" }, "시에라리온": { lang: "영어", rel: "이슬람교·기독교" },
  "코트디부아르": { lang: "프랑스어", rel: "이슬람교·기독교" }, "콩고민주공화국": { lang: "프랑스어", rel: "기독교(가톨릭)" }, "우간다": { lang: "영어·스와힐리어", rel: "기독교" },
  "미국": { lang: "영어", rel: "기독교" }, "캐나다": { lang: "영어·프랑스어", rel: "기독교" },
  "멕시코": { lang: "스페인어", rel: "가톨릭" }, "과테말라": { lang: "스페인어", rel: "가톨릭·개신교" }, "엘살바도르": { lang: "스페인어", rel: "가톨릭·개신교" }, "파나마": { lang: "스페인어", rel: "가톨릭" },
  "아르헨티나": { lang: "스페인어", rel: "가톨릭" }, "콜롬비아": { lang: "스페인어", rel: "가톨릭" }, "베네수엘라": { lang: "스페인어", rel: "가톨릭" }, "칠레": { lang: "스페인어", rel: "가톨릭" },
  "페루": { lang: "스페인어", rel: "가톨릭" }, "에콰도르": { lang: "스페인어", rel: "가톨릭" }, "브라질": { lang: "포르투갈어", rel: "가톨릭" },
  "호주": { lang: "영어", rel: "기독교" }, "뉴질랜드": { lang: "영어·아일랜드어", rel: "기독교·무종교" }, "피지": { lang: "영어·피지어", rel: "기독교·힌두교" },
};

function ianaFor(country: string, lon: number | null): string | null {
  const c = country, ln = lon == null ? 0 : lon;
  if (c === '미국' || c === '캐나다') { if (ln < -115) return 'America/Los_Angeles'; if (ln < -100) return 'America/Denver'; if (ln < -87) return 'America/Chicago'; return 'America/New_York'; }
  if (c === '멕시코') return ln < -103 ? 'America/Tijuana' : 'America/Mexico_City';
  if (c === '브라질') return 'America/Sao_Paulo';
  if (c === '러시아') return ln > 60 ? 'Asia/Yekaterinburg' : 'Europe/Moscow';
  if (c === '인도네시아') return ln >= 116 ? 'Asia/Makassar' : 'Asia/Jakarta';
  if (c === '호주') return 'Australia/Sydney';
  if (c === '카자흐스탄') return 'Asia/Almaty';
  return COUNTRY_IANA[c] || null;
}
function tzParts(tz: string, date: Date): Record<string, string> {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const o: Record<string, string> = {};
  dtf.formatToParts(date).forEach((p) => { if (p.type !== 'literal') o[p.type] = p.value; });
  return o;
}
function tzOffsetH(tz: string, date: Date): number {
  const p = tzParts(tz, date);
  let hh = +p.hour; if (hh === 24) hh = 0;
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, hh, +p.minute, +p.second);
  return Math.round((asUTC - date.getTime()) / 3600000 * 4) / 4;
}

interface TimeInfo { km: number; hLabel: string; local: string; diffLabel: string; }

/** 인천(ICN) 기준 대권거리·직항 소요시간·현지시각. Ported 1:1 from computeTime(). */
function computeTime(r: { lat: number | null; lon: number | null; country: string }): TimeInfo {
  const ICN = { lat: 37.46, lng: 126.44 };
  const toRad = (d: number) => d * Math.PI / 180;
  const lat = r.lat || 0, lon = r.lon || 0;
  const dLat = toRad(lat - ICN.lat), dLng = toRad(lon - ICN.lng);
  const hav = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(ICN.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  const km = 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(hav)));
  const hrs = km / 900 + 1.0;
  const hLabel = hrs < 10 ? hrs.toFixed(1) : Math.round(hrs).toString();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const now = new Date();
  const tz = ianaFor(r.country, r.lon);
  let local: string | null = null, diffLabel: string | null = null;
  if (tz) {
    try {
      const p = tzParts(tz, now);
      let h = +p.hour; if (h === 24) h = 0;
      const wd = new Date(Date.UTC(+p.year, +p.month - 1, +p.day)).getUTCDay();
      local = `${+p.month}월 ${+p.day}일 (${days[wd]}) ${h < 12 ? '오전' : '오후'} ${((h + 11) % 12) + 1}:${p.minute}`;
      const d = tzOffsetH(tz, now) - 9;
      const ds = Number.isInteger(d) ? Math.abs(d).toString() : Math.abs(d).toFixed(2).replace(/0$/, '');
      diffLabel = d === 0 ? '한국과 동일' : (d > 0 ? `한국보다 +${ds}시간 빠름` : `한국보다 ${ds}시간 느림`);
    } catch { local = null; }
  }
  if (local == null) {
    const tzo = Math.round(lon / 15), d = tzo - 9;
    const lw = new Date(Date.now() + tzo * 3600000), h = lw.getUTCHours();
    local = `${lw.getUTCMonth() + 1}월 ${lw.getUTCDate()}일 (${days[lw.getUTCDay()]}) ${h < 12 ? '오전' : '오후'} ${((h + 11) % 12) + 1}:${String(lw.getUTCMinutes()).padStart(2, '0')}`;
    diffLabel = d === 0 ? '한국과 동일' : (d > 0 ? `한국보다 +${d}시간 빠름` : `한국보다 ${-d}시간 느림`);
  }
  return { km, hLabel, local, diffLabel };
}

const TimePanel: React.FC<{ r: { lat: number | null; lon: number | null; country: string }; compact?: boolean }> = ({ r, compact }) => {
  const t = computeTime(r);
  if (compact) {
    return (
      <>
        <div style={{ background: 'rgba(95,168,255,.09)', border: '1px solid rgba(95,168,255,.22)', borderRadius: 10, padding: '11px 13px', marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>✈️ 인천(ICN)에서 직항 약</div>
          <div style={{ fontSize: 21, fontWeight: 800, color: '#5fa8ff' }}>{t.hLabel}<span style={{ fontSize: 13 }}> 시간</span> <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>· {fmt(t.km)}km</span></div>
        </div>
        <div style={{ background: 'rgba(216,162,62,.09)', border: '1px solid rgba(216,162,62,.24)', borderRadius: 10, padding: '11px 13px' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>🕐 현지 시각 (대략)</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--gold2)' }}>{t.local}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{t.diffLabel}</div>
        </div>
      </>
    );
  }
  return (
    <div className="msec">
      <h4>✈️ 한국(인천 ICN) 기준 거리 · 시차</h4>
      <div style={{ display: 'flex', gap: 11, flexWrap: 'wrap' }}>
        <div className="mcell" style={{ flex: 1, minWidth: 210 }}>
          <div className="l">인천(ICN)에서 직항 약</div>
          <div className="v" style={{ color: '#5fa8ff' }}>{t.hLabel}시간</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>대권거리 {fmt(t.km)} km</div>
        </div>
        <div className="mcell" style={{ flex: 1, minWidth: 210 }}>
          <div className="l">현지 시각 (대략)</div>
          <div className="v" style={{ fontSize: 15, color: 'var(--gold2)' }}>{t.local}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{t.diffLabel}</div>
        </div>
      </div>
    </div>
  );
};

const CountryInfoPanel: React.FC<{ country?: string; compact?: boolean }> = ({ country, compact }) => {
  const info = country ? COUNTRY_INFO[country] : null;
  if (!info) return null;
  if (compact) {
    return (
      <div style={{ background: 'rgba(134,202,182,.09)', border: '1px solid rgba(134,202,182,.24)', borderRadius: 10, padding: '11px 13px', marginTop: 8 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>🗣️ 현지 언어</div><div style={{ fontSize: 14, fontWeight: 700, color: '#9fe0c8' }}>{info.lang}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 7 }}>🙏 주요 종교</div><div style={{ fontSize: 14, fontWeight: 700, color: '#9fe0c8' }}>{info.rel}</div>
      </div>
    );
  }
  return (
    <div className="msec">
      <h4>🌍 {country} — 현지 언어 · 종교</h4>
      <div style={{ display: 'flex', gap: 11, flexWrap: 'wrap' }}>
        <div className="mcell" style={{ flex: 1, minWidth: 210 }}><div className="l">🗣️ 현지 언어</div><div className="v" style={{ fontSize: 15 }}>{info.lang}</div></div>
        <div className="mcell" style={{ flex: 1, minWidth: 210 }}><div className="l">🙏 주요 종교</div><div className="v" style={{ fontSize: 15 }}>{info.rel}</div></div>
      </div>
    </div>
  );
};

/** 지도/지구본에서 아무것도 선택하지 않았을 때 보이는 안내 문구. */
export const PanelHint: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 260, color: 'var(--muted)', textAlign: 'center', gap: 10 }}>
    <div style={{ fontSize: 34 }}>👆</div>
    <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>지도/지구본에서 <b style={{ color: 'var(--txt)' }}>교회 점을 클릭</b>하면<br />여기에 상세 정보와<br /><b style={{ color: 'var(--gold2)' }}>한국 시차·비행시간</b>이 표시됩니다.</div>
  </div>
);

interface EntityCompactPanelProps {
  name: string;
  onOpenFull: () => void;
  onOpenDiag?: (name: string) => void;
}

/** 지도·지구본·검색결과 클릭 시 옆에 보이는 간이 상세 카드. Ported 1:1 from entityPanelHTML(). */
export const EntityCompactPanel: React.FC<EntityCompactPanelProps> = ({ name, onOpenFull, onOpenDiag }) => {
  const { records, month, jipaColors } = useDiagnosisData();
  const recs = records.filter((r) => r.name === name);
  const i = recs[0];
  if (!i) return <PanelHint />;
  const cur = aggregate(recs.filter((r) => r.month === month));
  const er = recs.find((r) => r.lat != null && r.lon != null);
  const color = jipaColors[i.jipa] || 'var(--gold)';

  const stat = (l: string, v: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
      <span style={{ color: 'var(--muted)', fontSize: 13 }}>{l}</span>
      <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
        <span className="dot" style={{ width: 14, height: 14, background: color }} />
        <b style={{ fontSize: 16.5 }}>{name}</b>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>
        {i.gubun || ''} · {i.jipa || ''}지파 · {CONT_KO[i.continent] || i.continent || '-'} {i.country || ''}
      </div>
      {er ? <TimePanel r={er} compact /> : (
        <div style={{ fontSize: 12.5, color: 'var(--muted)', padding: 11, background: 'var(--panel2)', borderRadius: 9 }}>
          좌표 정보가 없어 시차·비행시간을 계산할 수 없습니다 (개척지 등).
        </div>
      )}
      <CountryInfoPanel country={i.country} compact />
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--gold2)', marginBottom: 6 }}>{month} 주요 지표</div>
        {stat('현재적', fmt(cur.registered))}
        {stat('입교율(누적)', pct(rate(cur.cumNewAdmit, cur.retroReg)))}
        {stat('전성도 출석율', pct(rate(cur.attTotal, cur.attReg)))}
        {stat('전월입교자 출석율', pct(rate(cur.newAttTotal, cur.prevNewAdmitCnt)))}
        {stat('센터 등록율(누적)', pct(rate(cur.centerCumReg, cur.evangReg)))}
      </div>
      <button
        onClick={onOpenFull}
        style={{ marginTop: 16, width: '100%', padding: 10, border: 'none', borderRadius: 9, background: 'var(--navy2)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
      >
        📋 전체 상세 보기
      </button>
      {i.gubun === '교회' && onOpenDiag && (
        <button
          onClick={() => onOpenDiag(name)}
          style={{ marginTop: 8, width: '100%', padding: 10, border: '1px solid var(--navy2)', borderRadius: 9, background: '#fff', color: 'var(--navy2)', fontWeight: 700, cursor: 'pointer' }}
        >
          🩺 교회 진단서 보기
        </button>
      )}
    </div>
  );
};

interface DetailMetricDef { key: string | ((a: AggregateResult) => number | null); label: string; type: 'int' | 'sint' | 'pct'; }

const DETAIL_GROUPS: [string, DetailMetricDef[]][] = [
  ['성도 재적·이동', [
    { key: 'registered', label: '현재적', type: 'int' }, { key: 'yearStartReg', label: '올해초재적', type: 'int' }, { key: 'prevReg', label: '전월재적', type: 'int' },
    { key: 'newAdmit', label: '입교', type: 'int' }, { key: 'transIn', label: '전입', type: 'int' }, { key: 'transOut', label: '전출', type: 'int' },
    { key: 'moveIn', label: '교회이동(전입)', type: 'int' }, { key: 'moveOut', label: '교회이동(전출)', type: 'int' },
    { key: 'discipline', label: '사고', type: 'int' }, { key: 'regChange', label: '재적증가수', type: 'sint' },
  ]],
  ['전월입교자 예배출석 (한 달간)', [
    { key: 'prevNewAdmitCnt', label: '전월입교자수', type: 'int' }, { key: 'newAttOnsite', label: '대면출석', type: 'int' },
    { key: 'newAttOnline', label: '온라인출석', type: 'int' }, { key: 'newAttEtc', label: '기타출석', type: 'int' }, { key: 'newAttTotal', label: '총출석', type: 'int' },
    { key: (a) => rate(a.newAttTotal, a.prevNewAdmitCnt), label: '출석율', type: 'pct' },
  ]],
  ['전성도 예배 출결', [
    { key: 'attReg', label: '출결재적', type: 'int' }, { key: 'attOnsite', label: '대면', type: 'int' }, { key: 'attOnline', label: '온라인', type: 'int' },
    { key: 'attEtc', label: '기타', type: 'int' }, { key: 'attTotal', label: '총출석', type: 'int' }, { key: (a) => rate(a.attTotal, a.attReg), label: '출석율', type: 'pct' },
    { key: 'absTotal', label: '총결석', type: 'int' }, { key: (a) => rate(a.absTotal, a.attReg), label: '결석율', type: 'pct' },
    { key: 'absOnce', label: '일회성결석', type: 'int' }, { key: 'absLongManage', label: '장기결석(관리가능)', type: 'int' }, { key: 'absLongUnmanage', label: '장기결석(관리불가)', type: 'int' },
  ]],
  ['전도재적 대비 가개강', [
    { key: 'evangReg', label: '전도재적', type: 'int' }, { key: 'bibleMonthReg', label: '가개강 월등록', type: 'int' },
    { key: 'bibleCumReg', label: '가개강 누적등록', type: 'int' }, { key: (a) => rate(a.bibleCumReg, a.evangReg), label: '등록율', type: 'pct' },
    { key: 'bibleCurAtt', label: '가개강 현재출석', type: 'int' },
  ]],
  ['센터(교육) 등록·종강·출석', [
    { key: 'centerMonthTotal', label: '월등록 총', type: 'int' }, { key: 'centerMonthOn', label: '월등록(대면)', type: 'int' }, { key: 'centerMonthOff', label: '월등록(비대면)', type: 'int' },
    { key: 'centerTotMonthReg', label: '총월등록수(종강분모)', type: 'int' }, { key: 'centerCumReg', label: '누적등록', type: 'int' }, { key: 'centerMonthGrad', label: '월종강', type: 'int' },
    { key: (a) => rate(a.centerMonthGrad, a.centerTotMonthReg), label: '월 종강율', type: 'pct' },
    { key: 'centerCumGrad', label: '누적종강', type: 'int' }, { key: (a) => rate(a.centerCumGrad, a.centerTotCumReg), label: '누적 종강율', type: 'pct' },
    { key: (a) => a.catE, label: '현출석(초)', type: 'int' }, { key: (a) => a.catM, label: '현출석(중)', type: 'int' }, { key: (a) => a.catH, label: '현출석(고)', type: 'int' },
  ]],
];

function metricGet(a: AggregateResult | undefined, key: DetailMetricDef['key']): number | null {
  if (!a) return 0;
  return typeof key === 'function' ? key(a) : (a[key] ?? 0);
}

/** 개별 지표의 월별 미니 스파크라인. Ported 1:1 from miniTrend(). */
const MiniTrend: React.FC<{ series: number[]; monthsArr: string[]; color: string; type: 'int' | 'sint' | 'pct'; curMonth: string; baseMonth: string | null }> = ({ series, monthsArr, color, type, curMonth, baseMonth }) => {
  const n = series.length;
  if (n === 0) return <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 8, textAlign: 'center' }}>데이터 없음</div>;
  const vals = series.map((x) => (x == null || isNaN(x)) ? 0 : x);
  const curIdx = monthsArr.indexOf(curMonth), baseIdx = baseMonth ? monthsArr.indexOf(baseMonth) : -1;
  const max = Math.max(...vals), min = Math.min(...vals), range = (max - min) || 1;
  const W = 164, H = 78, PL = 24, PR = 8, PT = 8, PB = 18, plotW = W - PL - PR, plotH = H - PT - PB;
  const X = (i: number) => PL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const Y = (v: number) => PT + plotH - ((v - min) / range) * plotH;
  const ylab = (v: number) => type === 'pct' ? Math.round(v * 100) + '%' : (v >= 1000 ? (Math.round(v / 100) / 10) + 'k' : Math.round(v));
  const cleanLabel = (m: string) => {
    if (!m) return '';
    const digits = m.match(/(\d+)\s*월?$/);
    if (digits && digits[1]) return `${parseInt(digits[1], 10)}월`;
    return m.replace(/^20\d\d[년_-]?\s*/, '');
  };
  const linePts = vals.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  const areaPts = `${PL},${(PT + plotH).toFixed(1)} ${linePts} ${(W - PR).toFixed(1)},${(PT + plotH).toFixed(1)}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', marginTop: 6 }}>
      {[0, 1, 2].map((k) => <line key={k} x1={PL} y1={(PT + plotH * k / 2).toFixed(1)} x2={W - PR} y2={(PT + plotH * k / 2).toFixed(1)} stroke="rgba(255,255,255,.07)" strokeWidth={0.6} />)}
      <polyline points={areaPts} fill={color} fillOpacity={0.12} stroke="none" />
      <line x1={PL} y1={PT} x2={PL} y2={PT + plotH} stroke="rgba(255,255,255,.28)" strokeWidth={0.8} />
      <line x1={PL} y1={PT + plotH} x2={W - PR} y2={PT + plotH} stroke="rgba(255,255,255,.28)" strokeWidth={0.8} />
      {baseIdx >= 0 && baseIdx < n && <line x1={X(baseIdx)} y1={PT} x2={X(baseIdx)} y2={PT + plotH} stroke="#8aa0c4" strokeWidth={0.7} strokeDasharray="2 2" opacity={0.45} />}
      {curIdx >= 0 && curIdx < n && <line x1={X(curIdx)} y1={PT} x2={X(curIdx)} y2={PT + plotH} stroke={color} strokeWidth={0.9} strokeDasharray="2 2" opacity={0.55} />}
      <polyline points={linePts} fill="none" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
      {vals.map((v, i) => <circle key={i} cx={X(i)} cy={Y(v)} r={i === curIdx ? 3.4 : 1.9} fill={color} stroke={i === curIdx ? '#fff' : undefined} strokeWidth={i === curIdx ? 0.8 : undefined} />)}
      <text x={PL - 3} y={PT + 6} fontSize={7.5} fill="#8aa0c4" textAnchor="end">{ylab(max)}</text>
      <text x={PL - 3} y={PT + plotH} fontSize={7.5} fill="#8aa0c4" textAnchor="end">{ylab(min)}</text>
      {monthsArr.map((m, i) => <text key={i} x={X(i)} y={H - 5} fontSize={8} fill="#8aa0c4" textAnchor="middle">{cleanLabel(m)}</text>)}
    </svg>
  );
};

export type DetailTarget = { name: string; kind: 'entity' | 'jipa' | 'continent' };

interface EntityDetailModalProps {
  target: DetailTarget | null;
  gubun: string;
  onClose: () => void;
}

/** "전체 상세 보기" 클릭 시 뜨는 확장 모달(월별 미니추이 포함). Ported 1:1 from openDetail(). */
export const EntityDetailModal: React.FC<EntityDetailModalProps> = ({ target, gubun, onClose }) => {
  const { records, months, month, jipaColors, countryContMap } = useDiagnosisData();
  const [cmp, setCmp] = useState<'first' | 'prev'>('first');

  if (!target) return null;
  const { name, kind } = target;

  const gf = (r: DiagnosisRecord) => gubun === '전체' || r.gubun === gubun;
  let recsAll: DiagnosisRecord[]; let sub = ''; const isEntity = kind === 'entity';
  if (kind === 'entity') {
    recsAll = records.filter((r) => r.name === name);
    const i = recsAll[0] || ({} as DiagnosisRecord);
    sub = `${i.gubun || ''} · ${i.jipa || ''} · ${CONT_KO[i.continent] || i.continent || '-'} ${i.country || ''}`;
  } else if (kind === 'continent') {
    recsAll = records.filter((r) => contOf(r, countryContMap) === name && gf(r));
    sub = '대륙 합계' + (gubun !== '전체' ? ` · ${gubun}` : '');
  } else {
    recsAll = records.filter((r) => r.jipa === name && gf(r));
    sub = name + (gubun === '전체' ? ' 전체(교회+지역+개척지)' : ` · ${gubun}만`);
  }

  const perMonth: Record<string, AggregateResult> = {};
  months.forEach((mn) => { perMonth[mn] = aggregate(recsAll.filter((r) => r.month === mn)); });
  const cur = perMonth[month];
  const mi = months.indexOf(month);
  const baseIdx = cmp === 'prev' ? (mi > 0 ? mi - 1 : null) : (mi > 0 ? 0 : null);
  const baseLbl = cmp === 'prev' ? '전월' : '1월';

  const color = isEntity ? (jipaColors[(recsAll[0] || {} as DiagnosisRecord).jipa] || 'var(--gold)')
    : (kind === 'continent' ? (CONT_COLORS[name] || '#888') : (jipaColors[name] || 'var(--gold)'));
  const er = isEntity ? recsAll.find((r) => r.lat != null && r.lon != null) : undefined;
  const countryForInfo = isEntity ? ((er && er.country) || (recsAll[0] || {} as DiagnosisRecord).country) : undefined;

  let countryList: [string, number][] = [];
  if (!isEntity) {
    const cm: Record<string, Set<string>> = {};
    recsAll.filter((r) => r.month === month).forEach((r) => { const c = (r.country && r.country !== '-') ? r.country : '미분류'; (cm[c] = cm[c] || new Set()).add(r.name); });
    countryList = Object.entries(cm).map(([c, s]) => [c, s.size] as [string, number]).sort((a, b) => b[1] - a[1]);
  }

  const parseMonthNum = (mStr: string) => {
    if (!mStr) return 8;
    const m1 = String(mStr).match(/(\d+)\s*월/); if (m1) return parseInt(m1[1], 10);
    const m2 = String(mStr).match(/(\d+)$/); if (m2) return parseInt(m2[1], 10);
    return 8;
  };
  const curMonthNum = parseMonthNum(month);

  return (
    <div className="ovl on" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="mh">
          <span className="dot" style={{ width: 16, height: 16, background: color }} />
          <b>{name}</b>
          <span className="badge" style={{ background: color + '33', color }}>{month} 기준</span>
          <button className="x" onClick={onClose}>✕</button>
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginLeft: 28 }}>{sub}</div>

        {er && <TimePanel r={er} />}
        {isEntity && <CountryInfoPanel country={countryForInfo} />}
        {!isEntity && countryList.length > 0 && (
          <div className="msec">
            <h4>🌍 소속 국가 — {countryList.length}개국 (교회·지역 수)</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {countryList.map(([c, n]) => (
                <span key={c} style={{ fontSize: 12.5, padding: '4px 11px', borderRadius: 16, background: 'var(--panel2)', border: '1px solid var(--line)' }}>
                  {c} <b style={{ color: 'var(--gold2)' }}>{n}</b>
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ margin: '14px 0 2px', display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>📊 증감 기준</span>
          <div className="toggle">
            <button className={cmp === 'first' ? 'on' : ''} onClick={() => setCmp('first')}>1월 대비</button>
            <button className={cmp === 'prev' ? 'on' : ''} onClick={() => setCmp('prev')}>전월 대비</button>
          </div>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{month} {baseIdx == null ? '(기준월이라 비교 대상 없음)' : 'vs ' + months[baseIdx]}</span>
        </div>

        {DETAIL_GROUPS.map(([title, mets]) => (
          <div className="msec" key={title}>
            <h4>{title}</h4>
            <div className="mgrid">
              {mets.map((m, mi2) => {
                let targetMonthKeys: string[] = [];
                if (cmp === 'prev') {
                  const prevNum = curMonthNum > 1 ? curMonthNum - 1 : 1;
                  targetMonthKeys = [prevNum + '월', curMonthNum + '월'];
                } else {
                  for (let mm = 1; mm <= curMonthNum; mm++) targetMonthKeys.push(mm + '월');
                }
                const fm = targetMonthKeys.map((mKey) => {
                  const mNum = parseInt(mKey.replace('월', ''), 10);
                  const foundMn = months.find((mn) => parseMonthNum(mn) === mNum);
                  let val = 0;
                  if (foundMn && perMonth[foundMn] && perMonth[foundMn].count > 0) {
                    const rawV = metricGet(perMonth[foundMn], m.key);
                    val = (rawV != null && !isNaN(rawV)) ? rawV : 0;
                  } else if (mNum === curMonthNum && cur) {
                    const rawV = metricGet(cur, m.key);
                    val = (rawV != null && !isNaN(rawV)) ? rawV : 0;
                  }
                  return { m: mKey, v: val };
                });
                const fMonths = fm.map((p) => p.m), series = fm.map((p) => p.v);
                const hasCur = perMonth[month] && perMonth[month].count > 0;
                const cv = hasCur ? metricGet(cur, m.key) : (fm.length ? fm[fm.length - 1].v : null);
                const disp = (cv == null) ? '-' : (m.type === 'pct' ? pct(cv) : ((m.type === 'sint' && cv > 0 ? '+' : '') + fmt(cv)));
                const baseM = fm.length > 0 ? fm[0].m : null;
                const baseVal = fm.length > 0 ? fm[0].v : null;
                let badge: React.ReactNode = null;
                if (baseVal != null && cv != null) {
                  const d = cv - baseVal;
                  const dtxt = m.type === 'pct' ? ((d >= 0 ? '+' : '') + (d * 100).toFixed(1) + '%p') : ((d >= 0 ? '+' : '') + fmt(d));
                  const cls = d > 0 ? 'pos' : (d < 0 ? 'neg' : ''), arr = d > 0 ? '▲' : (d < 0 ? '▼' : '–');
                  badge = <span className={cls} style={{ fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }} title={`${baseLbl} 대비`}>{arr} {dtxt}</span>;
                }
                return (
                  <div className="mcell" key={mi2}>
                    <div className="l">{m.label}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
                      <span className="v">{disp}</span>{badge}
                    </div>
                    <MiniTrend series={series} monthsArr={fMonths} color={color} type={m.type} curMonth={month} baseMonth={baseM} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div style={{ marginTop: 18, fontSize: 12, color: 'var(--muted)' }}>
          ※ 작은 그래프는 1~5월 추이 (가로축=월, 세로축=값). 색 점선=선택한 달, 회색 점선=비교 기준달. <span className="pos">▲</span>/<span className="neg">▼</span> 증감 기준은 위 <b>1월 대비 / 전월 대비</b> 탭으로 전환됩니다.
        </div>
      </div>
    </div>
  );
};
