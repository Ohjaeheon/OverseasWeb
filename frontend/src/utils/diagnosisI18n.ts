// 다국어(한/영/중/일) 정적 문구 및 대륙/국가명 번역. Ported 1:1 from diagnosisEngine.js
// (CONT_KO/CONT_TR/COUNTRY_TR/UI_TR/CONT_COLORS).
export type Lang = 'ko' | 'en' | 'zh' | 'ja';

export const CONT_KO: Record<string, string> = {
  "아시아": "아시아", "유럽": "유럽", "아프리카": "아프리카", "북아메리카": "북아메리카",
  "남아메리카": "남아메리카", "중앙아메리카": "중앙아메리카", "오세아니아": "오세아니아", "": "미분류", "-": "미분류",
};

export const CONT_COLORS: Record<string, string> = {
  "아시아": "#E8871E", "유럽": "#F5C518", "아프리카": "#6D28D9", "북아메리카": "#2FA84F",
  "남아메리카": "#E0447B", "중앙아메리카": "#0D9488", "오세아니아": "#0EA5C4", "미분류": "#94a3b8",
};

interface Translated { en: string; zh: string; ja: string; }

export const CONT_TR: Record<string, Translated> = {
  "아시아": { en: "Asia", zh: "亚洲", ja: "アジア" }, "유럽": { en: "Europe", zh: "欧洲", ja: "ヨーロッパ" },
  "아프리카": { en: "Africa", zh: "非洲", ja: "アフリカ" }, "북아메리카": { en: "North America", zh: "北美洲", ja: "北アメリカ" },
  "남아메리카": { en: "South America", zh: "南美洲", ja: "南アメリカ" }, "중앙아메리카": { en: "Central America", zh: "中美洲", ja: "中央アメリカ" },
  "오세아니아": { en: "Oceania", zh: "大洋洲", ja: "オセアニア" }, "미분류": { en: "Unclassified", zh: "未分类", ja: "未分類" },
};

export const COUNTRY_TR: Record<string, Translated> = {
  "가나": { en: "Ghana", zh: "加纳", ja: "ガーナ" }, "과테말라": { en: "Guatemala", zh: "危地马拉", ja: "グアテマラ" },
  "나미비아": { en: "Namibia", zh: "纳米比亚", ja: "ナミビア" }, "나이지리아": { en: "Nigeria", zh: "尼日利亚", ja: "ナイジェリア" },
  "남아프리카공화국": { en: "South Africa", zh: "南非", ja: "南アフリカ" }, "네덜란드": { en: "Netherlands", zh: "荷兰", ja: "オランダ" },
  "독일": { en: "Germany", zh: "德国", ja: "ドイツ" }, "마다가스카르": { en: "Madagascar", zh: "马达加斯加", ja: "マダガスカル" },
  "말레이시아": { en: "Malaysia", zh: "马来西亚", ja: "マレーシア" }, "몽골": { en: "Mongolia", zh: "蒙古", ja: "モンゴル" },
  "미국": { en: "United States", zh: "美国", ja: "アメリカ" }, "베트남": { en: "Vietnam", zh: "越南", ja: "ベトナム" },
  "부룬디": { en: "Burundi", zh: "布隆迪", ja: "ブルンジ" }, "브라질": { en: "Brazil", zh: "巴西", ja: "ブラジル" },
  "스리랑카": { en: "Sri Lanka", zh: "斯里兰卡", ja: "スリランカ" }, "스위스": { en: "Switzerland", zh: "瑞士", ja: "スイス" },
  "스페인": { en: "Spain", zh: "西班牙", ja: "スペイン" }, "에티오피아": { en: "Ethiopia", zh: "埃塞俄比亚", ja: "エチオピア" },
  "영국": { en: "United Kingdom", zh: "英国", ja: "イギリス" }, "우간다": { en: "Uganda", zh: "乌干达", ja: "ウガンダ" },
  "인도": { en: "India", zh: "印度", ja: "インド" }, "인도네시아": { en: "Indonesia", zh: "印度尼西亚", ja: "インドネシア" },
  "일본": { en: "Japan", zh: "日本", ja: "日本" }, "중화인민공화국": { en: "China", zh: "中国", ja: "中国" },
  "체코": { en: "Czech Republic", zh: "捷克", ja: "チェコ" }, "케냐": { en: "Kenya", zh: "肯尼亚", ja: "ケニア" },
  "콜롬비아": { en: "Colombia", zh: "哥伦比亚", ja: "コロンビア" }, "콩고민주공화국": { en: "DR Congo", zh: "刚果(金)", ja: "コンゴ民主共和国" },
  "탄자니아": { en: "Tanzania", zh: "坦桑尼亚", ja: "タンザニア" }, "튀르키예": { en: "Türkiye", zh: "土耳其", ja: "トルコ" },
  "파키스탄": { en: "Pakistan", zh: "巴基斯坦", ja: "パキスタン" }, "프랑스": { en: "France", zh: "法国", ja: "フランス" },
  "필리핀": { en: "Philippines", zh: "菲律宾", ja: "フィリピン" }, "호주": { en: "Australia", zh: "澳大利亚", ja: "オーストラリア" },
};

interface UiTrKey { ko: string; en: string; zh: string; ja: string; }

export const UI_TR: Record<string, UiTrKey> = {
  title: { ko: '계시록의 실상,<br><b>만국(萬國)</b>으로 흐르다', en: 'The Reality of Revelation,<br>Flowing to <b>All Nations</b>', zh: '启示录的实状,<br>流向<b>万国</b>', ja: '黙示録の実状、<br><b>万国</b>へ流れる' },
  mission: { ko: '전 세계 해외교회의 걸음을 한자리에서 봅니다.<br>양(量)에 속지 않고 <b>질(質)</b>을 보며, 확인을 넘어 <b>행함</b>으로.', en: "See every overseas church's walk in one place.<br>Not quantity but <b>quality</b> — beyond checking, to <b>action</b>.", zh: '在一处纵览全球海外教会的脚步。<br>不被量迷惑而看<b>质</b>,超越确认,走向<b>行动</b>。', ja: '世界中の海外教会の歩みを一か所で見ます。<br>量に惑わされず<b>質</b>を見て、確認を越えて<b>行い</b>へ。' },
  foot: { ko: '총회 해외선교부 글로벌 대시보드', en: 'HQ Overseas Mission Dept. · Global Dashboard', zh: '总会海外宣教部 · 全球仪表盘', ja: '総会海外宣教部 · グローバルダッシュボード' },
  pw: { ko: '접속 암호를 입력하세요', en: 'Enter access password', zh: '请输入访问密码', ja: 'アクセスパスワードを入力' },
  pwErr: { ko: '암호가 올바르지 않습니다', en: 'Incorrect password', zh: '密码不正确', ja: 'パスワードが正しくありません' },
  enter: { ko: '들어가기 &rarr;', en: 'Enter &rarr;', zh: '进入 &rarr;', ja: '入る &rarr;' },
  brand: { ko: '해외선교부 <b>업무포탈</b>', en: 'Overseas Mission · <b>업무포탈</b>', zh: '海外宣教部 · <b>업무포탈</b>', ja: '海外宣教部 · <b>업무포탈</b>' },
  moLabel: { ko: '📅 기준월', en: '📅 Month', zh: '📅 月份', ja: '📅 基準月' },
  cover: { ko: '🏠 인트로', en: '🏠 Intro', zh: '🏠 首页', ja: '🏠 イントロ' },
  print: { ko: '📄 출력 · PDF 저장', en: '📄 Print · PDF', zh: '📄 打印 · PDF', ja: '📄 印刷 · PDF' },
  stChurch: { ko: '해외교회', en: 'Churches', zh: '海外教会', ja: '海外教会' },
  stRegion: { ko: '해외지역', en: 'Regions', zh: '海外地区', ja: '海外地域' },
  stPion: { ko: '개척지역', en: 'Pioneering', zh: '开拓地区', ja: '開拓地域' },
  unit: { ko: '곳', en: '', zh: '处', ja: 'か所' },
  suffCountry: { ko: '개국', en: ' countries', zh: '国', ja: 'か国' },
  suffJipa: { ko: '지파', en: ' tribes', zh: '支派', ja: '支派' },
};

/** 대륙 한글명을 현재 언어로 번역 (없으면 한글 그대로). */
export function contName(contKo: string, lang: Lang): string {
  const kk = CONT_KO[contKo] || contKo || '-';
  return (lang === 'ko' || !CONT_TR[kk]) ? kk : (CONT_TR[kk][lang] || kk);
}

/** 국가 한글명을 현재 언어로 번역 (없으면 한글 그대로). */
export function countryName(countryKo: string, lang: Lang): string {
  if (lang === 'ko' || !countryKo || !COUNTRY_TR[countryKo]) return countryKo;
  return COUNTRY_TR[countryKo][lang] || countryKo;
}
