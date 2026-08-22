export interface SidebarChild { cat?: string; tab?: string; label: string; path: string; }
export interface SidebarItem { s: string; ico: string; label: string; path: string; tag?: string; children?: SidebarChild[]; }
export interface SidebarGroup { grp: string; }
export type SidebarEntry = SidebarItem | SidebarGroup;

export function isGroup(e: SidebarEntry): e is SidebarGroup { return 'grp' in e; }

// 메시지 사전(i18n_dictionary) 조회용 안정적인 키 도출 — 기존 s/grp/cat/tab 식별자를 그대로 재사용한다.
// navGroups.ts(사이드바 렌더링)와 UserMenuLayoutPage.tsx(배치 편집 화면)가 동일 키를 공유해야
// 편집 화면에서 바꾼 이름이 사이드바에도 그대로 반영된다.
export function menuKeyForGroup(groupKey: string): string { return `menu.user.grp.${groupKey}`; }
export function menuKeyForItem(it: SidebarItem): string { return `menu.user.${it.s}`; }
export function menuKeyForChild(ch: SidebarChild): string {
  const id = ch.cat || ch.tab || ch.path.replace(/^\//, '').replace(/\//g, '.');
  return `menu.user.child.${id}`;
}

// 일반 사용자 진단서 포탈의 기본 배치 겸 "선택 가능한 페이지" 카탈로그.
// userMenuLayoutService가 저장한 배치가 없을 때의 폴백이자, 메뉴 배치 관리 화면에서
// 아직 배치에 없는 페이지 목록을 계산하는 기준(=App.tsx에 등록된 사용자 포탈 라우트 전체)이다.
export const USER_MENU_CATALOG: SidebarEntry[] = [
  { s: 'home', ico: '🏠', label: '홈 (종합 현황)', path: '/' },
  { s: 'calendar', ico: '📅', label: '캘린더', path: '/calendar' },
  { s: 'organization', ico: '🌳', label: '조직도', path: '/organization' },
  { grp: '게시판' },
  { s: 'notice', ico: '📢', label: '공지사항', path: '/notice' },
  { grp: '진 단' },
  { s: 'diag', ico: '🩺', label: '교회 진단서', path: '/diag', tag: '핵심' },
  { s: 'inspect', ico: '🚨', label: '점검 (양·질)', path: '/inspect' },
  { s: 'funnel', ico: '🚦', label: '관문별 통과율', path: '/funnel' },
  { grp: '신앙 프로세스' },
  {
    s: 'p1', ico: '①', label: '전도·가개강', path: '/evangelism', children: [
      { cat: 'p1_check', label: '①-1. 교회별 데이터 확인', path: '/evangelism/check' },
      { cat: 'p1_agg', label: '①-2. 주간보고', path: '/evangelism/aggregate' },
      { cat: 'p1_plan', label: '①-3. 계획', path: '/evangelism/plan' },
      { cat: 'p1_monthly', label: '①-4. 월간보고', path: '/evangelism/monthly' },
      { cat: 'p1_report', label: '①-5. 월말보고서 출력', path: '/evangelism/report' },
    ],
  },
  { s: 'p2', ico: '②', label: '센터', path: '/center' },
  {
    s: 'p3', ico: '③', label: '내무', path: '/membership', children: [
      { cat: 'p3_check', label: '③-1. 교회별 데이터 확인', path: '/membership/check' },
      { cat: 'p3_input', label: '③-2. 월별 데이터 입력', path: '/membership/input' },
    ],
  },
  { s: 'p4', ico: '④', label: '예배', path: '/worship' },
  { grp: '업 무' },
  {
    s: 'business', ico: '💼', label: '재정', path: '/business', children: [
      { tab: 'ledger', label: '원장헌금', path: '/business/ledger' },
      { tab: 'ledger_archive', label: 'ㄴ 품의서 및 회의록', path: '/business/ledger/archive' },
      { tab: 'ledger_report', label: 'ㄴ 품의서 및 회의록 작성', path: '/business/ledger/report' },
      { tab: 'fruit', label: '열매헌금', path: '/business/fruit' },
      { tab: 'fruit_archive', label: 'ㄴ 품의서 및 회의록', path: '/business/fruit/archive' },
      { tab: 'transport', label: '교통비', path: '/business/transport' },
      { tab: 'transport_archive', label: 'ㄴ 품의서 및 회의록', path: '/business/transport/archive' },
      { tab: 'mission', label: '선교비', path: '/business/mission' },
      { tab: 'mission_archive', label: 'ㄴ 품의서 및 회의록', path: '/business/mission/archive' },
    ],
  },
  // 보기 그룹: 지도·지구본 / 추이·비교는 추후 구현 예정이라 당분간 숨김 처리 (코드는 재사용 대비 보존)
  // { grp: '보 기' },
  // { s: 'map', ico: '🌍', label: '지도·지구본', path: '/map' },
  // { s: 'trend', ico: '📈', label: '추이·비교', path: '/trend' },
  { grp: '보 고' },
  {
    s: 'weekly_report_sub', ico: '🗓️', label: '주간보고', path: '/weekly-report', children: [
      { cat: 'weekly_report_input', label: '보고입력', path: '/weekly-report/input' },
    ],
  },
  { grp: '결 재' },
  { s: 'approvals/pending', ico: '📥', label: '결재 대기중인 건', path: '/approvals/pending' },
  { s: 'approvals/completed', ico: '📋', label: '결재 완료 건', path: '/approvals/completed' },
  { s: 'approvals/submitted', ico: '📝', label: '결재 상신 내역', path: '/approvals/submitted' },
];
