import { FormSchema } from '../services/weeklyReportService';

// ─── 기본 초기 스키마 (양식.pptx 2·3번 슬라이드 표 구조를 그대로 재현) ──────────
// 관리자가 매주 컬럼/그룹 라벨(예: "8월 목표" → "9월 목표")을 자유롭게 바꿀 수 있도록
// grouped_table의 leafColumns는 admin 화면에서 라벨/그룹라벨 단위로 편집 가능하다.
export const DEFAULT_SCHEMA: FormSchema = {
  pages: [
    {
      pageId: 'page1',
      title: '기본 정보',
      fields: [
        { fieldId: 'church_name', label: '교회명', type: 'church_select', required: true },
        { fieldId: 'report_date', label: '보고일', type: 'date', required: false },
      ]
    },
    {
      pageId: 'page2',
      title: '각종 취합 내용',
      sections: [
        {
          sectionId: 'worship_attendance',
          title: '1. 예배출결 현황',
          type: 'grouped_table',
          leafColumns: [
            { key: 'total_members', label: '총재적' },
            { key: 'eligible_members', label: '출결재적(입교이상)' },
            { key: 'offline_pct', label: '오프라인(%)', groupLabel: '출석자수' },
            { key: 'online_pct', label: '온라인(%)', groupLabel: '출석자수' },
            { key: 'total_attendance', label: '전체 출석수' },
            { key: 'total_attendance_rate', label: '전체 출석률(%)' },
            { key: 'total_rate_change', label: '전체 출석률 변동(%)' },
            { key: 'offline_rate_change', label: '전주 대비 대면출석률 변동(%)' },
          ]
        },
        {
          sectionId: 'mission_center',
          title: '2. 선교센터 현황',
          type: 'grouped_table',
          leafColumns: [
            { key: 'total_registered', label: '총 등록' },
            { key: 'current_students', label: '현 수강수' },
            { key: 'absences', label: '결석수' },
            { key: 'attendance', label: '출석수' },
            { key: 'attendance_rate', label: '출석률(%)' },
            { key: 'month_end_total', label: '7월말 총재적' },
            { key: 'month_cumulative', label: '(1~7월) 가개강 합계' },
            { key: 'month_end_rate', label: '7월말 총재적 대비 가개강률(%)' },
          ]
        },
        {
          sectionId: 'evangelism_status',
          title: '3. 전도 현황',
          type: 'grouped_table',
          leafColumns: [
            { key: 'prev_year_total', label: '전도재적(전년 12월)' },
            { key: 'pre_course_target', label: '가개강목표', groupLabel: '8월 목표' },
            { key: 'current_gospel_room', label: '현재 복음방수', groupLabel: '8월 목표' },
            { key: 'registration_target', label: '등록률목표', groupLabel: '8월 목표' },
            { key: 'completion_target', label: '종강률목표', groupLabel: '8월 목표' },
            { key: 'month_growth_rate', label: '8월 재적성장률(%)' },
            { key: 'cumulative_growth_rate', label: '누적 재적성장률(%)' },
          ]
        }
      ]
    },
    {
      pageId: 'page3',
      title: '주간 교육 및 특이사항',
      sections: [
        {
          sectionId: 'education',
          title: '4. 주간 교육 현황',
          type: 'dynamic_table',
          columns: ['교육 일시', '교육자', '교육 내용', '대상자', '참여수'],
          allowAddRow: true
        },
        {
          sectionId: 'special_notes',
          title: '5. 주간 특이사항',
          type: 'notes_board',
          maxCards: 10
        }
      ]
    }
  ]
};
