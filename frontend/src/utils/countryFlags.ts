// 국가명(한국어) -> ISO 3166-1 alpha-2 코드. 기존 내장 국기 이미지(FLAG_IMAGES, ISO 코드 키)에
// 한글 국가명으로 접근하기 위한 매핑. AdminFaithPage.tsx COUNTRY_INFO 및 현재 등록된 해외교회 국가 기준.
import { FLAG_IMAGES } from '../data/flagImages';

const COUNTRY_ISO: Record<string, string> = {
  일본: 'jp', 중국: 'cn', 대만: 'tw', 필리핀: 'ph', 인도네시아: 'id',
  카자흐스탄: 'kz', 우즈베키스탄: 'uz', 네팔: 'np', 인도: 'in', 파키스탄: 'pk',
  튀르키예: 'tr', 포르투갈: 'pt', 브라질: 'br', 멕시코: 'mx', 미국: 'us',
  콩고민주공화국: 'cd', 카메룬: 'cm', 모잠비크: 'mz', 한국: 'kr',
  베트남: 'vn', 태국: 'th', 캄보디아: 'kh', 말레이시아: 'my',
  독일: 'de', 프랑스: 'fr', 영국: 'gb', 스페인: 'es', 이탈리아: 'it',
  케냐: 'ke', 남아프리카공화국: 'za', 에티오피아: 'et', 짐바브웨: 'zw', 잠비아: 'zm',
  캐나다: 'ca', 아르헨티나: 'ar', 페루: 'pe', 콜롬비아: 'co', 칠레: 'cl',
  러시아: 'ru', 우크라이나: 'ua', 이집트: 'eg', 요르단: 'jo',
};

export function flagFor(country: string | null | undefined): string | null {
  if (!country) return null;
  const iso = COUNTRY_ISO[country];
  return (iso && FLAG_IMAGES[iso]) || null;
}
