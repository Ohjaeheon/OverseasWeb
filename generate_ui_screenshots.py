# -*- coding: utf-8 -*-
import os
import matplotlib.pyplot as plt
import matplotlib.patches as patches

# 한글 폰트 설정
plt.rcParams['font.family'] = 'Malgun Gothic'
plt.rcParams['axes.unicode_minus'] = False

out_dir = os.path.join(os.path.dirname(__file__), 'docs_output', 'images')
os.makedirs(out_dir, exist_ok=True)

def save_screen(fig, filename):
    filepath = os.path.join(out_dir, filename)
    fig.savefig(filepath, dpi=220, bbox_inches='tight', facecolor='#0F172A')
    plt.close(fig)
    print(f"Generated UI Screenshot: {filepath}")

def draw_browser_frame(ax, url_text, active_menu="홈 / 진단"):
    # 브라우저 외부 창 배경
    bg_window = patches.FancyBboxPatch((0, 0), 120, 75, boxstyle="round,pad=0,rounding_size=1.2",
                                       facecolor='#1E293B', edgecolor='#334155', linewidth=1.5)
    ax.add_patch(bg_window)

    # 윈도우 상단 컨트롤 버튼 (빨강, 노랑, 초록)
    for i, col in enumerate(['#EF4444', '#F59E0B', '#10B981']):
        c = patches.Circle((3 + i * 2.2, 72.2), 0.7, facecolor=col, edgecolor='none')
        ax.add_patch(c)

    # 탭바
    tab = patches.FancyBboxPatch((11, 70.2), 28, 4.2, boxstyle="round,pad=0.2,rounding_size=0.8",
                                 facecolor='#F8FAFC', edgecolor='none')
    ax.add_patch(tab)
    ax.text(13, 71.8, "해외선교부 포털 시스템", fontsize=9, fontweight='bold', color='#0F172A')

    # 주소창 (URL Bar)
    url_bar = patches.FancyBboxPatch((1, 65.5), 118, 4.2, boxstyle="round,pad=0.2,rounding_size=0.8",
                                    facecolor='#0F172A', edgecolor='#334155', linewidth=1)
    ax.add_patch(url_bar)
    ax.text(3, 67.3, "[보안연결] " + url_text, fontsize=8.5, color='#94A3B8')

    # 웹페이지 메인 캔버스
    web_canvas = patches.Rectangle((1, 1), 118, 64, facecolor='#F8FAFC', edgecolor='none')
    ax.add_patch(web_canvas)

    # 포털 탑 네비게이션 바
    nav_bar = patches.Rectangle((1, 59), 118, 6, facecolor='#FFFFFF', edgecolor='#E2E8F0', linewidth=1)
    ax.add_patch(nav_bar)

    # 로고
    ax.text(3.5, 61.8, "OVERSEAS PORTAL", fontsize=11, fontweight='bold', color='#1E3A8A')

    # 메뉴 항목들
    menus = ["홈 / 진단", "주간보고", "전도관리", "결재 / 업무", "회원정보"]
    for i, m in enumerate(menus):
        mx = 26 + i * 14
        is_active = (m == active_menu)
        if is_active:
            m_bg = patches.FancyBboxPatch((mx - 1.5, 60.2), 12, 3.8, boxstyle="round,pad=0.2,rounding_size=0.6",
                                          facecolor='#EFF6FF', edgecolor='#3B82F6', linewidth=1)
            ax.add_patch(m_bg)
            ax.text(mx + 4.5, 61.8, m, fontsize=9.2, fontweight='bold', color='#2563EB', ha='center')
        else:
            ax.text(mx + 4.5, 61.8, m, fontsize=9.2, color='#475569', ha='center')

    # 우측 사용자 정보
    ax.text(105, 61.8, "김담당 [도쿄교회] | 로그아웃", fontsize=8.5, color='#64748B')

def draw_marker(ax, x, y, num_str, label_text, color='#EF4444', align='left'):
    # 번호 원형 마커
    circle = patches.Circle((x, y), 2.0, facecolor=color, edgecolor='#FFFFFF', linewidth=1.5, zorder=10)
    ax.add_patch(circle)
    ax.text(x, y - 0.4, num_str, fontsize=9.5, fontweight='bold', color='#FFFFFF', ha='center', va='center', zorder=11)
    
    # 텍스트 태그
    if align == 'left':
        box = patches.FancyBboxPatch((x + 2.8, y - 1.4), len(label_text) * 1.55 + 2.5, 2.9,
                                     boxstyle="round,pad=0.3,rounding_size=0.6",
                                     facecolor=color, edgecolor='none', zorder=10)
        ax.add_patch(box)
        ax.text(x + 3.8, y - 0.1, label_text, fontsize=8.5, fontweight='bold', color='#FFFFFF', va='center', zorder=11)
    elif align == 'right':
        box = patches.FancyBboxPatch((x - len(label_text) * 1.55 - 5.0, y - 1.4), len(label_text) * 1.55 + 2.5, 2.9,
                                     boxstyle="round,pad=0.3,rounding_size=0.6",
                                     facecolor=color, edgecolor='none', zorder=10)
        ax.add_patch(box)
        ax.text(x - 3.8, y - 0.1, label_text, fontsize=8.5, fontweight='bold', color='#FFFFFF', ha='right', va='center', zorder=11)

# -------------------------------------------------------------
# 화면 1: 최초 로그인 및 OTP 팝업 화면
# -------------------------------------------------------------
def make_screen_login():
    fig, ax = plt.subplots(figsize=(12, 7.5))
    ax.set_facecolor('#0F172A')
    ax.set_xlim(0, 120)
    ax.set_ylim(0, 75)
    ax.axis('off')

    draw_browser_frame(ax, "https://overseas.portal/login", active_menu="")

    # 로그인 카드 (중앙)
    card = patches.FancyBboxPatch((35, 10), 50, 44, boxstyle="round,pad=0.8,rounding_size=1.5",
                                 facecolor='#FFFFFF', edgecolor='#CBD5E1', linewidth=1.5)
    ax.add_patch(card)

    ax.text(60, 48, "해외선교부 포털 로그인", fontsize=15, fontweight='bold', ha='center', color='#0F172A')
    ax.text(60, 44.5, "사역자 아이디와 비밀번호를 입력해주세요.", fontsize=9, ha='center', color='#64748B')

    # 아이디 입력창
    ax.text(40, 40, "아이디 (사번 / 계정명)", fontsize=8.5, fontweight='bold', color='#334155')
    in_id = patches.FancyBboxPatch((40, 34.5), 40, 4.2, boxstyle="round,pad=0.2,rounding_size=0.6",
                                  facecolor='#F8FAFC', edgecolor='#94A3B8', linewidth=1)
    ax.add_patch(in_id)
    ax.text(42, 36.3, "missionary_tokyo", fontsize=9, color='#0F172A')

    # 비밀번호 입력창
    ax.text(40, 31, "비밀번호", fontsize=8.5, fontweight='bold', color='#334155')
    in_pw = patches.FancyBboxPatch((40, 25.5), 40, 4.2, boxstyle="round,pad=0.2,rounding_size=0.6",
                                  facecolor='#F8FAFC', edgecolor='#94A3B8', linewidth=1)
    ax.add_patch(in_pw)
    ax.text(42, 27.3, "••••••••••••", fontsize=11, color='#0F172A')

    # 로그인 버튼
    btn_login = patches.FancyBboxPatch((40, 18), 40, 5, boxstyle="round,pad=0.3,rounding_size=0.8",
                                       facecolor='#2563EB', edgecolor='none')
    ax.add_patch(btn_login)
    ax.text(60, 20.3, "로그인 (Login)", fontsize=11, fontweight='bold', color='#FFFFFF', ha='center')

    ax.text(60, 13.5, "※ 2차 인증(OTP) 설정 계정은 텔레그램으로 인증번호가 전송됩니다.", fontsize=8, ha='center', color='#2563EB')

    # 우측 OTP 팝업 오버레이
    otp_card = patches.FancyBboxPatch((72, 14), 44, 28, boxstyle="round,pad=0.8,rounding_size=1.5",
                                      facecolor='#FFFFFF', edgecolor='#2563EB', linewidth=2, zorder=5)
    ax.add_patch(otp_card)
    ax.text(94, 37.5, "[보안인증] 2차 OTP 번호 입력", fontsize=11, fontweight='bold', ha='center', color='#1E3A8A', zorder=6)
    ax.text(94, 34, "텔레그램으로 전송된 6자리를 입력하세요 (남은시간 02:45)", fontsize=7.8, ha='center', color='#64748B', zorder=6)

    # 6자리 입력칸
    for k in range(6):
        box_k = patches.Rectangle((77 + k * 5.6, 26), 4.6, 5.5, facecolor='#EFF6FF', edgecolor='#3B82F6', linewidth=1.5, zorder=6)
        ax.add_patch(box_k)
        val = ['5', '8', '2', '9', '1', '4'][k]
        ax.text(79.3 + k * 5.6, 28.5, val, fontsize=14, fontweight='bold', ha='center', color='#1E40AF', zorder=7)

    # 확인 버튼
    btn_otp = patches.FancyBboxPatch((77, 18), 34, 4.5, boxstyle="round,pad=0.3,rounding_size=0.6",
                                     facecolor='#10B981', edgecolor='none', zorder=6)
    ax.add_patch(btn_otp)
    ax.text(94, 20, "인증 완료 및 로그인", fontsize=9.5, fontweight='bold', color='#FFFFFF', ha='center', zorder=7)

    # 마커 표시
    draw_marker(ax, 38, 36.5, "1", "아이디/초기비밀번호 입력", color='#2563EB', align='right')
    draw_marker(ax, 38, 20.5, "2", "[로그인] 클릭", color='#2563EB', align='right')
    draw_marker(ax, 72, 29, "3", "텔레그램 수신 6자리 OTP 입력", color='#10B981', align='left')

    save_screen(fig, 'screen_01_login.png')

# -------------------------------------------------------------
# 화면 2: 로그인 후 프로필 & 비밀번호 변경 화면
# -------------------------------------------------------------
def make_screen_profile_password():
    fig, ax = plt.subplots(figsize=(12, 7.5))
    ax.set_facecolor('#0F172A')
    ax.set_xlim(0, 120)
    ax.set_ylim(0, 75)
    ax.axis('off')

    draw_browser_frame(ax, "https://overseas.portal/profile", active_menu="회원정보")

    ax.text(5, 54.5, "회원 정보 및 계정 보안 설정", fontsize=14, fontweight='bold', color='#0F172A')
    ax.text(5, 51.5, "본인의 기본 소속 정보와 접근 권한을 확인하고, 비밀번호를 변경합니다.", fontsize=8.8, color='#64748B')

    # 좌측: 기본 계정 정보 카드
    c1 = patches.FancyBboxPatch((5, 6), 52, 43, boxstyle="round,pad=0.8,rounding_size=1.2",
                               facecolor='#FFFFFF', edgecolor='#CBD5E1', linewidth=1.5)
    ax.add_patch(c1)
    ax.text(9, 44, "[기본 계정 정보]", fontsize=11, fontweight='bold', color='#0F172A')
    
    info_rows = [
        ("아이디", "missionary_tokyo"),
        ("성명 (실명)", "김담당"),
        ("소속 권한 그룹", "해외선교부 담당자 (ROLE_USER)"),
        ("데이터 접근 범위", "일본 / 도쿄교회, 오사카교회"),
        ("2차 OTP 설정", "보안 적용 계정 (OTP 필수)")
    ]
    for idx, (k, v) in enumerate(info_rows):
        yy = 38 - idx * 6
        ax.text(9, yy, k, fontsize=8.8, color='#64748B', fontweight='bold')
        ax.text(28, yy, v, fontsize=8.8, color='#1E293B', fontweight='bold')
        line = patches.Rectangle((9, yy - 2), 44, 0.4, facecolor='#F1F5F9', edgecolor='none')
        ax.add_patch(line)

    # 우측: 비밀번호 변경 카드
    c2 = patches.FancyBboxPatch((61, 6), 54, 43, boxstyle="round,pad=0.8,rounding_size=1.2",
                               facecolor='#FFFFFF', edgecolor='#CBD5E1', linewidth=1.5)
    ax.add_patch(c2)
    ax.text(65, 44, "[비밀번호 변경]", fontsize=11, fontweight='bold', color='#0F172A')

    # 경고 배너
    warn = patches.FancyBboxPatch((65, 36.5), 46, 5, boxstyle="round,pad=0.3,rounding_size=0.6",
                                 facecolor='#FEF2F2', edgecolor='#FCA5A5', linewidth=1)
    ax.add_patch(warn)
    ax.text(67, 39, "주의: 초기 임시 비밀번호 사용 중! 안전한 새 비밀번호로 즉시 교체하세요.", fontsize=8, color='#EF4444', fontweight='bold')

    inputs = [
        ("현재 비밀번호", "••••••••••••", 30),
        ("새 비밀번호", "••••••••••••", 23),
        ("새 비밀번호 확인", "••••••••••••", 16)
    ]
    for label, val, yy in inputs:
        ax.text(65, yy + 3.8, label, fontsize=8.2, fontweight='bold', color='#475569')
        inp = patches.FancyBboxPatch((65, yy), 46, 3.4, boxstyle="round,pad=0.2,rounding_size=0.6",
                                     facecolor='#F8FAFC', edgecolor='#CBD5E1', linewidth=1)
        ax.add_patch(inp)
        ax.text(67, yy + 1.5, val, fontsize=9, color='#0F172A')

    btn_pw = patches.FancyBboxPatch((65, 9.5), 46, 4.2, boxstyle="round,pad=0.3,rounding_size=0.6",
                                   facecolor='#4F46E5', edgecolor='none')
    ax.add_patch(btn_pw)
    ax.text(88, 11.4, "비밀번호 변경 완료", fontsize=9.5, fontweight='bold', color='#FFFFFF', ha='center')

    draw_marker(ax, 5, 26, "1", "소속 교회 및 배정 범위 점검", color='#3B82F6', align='left')
    draw_marker(ax, 61, 23, "2", "새 비밀번호 2회 입력", color='#EF4444', align='left')
    draw_marker(ax, 61, 11.5, "3", "[비밀번호 변경] 클릭", color='#10B981', align='left')

    save_screen(fig, 'screen_02_profile_password.png')

# -------------------------------------------------------------
# 화면 3: 텔레그램 연동 및 OTP 설정 화면
# -------------------------------------------------------------
def make_screen_otp_telegram():
    fig, ax = plt.subplots(figsize=(12, 7.5))
    ax.set_facecolor('#0F172A')
    ax.set_xlim(0, 120)
    ax.set_ylim(0, 75)
    ax.axis('off')

    draw_browser_frame(ax, "https://overseas.portal/profile#telegram", active_menu="회원정보")

    ax.text(5, 54.5, "텔레그램 연동 및 2단계 보안 OTP 설정", fontsize=14, fontweight='bold', color='#0F172A')
    ax.text(5, 51.5, "본인의 텔레그램 ID를 등록하고 봇과의 연동을 완료하여 2차 인증번호를 실시간 수신합니다.", fontsize=8.8, color='#64748B')

    c1 = patches.FancyBboxPatch((5, 6), 52, 43, boxstyle="round,pad=0.8,rounding_size=1.2",
                               facecolor='#FFFFFF', edgecolor='#CBD5E1', linewidth=1.5)
    ax.add_patch(c1)
    ax.text(9, 44, "[텔레그램 연동 설정]", fontsize=11, fontweight='bold', color='#0F172A')

    ax.text(9, 38, "Telegram ID (@사용자명)", fontsize=8.5, fontweight='bold', color='#475569')
    in_tgid = patches.FancyBboxPatch((9, 32.5), 44, 4, boxstyle="round,pad=0.2,rounding_size=0.6",
                                    facecolor='#F8FAFC', edgecolor='#3B82F6', linewidth=1.5)
    ax.add_patch(in_tgid)
    ax.text(11, 34.3, "@missionary_tokyo", fontsize=9.2, color='#2563EB', fontweight='bold')

    ax.text(9, 27, "Telegram Chat ID (봇 대화 시 자동 연동)", fontsize=8.5, fontweight='bold', color='#475569')
    in_chatid = patches.FancyBboxPatch((9, 21.5), 44, 4, boxstyle="round,pad=0.2,rounding_size=0.6",
                                      facecolor='#F1F5F9', edgecolor='#CBD5E1', linewidth=1)
    ax.add_patch(in_chatid)
    ax.text(11, 23.3, "789123456 (연동 완료됨)", fontsize=9, color='#059669', fontweight='bold')

    btn_save = patches.FancyBboxPatch((9, 13), 44, 4.5, boxstyle="round,pad=0.3,rounding_size=0.6",
                                     facecolor='#2563EB', edgecolor='none')
    ax.add_patch(btn_save)
    ax.text(31, 15, "연동 정보 저장", fontsize=9.5, fontweight='bold', color='#FFFFFF', ha='center')

    c2 = patches.FancyBboxPatch((61, 6), 54, 43, boxstyle="round,pad=0.8,rounding_size=1.2",
                               facecolor='#FFFFFF', edgecolor='#CBD5E1', linewidth=1.5)
    ax.add_patch(c2)
    ax.text(65, 44, "[연동 테스트 및 텔레그램 봇]", fontsize=11, fontweight='bold', color='#0F172A')

    phone_box = patches.FancyBboxPatch((65, 17), 46, 24, boxstyle="round,pad=0.5,rounding_size=1",
                                       facecolor='#242F3D', edgecolor='#17212B', linewidth=1)
    ax.add_patch(phone_box)
    ax.text(67, 38.5, "[Bot] OverseasPortalBot", fontsize=9, fontweight='bold', color='#FFFFFF')
    
    msg1 = patches.FancyBboxPatch((67, 30), 40, 6, boxstyle="round,pad=0.3,rounding_size=0.6",
                                  facecolor='#182533', edgecolor='none')
    ax.add_patch(msg1)
    ax.text(68.5, 33.5, "사용자(@missionary_tokyo) 연동 성공!\nChat ID: 789123456", fontsize=7.8, color='#E2E8F0')

    msg2 = patches.FancyBboxPatch((67, 20), 40, 7.5, boxstyle="round,pad=0.3,rounding_size=0.6",
                                  facecolor='#2B5278', edgecolor='none')
    ax.add_patch(msg2)
    ax.text(68.5, 24.5, "[로그인 2차 인증번호]\nOTP 번호: 582914\n(3분 이내에 입력하세요)", fontsize=7.8, color='#FFFFFF', fontweight='bold')

    btn_test = patches.FancyBboxPatch((65, 9.5), 46, 4.5, boxstyle="round,pad=0.3,rounding_size=0.6",
                                     facecolor='#10B981', edgecolor='none')
    ax.add_patch(btn_test)
    ax.text(88, 11.5, "테스트 메시지 발송", fontsize=9.5, fontweight='bold', color='#FFFFFF', ha='center')

    draw_marker(ax, 5, 34.5, "1", "Telegram ID(@아이디) 입력 & 저장", color='#2563EB', align='left')
    draw_marker(ax, 61, 38.5, "2", "봇 검색 후 /start 클릭 (자동연동)", color='#0EA5E9', align='left')
    draw_marker(ax, 61, 11.5, "3", "[테스트 발송] 클릭 후 OTP 확인", color='#10B981', align='left')

    save_screen(fig, 'screen_03_otp_telegram.png')

# -------------------------------------------------------------
# 화면 4: 전도담당자 주간보고 작성 화면
# -------------------------------------------------------------
def make_screen_weekly_report():
    fig, ax = plt.subplots(figsize=(12, 7.5))
    ax.set_facecolor('#0F172A')
    ax.set_xlim(0, 120)
    ax.set_ylim(0, 75)
    ax.axis('off')

    draw_browser_frame(ax, "https://overseas.portal/weekly-report", active_menu="주간보고")

    fbar = patches.FancyBboxPatch((5, 48), 110, 6.5, boxstyle="round,pad=0.4,rounding_size=0.8",
                                 facecolor='#FFFFFF', edgecolor='#CBD5E1', linewidth=1.2)
    ax.add_patch(fbar)
    
    ax.text(8, 51.5, "교회 선택 :", fontsize=8.8, fontweight='bold', color='#475569')
    c_sel = patches.FancyBboxPatch((16, 49.5), 18, 3.5, boxstyle="round,pad=0.2,rounding_size=0.4",
                                   facecolor='#EFF6FF', edgecolor='#3B82F6', linewidth=1)
    ax.add_patch(c_sel)
    ax.text(18, 51.2, "도쿄교회 ▼", fontsize=8.8, fontweight='bold', color='#2563EB')

    ax.text(38, 51.5, "보고 주차 :", fontsize=8.8, fontweight='bold', color='#475569')
    w_sel = patches.FancyBboxPatch((46, 32), 32, 3.5, boxstyle="round,pad=0.2,rounding_size=0.4",
                                   facecolor='#F8FAFC', edgecolor='#94A3B8', linewidth=1)
    ax.add_patch(w_sel)
    ax.text(48, 51.2, "2026년 8월 3주차 (8/17~8/23) ▼", fontsize=8.5, color='#0F172A')

    badge = patches.FancyBboxPatch((82, 49.5), 16, 3.5, boxstyle="round,pad=0.2,rounding_size=0.4",
                                   facecolor='#ECFDF5', edgecolor='#10B981', linewidth=1)
    ax.add_patch(badge)
    ax.text(90, 51.2, "작성 중 (미제출)", fontsize=8, fontweight='bold', color='#059669', ha='center')

    tbl_card = patches.FancyBboxPatch((5, 6), 72, 40, boxstyle="round,pad=0.6,rounding_size=1",
                                     facecolor='#FFFFFF', edgecolor='#CBD5E1', linewidth=1.2)
    ax.add_patch(tbl_card)
    ax.text(8, 42.5, "[5대 부서별 전도 지표 입력표]", fontsize=10.5, fontweight='bold', color='#0F172A')

    headers = ["구분", "전도재적", "찾기", "탈", "복음방", "탈", "가개강", "탈", "입교"]
    widths = [10, 8, 7, 6, 7, 6, 7, 6, 7]
    hx = 8
    for h, w in zip(headers, widths):
        h_box = patches.Rectangle((hx, 37.5), w, 3.2, facecolor='#F1F5F9', edgecolor='#CBD5E1', linewidth=0.8)
        ax.add_patch(h_box)
        ax.text(hx + w/2, 39, h, fontsize=7.8, fontweight='bold', ha='center', color='#334155')
        hx += w

    rows = [
        ("교역자", "12", "5", "0", "4", "1", "3", "0", "2"),
        ("자문회", "18", "3", "1", "2", "0", "1", "0", "1"),
        ("장년회", "45", "14", "2", "10", "2", "6", "1", "4"),
        ("부녀회", "82", "38", "4", "28", "5", "18", "3", "12"),
        ("청년회", "105", "62", "7", "45", "8", "32", "4", "24"),
        ("합계", "262", "122", "14", "89", "16", "60", "8", "43")
    ]
    for r_idx, r_data in enumerate(rows):
        ry = 34.3 - r_idx * 4.2
        rx = 8
        is_total = (r_idx == len(rows) - 1)
        row_bg = '#EFF6FF' if is_total else ('#FFFFFF' if r_idx % 2 == 0 else '#F8FAFC')
        
        for c_idx, (val, w) in enumerate(zip(r_data, widths)):
            c_box = patches.Rectangle((rx, ry), w, 3.5, facecolor=row_bg, edgecolor='#E2E8F0', linewidth=0.6)
            ax.add_patch(c_box)
            font_w = 'bold' if (is_total or c_idx == 0) else 'normal'
            font_c = '#1E40AF' if is_total else '#0F172A'
            ax.text(rx + w/2, ry + 1.5, val, fontsize=7.8, fontweight=font_w, ha='center', color=font_c)
            rx += w

    side_card = patches.FancyBboxPatch((80, 6), 35, 40, boxstyle="round,pad=0.6,rounding_size=1",
                                       facecolor='#FFFFFF', edgecolor='#CBD5E1', linewidth=1.2)
    ax.add_patch(side_card)
    ax.text(83, 42.5, "[현장 사진 & 최종 제출]", fontsize=10.5, fontweight='bold', color='#0F172A')

    photo_box = patches.FancyBboxPatch((83, 27), 29, 13, boxstyle="round,pad=0.4,rounding_size=0.6",
                                       facecolor='#F8FAFC', edgecolor='#94A3B8', linestyle='--', linewidth=1.2)
    ax.add_patch(photo_box)
    ax.text(97.5, 34, "[사진 첨부 영역]\n클릭하여 이미지 파일 업로드", fontsize=8, ha='center', color='#64748B')
    ax.text(97.5, 29, "첨부됨: weekly_report_01.jpg", fontsize=7.5, color='#2563EB', ha='center', fontweight='bold')

    ax.text(83, 24.5, "주간 특이사항 / 기도제목", fontsize=8, fontweight='bold', color='#475569')
    ta = patches.FancyBboxPatch((83, 16.5), 29, 6.5, boxstyle="round,pad=0.2,rounding_size=0.4",
                                facecolor='#F8FAFC', edgecolor='#CBD5E1', linewidth=1)
    ax.add_patch(ta)
    ax.text(85, 20.5, "청년회 대학가 전도 축제 성료.\n신규 복음방 5개 개설 예정.", fontsize=7.5, color='#334155')

    btn_draft = patches.FancyBboxPatch((83, 9.5), 13.5, 4.5, boxstyle="round,pad=0.2,rounding_size=0.6",
                                       facecolor='#64748B', edgecolor='none')
    ax.add_patch(btn_draft)
    ax.text(89.7, 11.5, "임시 저장", fontsize=8.5, fontweight='bold', color='#FFFFFF', ha='center')

    btn_submit = patches.FancyBboxPatch((98.5, 9.5), 13.5, 4.5, boxstyle="round,pad=0.2,rounding_size=0.6",
                                        facecolor='#10B981', edgecolor='none')
    ax.add_patch(btn_submit)
    ax.text(105.2, 11.5, "최종 제출", fontsize=8.5, fontweight='bold', color='#FFFFFF', ha='center')

    draw_marker(ax, 5, 51.5, "1", "교회 및 대상 주차 선택", color='#2563EB', align='left')
    draw_marker(ax, 5, 25, "2", "부서별 지표(재적/찾기/복음방 등) 입력", color='#3B82F6', align='left')
    draw_marker(ax, 80, 33, "3", "사진 & 특이사항 입력", color='#F59E0B', align='left')
    draw_marker(ax, 98.5, 11.5, "4", "[최종 제출] 클릭 (일요일 자정 마감)", color='#10B981', align='left')

    save_screen(fig, 'screen_04_weekly_report.png')

# -------------------------------------------------------------
# 화면 5: 전도 계획 작성 화면
# -------------------------------------------------------------
def make_screen_plan_tab():
    fig, ax = plt.subplots(figsize=(12, 7.5))
    ax.set_facecolor('#0F172A')
    ax.set_xlim(0, 120)
    ax.set_ylim(0, 75)
    ax.axis('off')

    draw_browser_frame(ax, "https://overseas.portal/evangelism?tab=plan", active_menu="전도관리")

    sub_tab_bg = patches.Rectangle((5, 50), 110, 4.5, facecolor='#FFFFFF', edgecolor='#CBD5E1', linewidth=1)
    ax.add_patch(sub_tab_bg)
    
    sub_tabs = ["교회별 확인 & 주간보고", "취합 & 통계", "전도 계획 (Plan)", "월간보고", "월간보고서 출력"]
    for i, st in enumerate(sub_tabs):
        stx = 7 + i * 21.5
        is_cur = (st == "전도 계획 (Plan)")
        if is_cur:
            bar = patches.Rectangle((stx, 50), 20, 4.5, facecolor='#EFF6FF', edgecolor='#3B82F6', linewidth=1)
            ax.add_patch(bar)
            ax.text(stx + 10, 52.3, st, fontsize=8.5, fontweight='bold', color='#2563EB', ha='center')
        else:
            ax.text(stx + 10, 52.3, st, fontsize=8.5, color='#64748B', ha='center')

    cbar = patches.FancyBboxPatch((5, 42), 110, 6.5, boxstyle="round,pad=0.4,rounding_size=0.8",
                                  facecolor='#FFFFFF', edgecolor='#CBD5E1', linewidth=1.2)
    ax.add_patch(cbar)
    ax.text(8, 45.3, "대상 교회 : 도쿄교회   |   최종 수정 : 2026-08-18 19:30 (admin)", fontsize=8.5, color='#475569')

    btn_add = patches.FancyBboxPatch((68, 43.2), 22, 4.2, boxstyle="round,pad=0.2,rounding_size=0.6",
                                     facecolor='#3B82F6', edgecolor='none')
    ax.add_patch(btn_add)
    ax.text(79, 45.1, "+ 새 계획 블록 추가", fontsize=8.5, fontweight='bold', color='#FFFFFF', ha='center')

    btn_save = patches.FancyBboxPatch((92, 43.2), 20, 4.2, boxstyle="round,pad=0.2,rounding_size=0.6",
                                      facecolor='#10B981', edgecolor='none')
    ax.add_patch(btn_save)
    ax.text(102, 45.1, "[저장] 계획 저장 완료", fontsize=8.5, fontweight='bold', color='#FFFFFF', ha='center')

    b1 = patches.FancyBboxPatch((5, 24), 110, 16, boxstyle="round,pad=0.6,rounding_size=1",
                               facecolor='#FFFFFF', edgecolor='#3B82F6', linewidth=1.5)
    ax.add_patch(b1)
    chk1 = patches.Rectangle((8, 35.5), 2.5, 2.5, facecolor='#FFFFFF', edgecolor='#3B82F6', linewidth=1.2)
    ax.add_patch(chk1)
    ax.text(13, 36.8, "전략 1. 2026 하반기 대학가 집중 복음 전파 캠페인", fontsize=10.5, fontweight='bold', color='#1E40AF')

    plan_desc1 = (
        "• 목표 대상 : 도쿄 주요 5개 대학교(와세다, 도쿄대 등) 유학생 및 청년 계층\n"
        "• 실행 방안 : 주 3회 캠퍼스 버스킹 & 1:1 성경 세미나 오픈 / 청년회 인도자 20명 특별 배치\n"
        "• 기대 효과 : 월 30명 신규 복음방 개설 및 센터 가개강 연결율 40% 달성 목표"
    )
    ax.text(13, 33, plan_desc1, fontsize=8.5, color='#334155', va='top', linespacing=1.4)

    b2 = patches.FancyBboxPatch((5, 6), 110, 16, boxstyle="round,pad=0.6,rounding_size=1",
                               facecolor='#FFFFFF', edgecolor='#CBD5E1', linewidth=1.2)
    ax.add_patch(b2)
    chk2 = patches.Rectangle((8, 17.5), 2.5, 2.5, facecolor='#FFFFFF', edgecolor='#CBD5E1', linewidth=1.2)
    ax.add_patch(chk2)
    ax.text(13, 18.8, "전략 2. 부녀회 & 장년회 가정을 통한 소그룹 관계 전도", fontsize=10.5, fontweight='bold', color='#0F172A')

    plan_desc2 = (
        "• 목표 대상 : 구역별 지인 및 가족, 직장 동료 관계 전도망 구축\n"
        "• 실행 방안 : 매주 목요일 가정 오픈 성경모임 활성화 / 심방 전담팀 구성 및 맞춤형 상담 진행\n"
        "• 기대 효과 : 장년/부녀 전도재적 활동률 80% 돌파 및 하반기 시온 입교 50명 수료"
    )
    ax.text(13, 15, plan_desc2, fontsize=8.5, color='#334155', va='top', linespacing=1.4)

    draw_marker(ax, 5, 52, "1", "[전도 계획] 탭 선택", color='#2563EB', align='left')
    draw_marker(ax, 68, 45, "2", "[+ 새 계획 블록 추가] 클릭", color='#0EA5E9', align='left')
    draw_marker(ax, 5, 30, "3", "전략 제목 및 실행 내용 작성", color='#8B5CF6', align='left')
    draw_marker(ax, 92, 45, "4", "[계획 저장] 클릭", color='#10B981', align='left')

    save_screen(fig, 'screen_05_plan_tab.png')

# -------------------------------------------------------------
# 화면 6: 월간보고 작성 화면
# -------------------------------------------------------------
def make_screen_monthly_tab():
    fig, ax = plt.subplots(figsize=(12, 7.5))
    ax.set_facecolor('#0F172A')
    ax.set_xlim(0, 120)
    ax.set_ylim(0, 75)
    ax.axis('off')

    draw_browser_frame(ax, "https://overseas.portal/evangelism?tab=monthly", active_menu="전도관리")

    sub_tab_bg = patches.Rectangle((5, 50), 110, 4.5, facecolor='#FFFFFF', edgecolor='#CBD5E1', linewidth=1)
    ax.add_patch(sub_tab_bg)
    sub_tabs = ["교회별 확인 & 주간보고", "취합 & 통계", "전도 계획 (Plan)", "월간보고", "월간보고서 출력"]
    for i, st in enumerate(sub_tabs):
        stx = 7 + i * 21.5
        is_cur = (st == "월간보고")
        if is_cur:
            bar = patches.Rectangle((stx, 50), 20, 4.5, facecolor='#EFF6FF', edgecolor='#3B82F6', linewidth=1)
            ax.add_patch(bar)
            ax.text(stx + 10, 52.3, st, fontsize=8.5, fontweight='bold', color='#2563EB', ha='center')
        else:
            ax.text(stx + 10, 52.3, st, fontsize=8.5, color='#64748B', ha='center')

    cbar = patches.FancyBboxPatch((5, 42), 110, 6.5, boxstyle="round,pad=0.4,rounding_size=0.8",
                                  facecolor='#FFFFFF', edgecolor='#CBD5E1', linewidth=1.2)
    ax.add_patch(cbar)
    ax.text(8, 45.3, "교회 : 도쿄교회   |   보고 월 : 2026년 8월 ▼", fontsize=8.8, fontweight='bold', color='#1E40AF')

    btn_edit = patches.FancyBboxPatch((70, 43.2), 18, 4.2, boxstyle="round,pad=0.2,rounding_size=0.6",
                                      facecolor='#4F46E5', edgecolor='none')
    ax.add_patch(btn_edit)
    ax.text(79, 45.1, "수정 모드", fontsize=8.5, fontweight='bold', color='#FFFFFF', ha='center')

    btn_req = patches.FancyBboxPatch((90, 43.2), 22, 4.2, boxstyle="round,pad=0.2,rounding_size=0.6",
                                     facecolor='#F43F5E', edgecolor='none')
    ax.add_patch(btn_req)
    ax.text(101, 45.1, "수정 권한 요청", fontsize=8.5, fontweight='bold', color='#FFFFFF', ha='center')

    t_card = patches.FancyBboxPatch((5, 6), 110, 34, boxstyle="round,pad=0.6,rounding_size=1",
                                   facecolor='#FFFFFF', edgecolor='#CBD5E1', linewidth=1.2)
    ax.add_patch(t_card)
    ax.text(8, 36.5, "[2026년 8월 부서별 월간 전도 활동 결산표]", fontsize=10.5, fontweight='bold', color='#0F172A')

    m_headers = ["부서 구분", "전도재적", "실활동 인원수", "활동률 (%)", "전도 사역자수(인도자)", "전년 동월 활동수", "증감율"]
    m_widths = [16, 14, 16, 14, 18, 16, 14]
    mx = 8
    for h, w in zip(m_headers, m_widths):
        hb = patches.Rectangle((mx, 31.5), w, 3.5, facecolor='#F1F5F9', edgecolor='#CBD5E1', linewidth=0.8)
        ax.add_patch(hb)
        ax.text(mx + w/2, 33.2, h, fontsize=7.8, fontweight='bold', ha='center', color='#334155')
        mx += w

    m_rows = [
        ("교역자", "12", "12", "100.0%", "12", "10", "+20.0% (상승)"),
        ("자문회", "18", "14", "77.8%", "6", "12", "+16.7% (상승)"),
        ("장년회", "45", "36", "80.0%", "18", "30", "+20.0% (상승)"),
        ("부녀회", "82", "72", "87.8%", "42", "60", "+20.0% (상승)"),
        ("청년회", "105", "96", "91.4%", "58", "78", "+23.1% (상승)"),
        ("총합계", "262", "230", "87.8%", "136", "190", "+21.1% (상승)")
    ]
    for r_idx, r_data in enumerate(m_rows):
        ry = 27.5 - r_idx * 3.8
        rx = 8
        is_tot = (r_idx == len(m_rows) - 1)
        rbg = '#EFF6FF' if is_tot else ('#FFFFFF' if r_idx % 2 == 0 else '#F8FAFC')
        
        for c_idx, (val, w) in enumerate(zip(r_data, m_widths)):
            cb = patches.Rectangle((rx, ry), w, 3.4, facecolor=rbg, edgecolor='#E2E8F0', linewidth=0.6)
            ax.add_patch(cb)
            fc = '#1E40AF' if is_tot else ('#EF4444' if '상승' in val else '#0F172A')
            ax.text(rx + w/2, ry + 1.5, val, fontsize=7.8, fontweight='bold' if is_tot else 'normal', ha='center', color=fc)
            rx += w

    draw_marker(ax, 5, 45.3, "1", "보고 연도 및 월 선택", color='#2563EB', align='left')
    draw_marker(ax, 38, 25, "2", "실활동 인원수 & 사역자수 입력", color='#3B82F6', align='left')
    draw_marker(ax, 55, 25, "3", "활동률 & 전년 증감율 자동 계산", color='#10B981', align='left')
    draw_marker(ax, 90, 45, "4", "과거월 잠금 시 [수정 권한 요청]", color='#F43F5E', align='left')

    save_screen(fig, 'screen_06_monthly_tab.png')

# -------------------------------------------------------------
# 화면 7: 교회별 데이터 확인 및 종합 진단 대시보드
# -------------------------------------------------------------
def make_screen_diagnosis_dashboard():
    fig, ax = plt.subplots(figsize=(12, 7.5))
    ax.set_facecolor('#0F172A')
    ax.set_xlim(0, 120)
    ax.set_ylim(0, 75)
    ax.axis('off')

    draw_browser_frame(ax, "https://overseas.portal/diagnosis", active_menu="홈 / 진단")

    kpis = [
        ("전체 전도재적", "1,450명", "+12.4% 전월대비", '#2563EB', 5),
        ("당주차 복음방 개설", "380명", "목표달성률 92.5%", '#10B981', 43),
        ("시온입교 및 수료", "142명", "연간 누적 1,020명", '#8B5CF6', 81)
    ]
    for title, val, sub, col, kx in kpis:
        kc = patches.FancyBboxPatch((kx, 44), 34, 13, boxstyle="round,pad=0.5,rounding_size=0.8",
                                    facecolor='#FFFFFF', edgecolor='#CBD5E1', linewidth=1.2)
        ax.add_patch(kc)
        bar = patches.Rectangle((kx, 44), 2, 13, facecolor=col, edgecolor='none')
        ax.add_patch(bar)
        ax.text(kx + 4, 53.5, title, fontsize=8.5, fontweight='bold', color='#475569')
        ax.text(kx + 4, 48.5, val, fontsize=15, fontweight='bold', color='#0F172A')
        ax.text(kx + 4, 45.5, sub, fontsize=7.8, color=col, fontweight='bold')

    f_card = patches.FancyBboxPatch((5, 6), 52, 36, boxstyle="round,pad=0.6,rounding_size=1",
                                   facecolor='#FFFFFF', edgecolor='#CBD5E1', linewidth=1.2)
    ax.add_patch(f_card)
    ax.text(8, 38.5, "[전도 퍼널 (Funnel) 단계별 전환 분석]", fontsize=10, fontweight='bold', color='#0F172A')

    funnel_steps = [
        ("1. 찾기 대상", "520명 (100%)", 44, '#3B82F6'),
        ("2. 복음방 진행", "380명 (73.1%)", 36, '#0EA5E9'),
        ("3. 가개강 / 등록", "240명 (46.2%)", 28, '#10B981'),
        ("4. 시온 입교", "142명 (27.3%)", 20, '#F59E0B')
    ]
    for s_idx, (stitle, sval, swidth, scol) in enumerate(funnel_steps):
        sy = 32 - s_idx * 6.5
        f_bar = patches.FancyBboxPatch((8 + (44 - swidth)/2, sy), swidth, 4.5, boxstyle="round,pad=0.2,rounding_size=0.4",
                                       facecolor=scol, edgecolor='none')
        ax.add_patch(f_bar)
        ax.text(30, sy + 2, f"{stitle} : {sval}", fontsize=8.2, fontweight='bold', color='#FFFFFF', ha='center')

    t_card = patches.FancyBboxPatch((61, 6), 54, 36, boxstyle="round,pad=0.6,rounding_size=1",
                                   facecolor='#FFFFFF', edgecolor='#CBD5E1', linewidth=1.2)
    ax.add_patch(t_card)
    ax.text(64, 38.5, "[교회별 주차별 전도 추이 비교 (Trend)]", fontsize=10, fontweight='bold', color='#0F172A')
    ax.text(64, 35.8, "■ 도쿄교회   ■ 오사카교회   ■ 나고야교회", fontsize=7.8, color='#475569')

    weeks_x = [68, 76, 84, 92, 100, 108]
    tokyo_y = [15, 18, 22, 25, 29, 32]
    osaka_y = [12, 14, 16, 20, 21, 24]
    nagoya_y = [8, 10, 11, 14, 16, 19]

    for wx in weeks_x:
        gline = patches.Rectangle((wx, 11), 0.2, 23, facecolor='#F1F5F9', edgecolor='none')
        ax.add_patch(gline)

    ax.plot(weeks_x, tokyo_y, color='#2563EB', linewidth=2.5, marker='o', markersize=5, zorder=5)
    ax.plot(weeks_x, osaka_y, color='#10B981', linewidth=2, marker='s', markersize=4.5, zorder=5)
    ax.plot(weeks_x, nagoya_y, color='#F59E0B', linewidth=2, marker='^', markersize=4.5, zorder=5)

    week_labels = ["7/1주", "7/2주", "7/3주", "8/1주", "8/2주", "8/3주"]
    for wx, wl in zip(weeks_x, week_labels):
        ax.text(wx, 8.5, wl, fontsize=7.5, ha='center', color='#64748B')

    draw_marker(ax, 5, 53, "1", "글로벌 KPI 현황 카드", color='#2563EB', align='left')
    draw_marker(ax, 5, 25, "2", "단계별 Funnel 전환율 & 이탈 진단", color='#0EA5E9', align='left')
    draw_marker(ax, 61, 25, "3", "다중 교회 주차별 비교 추이 그래프", color='#8B5CF6', align='left')

    save_screen(fig, 'screen_07_diagnosis_dashboard.png')

if __name__ == '__main__':
    make_screen_login()
    make_screen_profile_password()
    make_screen_otp_telegram()
    make_screen_weekly_report()
    make_screen_plan_tab()
    make_screen_monthly_tab()
    make_screen_diagnosis_dashboard()
    print("All UI Screenshot mockups cleanly generated!")
