import os
import matplotlib.pyplot as plt
import matplotlib.patches as patches

plt.rcParams['font.family'] = 'Malgun Gothic'
plt.rcParams['axes.unicode_minus'] = False

out_dir = os.path.join('e:/poject/OverseasWeb', 'docs_output', 'images')
os.makedirs(out_dir, exist_ok=True)

def save_fig(fig, filename):
    filepath = os.path.join(out_dir, filename)
    fig.savefig(filepath, dpi=300, bbox_inches='tight', facecolor='#F8FAFC')
    plt.close(fig)
    print(f'Generated: {filepath}')

def make_login_flow():
    fig, ax = plt.subplots(figsize=(10, 4.2))
    ax.set_facecolor('#F8FAFC')
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 42)
    ax.axis('off')

    ax.text(50, 38, '【 최초 로그인 & 보안 인증 절차 】', fontsize=15, fontweight='bold', ha='center', color='#0F172A')

    steps = [
        ('STEP 1', '포털 접속 및 로그인', '• 발급된 아이디 / 초기 비번 입력\n• 텔레그램 연동 계정 여부 확인', '#3B82F6', 6),
        ('STEP 2', '2차 보안 OTP 인증', '• 텔레그램으로 6자리 인증번호 수신\n• 3분 이내 인증번호 입력', '#10B981', 38),
        ('STEP 3', '비밀번호 즉시 변경', '• [초기 계정 로그인] 팝업 발생\n• 프로필 페이지에서 새 비밀번호 설정', '#8B5CF6', 70),
    ]

    for title, header, desc, color, x in steps:
        box = patches.FancyBboxPatch((x, 6), 24, 26, boxstyle='round,pad=0.8,rounding_size=2',
                                     edgecolor=color, facecolor='white', linewidth=2)
        ax.add_patch(box)
        tag = patches.FancyBboxPatch((x+2, 27), 20, 4.5, boxstyle='round,pad=0.3,rounding_size=1',
                                     edgecolor='none', facecolor=color)
        ax.add_patch(tag)
        ax.text(x+12, 29.2, title, fontsize=10, fontweight='bold', ha='center', color='white')
        ax.text(x+12, 23, header, fontsize=11, fontweight='bold', ha='center', color='#1E293B')
        ax.text(x+2, 16, desc, fontsize=9.5, color='#475569', va='top', linespacing=1.4)

    for arrow_x in [31.5, 63.5]:
        ax.annotate('', xy=(arrow_x + 5, 19), xytext=(arrow_x, 19),
                    arrowprops=dict(facecolor='#94A3B8', edgecolor='#94A3B8', width=2.5, headwidth=8))

    save_fig(fig, 'img_01_login_flow.png')

def make_post_login_checklist():
    fig, ax = plt.subplots(figsize=(10, 4.5))
    ax.set_facecolor('#F8FAFC')
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 45)
    ax.axis('off')

    ax.text(50, 41, '【 로그인 직후 필수 설정 및 점검 사항 】', fontsize=15, fontweight='bold', ha='center', color='#0F172A')

    cards = [
        ('1. 비밀번호 교체', '기본/초기 비밀번호를 사용 중인 경우,\n보안을 위해 영문/숫자 조합 4자리 이상\n새로운 암호로 즉시 변경합니다.', '#EF4444', 4, 21),
        ('2. 계정 정보 & 권한 확인', '본인의 소속 교회/지파 및 담당 국가 범위\n(접근 권한)가 정상 배정되어 있는지\n프로필 정보 카드에서 확인합니다.', '#F59E0B', 52, 21),
        ('3. 텔레그램 연동(OTP)', '2차 인증 번호 및 포털 주요 알림을\n실시간으로 수신할 수 있도록 텔레그램 봇과\n계정을 1회 연동합니다.', '#10B981', 4, 3),
        ('4. 메뉴 및 포털 탐색', '상단 네비게이션을 통해 주간보고,\n전도관리, 교회별 데이터 진단 등\n주요 기능 위치를 숙지합니다.', '#3B82F6', 52, 3),
    ]

    for title, desc, color, x, y in cards:
        box = patches.FancyBboxPatch((x, y), 44, 15, boxstyle='round,pad=0.6,rounding_size=1.5',
                                     edgecolor=color, facecolor='white', linewidth=1.8)
        ax.add_patch(box)
        bar = patches.Rectangle((x, y+1.5), 2.5, 12, facecolor=color, edgecolor='none')
        ax.add_patch(bar)
        ax.text(x+5, y+10.5, title, fontsize=11, fontweight='bold', color='#0F172A')
        ax.text(x+5, y+7.5, desc, fontsize=9.2, color='#475569', va='top', linespacing=1.35)

    save_fig(fig, 'img_02_post_login.png')

def make_otp_setup():
    fig, ax = plt.subplots(figsize=(10, 4.4))
    ax.set_facecolor('#F8FAFC')
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 44)
    ax.axis('off')

    ax.text(50, 40, '【 텔레그램 2차 인증(OTP) 초간편 연동 가이드 】', fontsize=15, fontweight='bold', ha='center', color='#0F172A')

    steps = [
        ('STEP 1', '포털에 Telegram ID 등록', '① [회원 정보] 페이지 이동\n② Telegram ID (@사용자명) 입력\n③ [연동 정보 저장] 클릭', '#2563EB', 5),
        ('STEP 2', '텔레그램 봇 검색 & 시작', '① 텔레그램에서 전용 봇 검색\n② 대화방 진입 후 [시작(/start)] 클릭\n③ Chat ID가 포털에 자동 등록됨', '#059669', 37),
        ('STEP 3', '연동 테스트 & OTP 활용', '① 포털에서 [테스트 발송] 클릭\n② 텔레그램 메시지 수신 확인\n③ 로그인 시 6자리 OTP로 즉시 로그인', '#7C3AED', 69),
    ]

    for title, header, desc, color, x in steps:
        box = patches.FancyBboxPatch((x, 5), 26, 28, boxstyle='round,pad=0.8,rounding_size=2',
                                     edgecolor=color, facecolor='white', linewidth=2)
        ax.add_patch(box)
        tag = patches.FancyBboxPatch((x+3, 28), 20, 4, boxstyle='round,pad=0.3,rounding_size=1',
                                     edgecolor='none', facecolor=color)
        ax.add_patch(tag)
        ax.text(x+13, 30, title, fontsize=10, fontweight='bold', ha='center', color='white')
        ax.text(x+13, 24, header, fontsize=10.5, fontweight='bold', ha='center', color='#1E293B')
        ax.text(x+2.5, 18.5, desc, fontsize=9.2, color='#475569', va='top', linespacing=1.4)

    for arrow_x in [32, 64]:
        ax.annotate('', xy=(arrow_x + 4, 19), xytext=(arrow_x, 19),
                    arrowprops=dict(facecolor='#64748B', edgecolor='#64748B', width=2.2, headwidth=7))

    save_fig(fig, 'img_03_otp_setup.png')

def make_weekly_report_guide():
    fig, ax = plt.subplots(figsize=(10, 4.6))
    ax.set_facecolor('#F8FAFC')
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 46)
    ax.axis('off')

    ax.text(50, 42, '【 전도담당자 주간보고 작성 및 제출 화면 구성 】', fontsize=15, fontweight='bold', ha='center', color='#0F172A')

    filter_bar = patches.FancyBboxPatch((4, 31), 92, 7.5, boxstyle='round,pad=0.5,rounding_size=1.5',
                                        edgecolor='#CBD5E1', facecolor='#FFFFFF', linewidth=1.5)
    ax.add_patch(filter_bar)
    ax.text(7, 34.8, '① 교회 및 주차 선택', fontsize=10.5, fontweight='bold', color='#1E293B')
    ax.text(32, 34.8, '[담당 교회 선택 ▼]   [연도: 2026년 ▼]   [월/주차: 8월 3주차 (8/17~8/23) ▼]', fontsize=9.5, color='#2563EB', fontweight='bold')

    grid_box = patches.FancyBboxPatch((4, 4), 54, 24.5, boxstyle='round,pad=0.6,rounding_size=1.5',
                                      edgecolor='#3B82F6', facecolor='#FFFFFF', linewidth=1.5)
    ax.add_patch(grid_box)
    ax.text(7, 25, '② 부서별 전도 지표 입력 테이블', fontsize=10.5, fontweight='bold', color='#1E40AF')
    
    table_desc = (
        '• 대상 부서 : 교역자, 자문회, 장년회, 부녀회, 청년회\n'
        '• 입력 지표 : [전도재적], [찾기/탈락], [복음방/탈락],\n'
        '             [가개강/탈락], [시온입교], [수료] 등\n'
        '• 셀 클릭 시 즉시 수치 입력 가능 / 부서 합계 자동 연산'
    )
    ax.text(7, 21, table_desc, fontsize=9.2, color='#334155', va='top', linespacing=1.35)

    submit_box = patches.FancyBboxPatch((61, 4), 35, 24.5, boxstyle='round,pad=0.6,rounding_size=1.5',
                                        edgecolor='#10B981', facecolor='#FFFFFF', linewidth=1.5)
    ax.add_patch(submit_box)
    ax.text(64, 25, '③ 증빙 첨부 및 최종 제출', fontsize=10.5, fontweight='bold', color='#065F46')
    
    submit_desc = (
        '• 현장 전도 사진 / 사역 활동 사진 첨부\n'
        '• 주간 특이사항 및 기도제목 입력\n'
        '• [임시저장] : 작성 중 언제든 저장\n'
        '• [최종제출] : 주간보고 마감 완료\n'
        '  (제출 후 제출완료 뱃지 표시)'
    )
    ax.text(64, 21, submit_desc, fontsize=9.2, color='#334155', va='top', linespacing=1.35)

    save_fig(fig, 'img_04_weekly_report.png')

def make_plan_guide():
    fig, ax = plt.subplots(figsize=(10, 4.4))
    ax.set_facecolor('#F8FAFC')
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 44)
    ax.axis('off')

    ax.text(50, 40, '【 전도 계획 수립 및 관리 프로세스 】', fontsize=15, fontweight='bold', ha='center', color='#0F172A')

    steps = [
        ('1. 계획 탭 진입', '• [전도관리] 메뉴 접속\n• [전도 계획] 서브탭 선택\n• 담당 교회 선택', '#3B82F6', 4),
        ('2. 수정 모드 활성화', '• 우측 상단 [계획 수정] 클릭\n• 새 블록 추가 버튼 활성화\n• 기존 블록 편집 가능 상태 전환', '#F59E0B', 36),
        ('3. 블록 작성 & 저장', '• [+ 새 계획 블록 추가] 클릭\n• 전략 제목 및 세부 실행안 작성\n• [계획 저장]으로 최종 반영', '#10B981', 68),
    ]

    for title, desc, color, x in steps:
        box = patches.FancyBboxPatch((x, 5), 28, 28, boxstyle='round,pad=0.8,rounding_size=2',
                                     edgecolor=color, facecolor='white', linewidth=2)
        ax.add_patch(box)
        tag = patches.FancyBboxPatch((x+2, 28), 24, 4, boxstyle='round,pad=0.3,rounding_size=1',
                                     edgecolor='none', facecolor=color)
        ax.add_patch(tag)
        ax.text(x+14, 30, title, fontsize=10.5, fontweight='bold', ha='center', color='white')
        ax.text(x+2.5, 23, desc, fontsize=9.3, color='#334155', va='top', linespacing=1.4)

    for arrow_x in [32.5, 64.5]:
        ax.annotate('', xy=(arrow_x + 3, 19), xytext=(arrow_x, 19),
                    arrowprops=dict(facecolor='#94A3B8', edgecolor='#94A3B8', width=2.2, headwidth=7))

    save_fig(fig, 'img_05_plan_setup.png')

def make_monthly_report_guide():
    fig, ax = plt.subplots(figsize=(10, 4.6))
    ax.set_facecolor('#F8FAFC')
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 46)
    ax.axis('off')

    ax.text(50, 42, '【 전도 월간보고 작성 및 실적 관리 구조 】', fontsize=15, fontweight='bold', ha='center', color='#0F172A')

    sections = [
        ('① 대상 월 선택', '연도 및 보고 대상 월(1월~12월)을\n선택합니다. 당월 데이터는 상시 입력 가능하며,\n과거 월은 마감 상태로 조회됩니다.', '#6366F1', 4, 21),
        ('② 핵심 지표 입력', '부서별 [활동 인원수]와 [전도 사역자(인도자수)]를\n기입합니다. 전도재적 대비 활동률(%) 및\n전년 동월 대비 증감율이 자동 산출됩니다.', '#0EA5E9', 52, 21),
        ('③ 과거 데이터 수정요청', '마감된 지난 달 데이터의 수정이 필요한 경우,\n[수정 권한 요청] 모달에서 사유를 작성하여\n관리자에게 승인을 요청할 수 있습니다.', '#F43F5E', 4, 3),
        ('④ 월간보고서 출력/인쇄', '[월간보고서 출력] 탭으로 이동하여\n공식 양식으로 렌더링된 보고서를 확인하고,\nPDF 내보내기 또는 즉시 인쇄를 진행합니다.', '#10B981', 52, 3),
    ]

    for title, desc, color, x, y in sections:
        box = patches.FancyBboxPatch((x, y), 44, 15, boxstyle='round,pad=0.6,rounding_size=1.5',
                                     edgecolor=color, facecolor='white', linewidth=1.8)
        ax.add_patch(box)
        bar = patches.Rectangle((x, y+1.5), 2.5, 12, facecolor=color, edgecolor='none')
        ax.add_patch(bar)
        ax.text(x+5, y+10.5, title, fontsize=11, fontweight='bold', color='#0F172A')
        ax.text(x+5, y+7.5, desc, fontsize=9.2, color='#475569', va='top', linespacing=1.35)

    save_fig(fig, 'img_06_monthly_report.png')

def make_church_data_guide():
    fig, ax = plt.subplots(figsize=(10, 4.6))
    ax.set_facecolor('#F8FAFC')
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 46)
    ax.axis('off')

    ax.text(50, 42, '【 교회별 데이터 확인 및 다각도 분석 도구 】', fontsize=15, fontweight='bold', ha='center', color='#0F172A')

    tools = [
        ('1. 종합 진단 대시보드', '• 전 세계 교회 KPI 현황 요약\n• 전체 재적 및 출석/전도 달성률\n• 글로벌 지도 및 3D 지구본 뷰', '#2563EB', 4),
        ('2. 전도 퍼널(Funnel) 분석', '• 전도 전 과정 단계별 이탈/전환율\n• [찾기 → 복음방 → 가개강 → 입교]\n• 단계별 병목 구간 신속 진단', '#D97706', 36),
        ('3. 다중 비교 추이 그래프', '• 교회별/기간별 비교 차트 구성\n• 막대/선/도넛/레이더 차트 지원\n• 주차별 전도 성장 추세 시각화', '#7C3AED', 68),
    ]

    for title, desc, color, x in tools:
        box = patches.FancyBboxPatch((x, 5), 28, 28, boxstyle='round,pad=0.8,rounding_size=2',
                                     edgecolor=color, facecolor='white', linewidth=2)
        ax.add_patch(box)
        tag = patches.FancyBboxPatch((x+2, 28), 24, 4, boxstyle='round,pad=0.3,rounding_size=1',
                                     edgecolor='none', facecolor=color)
        ax.add_patch(tag)
        ax.text(x+14, 30, title, fontsize=10.5, fontweight='bold', ha='center', color='white')
        ax.text(x+2.5, 23, desc, fontsize=9.3, color='#334155', va='top', linespacing=1.4)

    save_fig(fig, 'img_07_church_data.png')

if __name__ == '__main__':
    make_login_flow()
    make_post_login_checklist()
    make_otp_setup()
    make_weekly_report_guide()
    make_plan_guide()
    make_monthly_report_guide()
    make_church_data_guide()
    print('All illustrations successfully generated!')
