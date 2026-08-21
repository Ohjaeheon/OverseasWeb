-- 해선부 업무포탈 (Overseas Portal) PostgreSQL 스키마 DDL
-- 스키마 'overseas'는 이미 생성되어 있다고 가정함.

-- 1. 해외 교회 마스터 테이블
CREATE TABLE IF NOT EXISTS overseas.churches (
    church_id BIGSERIAL PRIMARY KEY,
    continent VARCHAR(50) NOT NULL,
    country VARCHAR(100) NOT NULL,
    jipa VARCHAR(50) NOT NULL,
    gubun VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    leader_name VARCHAR(100),
    founding_date DATE,
    flight_time VARCHAR(50),
    distance_km INT,
    time_diff VARCHAR(100),
    language VARCHAR(100),
    religion VARCHAR(100),
    lat NUMERIC(10, 7),
    lon NUMERIC(10, 7),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE overseas.churches IS '해외교회 및 지부 마스터 정보';
COMMENT ON COLUMN overseas.churches.church_id IS '교회 고유 PK';
COMMENT ON COLUMN overseas.churches.continent IS '대륙 구분 (아시아, 유럽, 아프리카, 북미, 남미, 오세아니아)';
COMMENT ON COLUMN overseas.churches.country IS '국가명 (한국어)';
COMMENT ON COLUMN overseas.churches.jipa IS '소속 지파명';
COMMENT ON COLUMN overseas.churches.gubun IS '구분 (지교회, 개척교회, 복음방 등)';
COMMENT ON COLUMN overseas.churches.name IS '교회/단체명';
COMMENT ON COLUMN overseas.churches.founding_date IS '설립일 (그레고리력 저장, 신천지력 = 연도 - 1983년으로 환산 표시)';
COMMENT ON COLUMN overseas.churches.lat IS '위도 (Latitude)';
COMMENT ON COLUMN overseas.churches.lon IS '경도 (Longitude)';
COMMENT ON COLUMN overseas.churches.is_active IS '활성화 여부';
COMMENT ON COLUMN overseas.churches.created_at IS '생성 일시';
COMMENT ON COLUMN overseas.churches.updated_at IS '수정 일시';

-- 2. 월별 신앙프로세스 및 진단 데이터 기록 테이블
CREATE TABLE IF NOT EXISTS overseas.faith_process_records (
    record_id BIGSERIAL PRIMARY KEY,
    church_id BIGINT NOT NULL REFERENCES overseas.churches(church_id) ON DELETE CASCADE,
    year_month VARCHAR(7) NOT NULL, -- YYYY-MM
    
    -- ① 전도 지표
    evang_reg INT DEFAULT 0,
    bible_month_reg INT DEFAULT 0,
    bible_cum_reg INT DEFAULT 0,
    bible_cur_att INT DEFAULT 0,
    
    -- ② 센터 지표
    center_month_on INT DEFAULT 0,
    center_month_off INT DEFAULT 0,
    center_month_total INT DEFAULT 0,
    center_cum_on INT DEFAULT 0,
    center_cum_off INT DEFAULT 0,
    center_cum_reg INT DEFAULT 0,
    center_month_grad INT DEFAULT 0,
    center_tot_month_reg INT DEFAULT 0,
    center_cum_grad INT DEFAULT 0,
    center_att_elem INT DEFAULT 0,
    center_att_mid INT DEFAULT 0,
    center_att_high INT DEFAULT 0,
    
    -- ③ 내무 / 교적 지표
    registered INT DEFAULT 0,
    year_start_reg INT DEFAULT 0,
    reg_change INT DEFAULT 0,
    new_admit INT DEFAULT 0,
    cum_new_admit INT DEFAULT 0,
    discipline INT DEFAULT 0,
    cum_discipline INT DEFAULT 0,
    move_in INT DEFAULT 0,
    move_out INT DEFAULT 0,
    trans_in INT DEFAULT 0,
    trans_out INT DEFAULT 0,
    dup_reg INT DEFAULT 0,
    prev_new_admit_cnt INT DEFAULT 0,
    
    -- ④ 예배 지표 (전성도 & 결석)
    att_reg INT DEFAULT 0,
    att_onsite INT DEFAULT 0,
    att_online INT DEFAULT 0,
    att_etc INT DEFAULT 0,
    att_total INT DEFAULT 0,
    abs_once INT DEFAULT 0,
    abs_long_manage INT DEFAULT 0,
    abs_long_unmanage INT DEFAULT 0,
    abs_total INT DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_church_year_month UNIQUE (church_id, year_month)
);

COMMENT ON TABLE overseas.faith_process_records IS '월별 신앙프로세스 및 교회 진단서 기록 테이블';
COMMENT ON COLUMN overseas.faith_process_records.record_id IS '진단 기록 고유 PK';
COMMENT ON COLUMN overseas.faith_process_records.church_id IS '해당 교회 FK';
COMMENT ON COLUMN overseas.faith_process_records.year_month IS '진단 연월 (형식: YYYY-MM)';
COMMENT ON COLUMN overseas.faith_process_records.evang_reg IS '전도재적 (예배 출결재적 연동)';
COMMENT ON COLUMN overseas.faith_process_records.bible_month_reg IS '월등록 (동행/복음방 신규 등록 수)';
COMMENT ON COLUMN overseas.faith_process_records.bible_cum_reg IS '누적등록수 (동행/복음방 누적)';
COMMENT ON COLUMN overseas.faith_process_records.bible_cur_att IS '현재출석수 (동행/복음방 현재 출석)';
COMMENT ON COLUMN overseas.faith_process_records.center_month_on IS '선교센터 대면 월등록수';
COMMENT ON COLUMN overseas.faith_process_records.center_month_off IS '선교센터 비대면 월등록수';
COMMENT ON COLUMN overseas.faith_process_records.center_month_total IS '선교센터 월등록수 총계';
COMMENT ON COLUMN overseas.faith_process_records.center_cum_on IS '선교센터 누적 대면 등록수';
COMMENT ON COLUMN overseas.faith_process_records.center_cum_off IS '선교센터 누적 비대면 등록수';
COMMENT ON COLUMN overseas.faith_process_records.center_cum_reg IS '선교센터 누적 등록수 총계';
COMMENT ON COLUMN overseas.faith_process_records.center_month_grad IS '선교센터 월종강수';
COMMENT ON COLUMN overseas.faith_process_records.center_tot_month_reg IS '선교센터 총등록자 수';
COMMENT ON COLUMN overseas.faith_process_records.center_cum_grad IS '선교센터 누적 종강수';
COMMENT ON COLUMN overseas.faith_process_records.center_att_elem IS '선교센터 초등 출석수';
COMMENT ON COLUMN overseas.faith_process_records.center_att_mid IS '선교센터 중등 출석수';
COMMENT ON COLUMN overseas.faith_process_records.center_att_high IS '선교센터 고등 출석수';
COMMENT ON COLUMN overseas.faith_process_records.registered IS '교회 현재적 (전성도 재적)';
COMMENT ON COLUMN overseas.faith_process_records.year_start_reg IS '연초 재적수';
COMMENT ON COLUMN overseas.faith_process_records.reg_change IS '재적 증가수';
COMMENT ON COLUMN overseas.faith_process_records.new_admit IS '당월 입교자 수';
COMMENT ON COLUMN overseas.faith_process_records.cum_new_admit IS '누적 입교자 수';
COMMENT ON COLUMN overseas.faith_process_records.discipline IS '사고 (징계/제적) 수';
COMMENT ON COLUMN overseas.faith_process_records.cum_discipline IS '누적 사고 수';
COMMENT ON COLUMN overseas.faith_process_records.move_in IS '전입 수';
COMMENT ON COLUMN overseas.faith_process_records.move_out IS '전출 수';
COMMENT ON COLUMN overseas.faith_process_records.trans_in IS '이동전입 수';
COMMENT ON COLUMN overseas.faith_process_records.trans_out IS '이동전출 수';
COMMENT ON COLUMN overseas.faith_process_records.dup_reg IS '중복등록 정치 수';
COMMENT ON COLUMN overseas.faith_process_records.prev_new_admit_cnt IS '전월 입교자 수';
COMMENT ON COLUMN overseas.faith_process_records.att_reg IS '예배 출결재적';
COMMENT ON COLUMN overseas.faith_process_records.att_onsite IS '대면예배 출석수';
COMMENT ON COLUMN overseas.faith_process_records.att_online IS '온라인예배 출석수';
COMMENT ON COLUMN overseas.faith_process_records.att_etc IS '기타예배 출석수';
COMMENT ON COLUMN overseas.faith_process_records.att_total IS '예배 출석수 계';
COMMENT ON COLUMN overseas.faith_process_records.abs_once IS '일회성 결석수';
COMMENT ON COLUMN overseas.faith_process_records.abs_long_manage IS '장기결석(관리가능) 수';
COMMENT ON COLUMN overseas.faith_process_records.abs_long_unmanage IS '장기결석(관리불가능) 수';
COMMENT ON COLUMN overseas.faith_process_records.abs_total IS '결석수 계';

-- 3. 사용자 및 텔레그램 계정 연동 테이블
CREATE TABLE IF NOT EXISTS overseas.users (
    user_id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'ROLE_USER',
    assigned_country VARCHAR(100) DEFAULT '전체',
    must_change_password BOOLEAN DEFAULT FALSE,
    telegram_id VARCHAR(100),
    telegram_chat_id VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    is_worship_permitted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE overseas.users IS '시스템 사용자 및 텔레그램 연동 정보';
COMMENT ON COLUMN overseas.users.user_id IS '사용자 고유 PK';
COMMENT ON COLUMN overseas.users.username IS '로그인 아이디';
COMMENT ON COLUMN overseas.users.password_hash IS 'BCrypt 암호화된 비밀번호';
COMMENT ON COLUMN overseas.users.name IS '사용자 실명';
COMMENT ON COLUMN overseas.users.role IS '권한 (ROLE_ADMIN, ROLE_USER)';
COMMENT ON COLUMN overseas.users.telegram_id IS '텔레그램 사용자 아이디 (@username)';
COMMENT ON COLUMN overseas.users.telegram_chat_id IS '텔레그램 Chat ID (OTP 발송용)';
COMMENT ON COLUMN overseas.users.is_active IS '계정 활성화 상태';
COMMENT ON COLUMN overseas.users.is_worship_permitted IS '텔레그램 주간예배 출결 취합 권한 여부';

-- 4. 텔레그램 OTP 발송/인증 이력 테이블
CREATE TABLE IF NOT EXISTS overseas.telegram_otp_log (
    otp_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES overseas.users(user_id) ON DELETE CASCADE,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE overseas.telegram_otp_log IS '텔레그램 2차 인증 OTP 로그';
COMMENT ON COLUMN overseas.telegram_otp_log.otp_id IS 'OTP 로그 PK';
COMMENT ON COLUMN overseas.telegram_otp_log.user_id IS '사용자 FK';
COMMENT ON COLUMN overseas.telegram_otp_log.otp_code IS '6자리 난수 인증번호';
COMMENT ON COLUMN overseas.telegram_otp_log.expires_at IS 'OTP 인증 만료 시간';
COMMENT ON COLUMN overseas.telegram_otp_log.is_verified IS '인증 완료 여부';

-- 5. 다국어 사전 테이블
CREATE TABLE IF NOT EXISTS overseas.i18n_dictionary (
    dict_id BIGSERIAL PRIMARY KEY,
    message_key VARCHAR(150) NOT NULL,
    lang_code VARCHAR(10) NOT NULL,
    message_value TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'GENERAL',
    use_yn CHAR(1) NOT NULL DEFAULT 'Y',
    updated_by VARCHAR(100),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_key_lang UNIQUE (message_key, lang_code)
);

COMMENT ON TABLE overseas.i18n_dictionary IS '다국어 리소스 딕셔너리';
COMMENT ON COLUMN overseas.i18n_dictionary.dict_id IS '사전 항목 PK';
COMMENT ON COLUMN overseas.i18n_dictionary.message_key IS '다국어 메시지 키';
COMMENT ON COLUMN overseas.i18n_dictionary.lang_code IS '언어 코드 (ko, en, th, zh, ja)';
COMMENT ON COLUMN overseas.i18n_dictionary.message_value IS '번역 텍스트 값';
COMMENT ON COLUMN overseas.i18n_dictionary.category IS '카테고리 (UI, DIAGNOSIS, ADMIN)';
COMMENT ON COLUMN overseas.i18n_dictionary.use_yn IS '사용여부 (Y/N)';
COMMENT ON COLUMN overseas.i18n_dictionary.updated_by IS '최종 수정자';

-- 6. 시스템 설정 테이블
CREATE TABLE IF NOT EXISTS overseas.system_config (
    config_id BIGSERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE overseas.system_config IS '시스템 설정 값 (텔레그램 봇 토큰 등)';
COMMENT ON COLUMN overseas.system_config.config_key IS '설정 키';
COMMENT ON COLUMN overseas.system_config.config_value IS '설정 값';

-- 7. 감사/활동 로그 테이블
CREATE TABLE IF NOT EXISTS overseas.audit_log (
    log_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES overseas.users(user_id) ON DELETE SET NULL,
    username VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    ip_address VARCHAR(50),
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE overseas.audit_log IS '사용자 및 관리자 활동 감사 로그';
COMMENT ON COLUMN overseas.audit_log.action IS '수행된 작업 (LOGIN_SUCCESS, DATA_UPDATE 등)';

-- 8. 파일 업로드 로그 테이블
CREATE TABLE IF NOT EXISTS overseas.file_upload_log (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE overseas.file_upload_log IS '파일 업로드 감사 로그';
COMMENT ON COLUMN overseas.file_upload_log.name IS '계정명';
COMMENT ON COLUMN overseas.file_upload_log.username IS '계정아이디';
COMMENT ON COLUMN overseas.file_upload_log.file_name IS '업로드 파일명';
COMMENT ON COLUMN overseas.file_upload_log.file_size IS '업로드 용량(Byte)';
COMMENT ON COLUMN overseas.file_upload_log.ip_address IS 'IP주소';
COMMENT ON COLUMN overseas.file_upload_log.created_at IS '업로드 시간';

-- 9. 파일 다운로드 로그 테이블
CREATE TABLE IF NOT EXISTS overseas.file_download_log (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE overseas.file_download_log IS '파일 다운로드 감사 로그';
COMMENT ON COLUMN overseas.file_download_log.name IS '계정명';
COMMENT ON COLUMN overseas.file_download_log.username IS '계정아이디';
COMMENT ON COLUMN overseas.file_download_log.file_name IS '다운로드 파일명';
COMMENT ON COLUMN overseas.file_download_log.ip_address IS 'IP주소';
COMMENT ON COLUMN overseas.file_download_log.created_at IS '다운로드 시간';

-- 10. 업무 원장헌금 실적 테이블
CREATE TABLE IF NOT EXISTS overseas.business_ledger_record (
    id BIGSERIAL PRIMARY KEY,
    year INT NOT NULL,
    month INT NOT NULL,
    church_name VARCHAR(150) NOT NULL,
    amount BIGINT NOT NULL,
    report_date VARCHAR(100),
    draft_user VARCHAR(50),
    expense_date VARCHAR(100),
    meeting_date VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_ledger_year_month_church UNIQUE (year, month, church_name)
);

COMMENT ON TABLE overseas.business_ledger_record IS '업무 원장헌금 실적 데이터';
COMMENT ON COLUMN overseas.business_ledger_record.year IS '연도';
COMMENT ON COLUMN overseas.business_ledger_record.month IS '월';
COMMENT ON COLUMN overseas.business_ledger_record.church_name IS '해외교회/지역명';
COMMENT ON COLUMN overseas.business_ledger_record.amount IS '헌금 금액';
COMMENT ON COLUMN overseas.business_ledger_record.report_date IS '기안일자';
COMMENT ON COLUMN overseas.business_ledger_record.draft_user IS '기안자';
COMMENT ON COLUMN overseas.business_ledger_record.expense_date IS '지출일자';
COMMENT ON COLUMN overseas.business_ledger_record.meeting_date IS '회의일시';

-- 11. 로그인 로그 테이블
CREATE TABLE IF NOT EXISTS overseas.login_log (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL,
    ip_address VARCHAR(50),
    status VARCHAR(20) NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE overseas.login_log IS '로그인 감사 로그';
COMMENT ON COLUMN overseas.login_log.name IS '계정명';
COMMENT ON COLUMN overseas.login_log.username IS '계정아이디';
COMMENT ON COLUMN overseas.login_log.ip_address IS 'IP주소';
COMMENT ON COLUMN overseas.login_log.status IS '로그인 상태 (SUCCESS, FAILED)';
COMMENT ON COLUMN overseas.login_log.details IS '비고 및 실패사유';

-- 12. 접근 로그 테이블
CREATE TABLE IF NOT EXISTS overseas.access_log (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL,
    page_name VARCHAR(150) NOT NULL,
    path VARCHAR(255) NOT NULL,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE overseas.access_log IS '접근 감사 로그';
COMMENT ON COLUMN overseas.access_log.name IS '계정명';
COMMENT ON COLUMN overseas.access_log.username IS '계정아이디';
COMMENT ON COLUMN overseas.access_log.page_name IS '접근 페이지명';
COMMENT ON COLUMN overseas.access_log.path IS '경로';
COMMENT ON COLUMN overseas.access_log.ip_address IS 'IP주소';
COMMENT ON COLUMN overseas.access_log.created_at IS '접근 시간';

-- 13. 업무포탈 게시판 테이블
CREATE TABLE IF NOT EXISTS overseas.business_board_posts (
    post_id BIGSERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    file_name VARCHAR(255),
    file_path VARCHAR(500),
    file_size BIGINT,
    author VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    view_count INT DEFAULT 0,
    is_locked BOOLEAN DEFAULT FALSE,
    notice_type VARCHAR(50) DEFAULT 'GENERAL'
);

COMMENT ON TABLE overseas.business_board_posts IS '업무포탈 통합 게시판 테이블';
COMMENT ON COLUMN overseas.business_board_posts.post_id IS '게시글 고유 ID';
COMMENT ON COLUMN overseas.business_board_posts.category IS '카테고리 구분';
COMMENT ON COLUMN overseas.business_board_posts.title IS '게시글 제목';
COMMENT ON COLUMN overseas.business_board_posts.content IS '메모 및 본문 내용';
COMMENT ON COLUMN overseas.business_board_posts.file_name IS '첨부파일 원본 명칭';
COMMENT ON COLUMN overseas.business_board_posts.file_path IS '서버 저장 첨부파일 경로';
COMMENT ON COLUMN overseas.business_board_posts.file_size IS '첨부파일 용량 (Byte)';
COMMENT ON COLUMN overseas.business_board_posts.author IS '작성자 아이디 (username)';
COMMENT ON COLUMN overseas.business_board_posts.created_at IS '작성 일시';
COMMENT ON COLUMN overseas.business_board_posts.view_count IS '조회수';
COMMENT ON COLUMN overseas.business_board_posts.is_locked IS '수정 잠금 여부';
COMMENT ON COLUMN overseas.business_board_posts.notice_type IS '공지사항 유형 (MUST_READ, NOTICE, GENERAL)';

-- 14. 업무포탈 게시판 다중 첨부파일 테이블
CREATE TABLE IF NOT EXISTS overseas.business_board_attachments (
    attachment_id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL,
    doc_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    CONSTRAINT fk_board_attachment_post FOREIGN KEY (post_id) REFERENCES overseas.business_board_posts (post_id) ON DELETE CASCADE
);

COMMENT ON TABLE overseas.business_board_attachments IS '통합 게시판 첨부파일 테이블';
COMMENT ON COLUMN overseas.business_board_attachments.attachment_id IS '첨부파일 고유 ID';
COMMENT ON COLUMN overseas.business_board_attachments.post_id IS '게시글 ID';
COMMENT ON COLUMN overseas.business_board_attachments.doc_type IS '문서 유형 (PROPOSAL, MINUTES, ETC)';
COMMENT ON COLUMN overseas.business_board_attachments.file_name IS '첨부파일 원본 명칭';
COMMENT ON COLUMN overseas.business_board_attachments.file_path IS '서버 저장 첨부파일 경로';
COMMENT ON COLUMN overseas.business_board_attachments.file_size IS '첨부파일 용량 (Byte)';

-- 15. 업무포탈 게시판 참조자 테이블
CREATE TABLE IF NOT EXISTS overseas.business_board_post_referrers (
    post_id BIGINT NOT NULL,
    referrer_username VARCHAR(100) NOT NULL,
    PRIMARY KEY (post_id, referrer_username),
    CONSTRAINT fk_board_post_referrer FOREIGN KEY (post_id) REFERENCES overseas.business_board_posts (post_id) ON DELETE CASCADE
);

COMMENT ON TABLE overseas.business_board_post_referrers IS '게시글 참조자 정보 매핑 테이블';
COMMENT ON COLUMN overseas.business_board_post_referrers.post_id IS '게시글 고유 ID';
COMMENT ON COLUMN overseas.business_board_post_referrers.referrer_username IS '참조자 로그인 아이디';

-- 16. 해외교회 조직도 테이블
CREATE TABLE IF NOT EXISTS overseas.organization_charts (
    church_id BIGINT NOT NULL PRIMARY KEY,
    chart_data TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_organization_chart_church FOREIGN KEY (church_id) REFERENCES overseas.churches(church_id) ON DELETE CASCADE
);

COMMENT ON TABLE overseas.organization_charts IS '해외교회 조직도 정보 테이블';
COMMENT ON COLUMN overseas.organization_charts.church_id IS '교회 고유 PK';
COMMENT ON COLUMN overseas.organization_charts.chart_data IS '조직도 트리 및 하이라커 JSON 데이터';
COMMENT ON COLUMN overseas.organization_charts.updated_at IS '수정 일시';

-- 17. 주간보고 양식 스키마 테이블 (관리자 폼 빌더, 주차구간별 자동전환)
CREATE TABLE IF NOT EXISTS overseas.weekly_report_schemas (
    schema_id           BIGSERIAL PRIMARY KEY,
    week_label          VARCHAR(100) NOT NULL,
    start_year          INT NOT NULL,
    start_month         INT NOT NULL,
    start_week_of_month INT NOT NULL,
    form_schema_json    TEXT NOT NULL,
    is_enabled          BOOLEAN DEFAULT TRUE,
    created_by          VARCHAR(100),
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE overseas.weekly_report_schemas IS '주간보고 주차구간별 동적 양식 스키마 (JSON)';
COMMENT ON COLUMN overseas.weekly_report_schemas.schema_id IS '스키마 고유 PK';
COMMENT ON COLUMN overseas.weekly_report_schemas.week_label IS '표시용 라벨 (예: 2026년 8월 2주차부터)';
COMMENT ON COLUMN overseas.weekly_report_schemas.start_year IS '적용 시작 연도';
COMMENT ON COLUMN overseas.weekly_report_schemas.start_month IS '적용 시작 월 (1-12)';
COMMENT ON COLUMN overseas.weekly_report_schemas.start_week_of_month IS '적용 시작 월내 주차 (1-5)';
COMMENT ON COLUMN overseas.weekly_report_schemas.form_schema_json IS '양식 구조 JSON (Page별 섹션/필드 정의)';
COMMENT ON COLUMN overseas.weekly_report_schemas.is_enabled IS '사용 여부 (여러 개 동시 가능, 대상 주차에 가장 가까운 시작주차의 양식이 자동 적용)';
COMMENT ON COLUMN overseas.weekly_report_schemas.created_by IS '양식 생성 관리자 username';

-- 18. 주간보고 제출 데이터 테이블 (사용자 입력)
CREATE TABLE IF NOT EXISTS overseas.weekly_report_submissions (
    submission_id       BIGSERIAL PRIMARY KEY,
    schema_id           BIGINT NOT NULL REFERENCES overseas.weekly_report_schemas(schema_id) ON DELETE RESTRICT,
    report_year         INT NOT NULL,
    report_month        INT NOT NULL,
    report_week_of_month INT NOT NULL,
    church_id           BIGINT REFERENCES overseas.churches(church_id) ON DELETE SET NULL,
    church_name         VARCHAR(150) NOT NULL,
    submitted_by         VARCHAR(100),
    submit_data_json     TEXT NOT NULL,
    photo_paths          TEXT,
    status               VARCHAR(20) DEFAULT 'SUBMITTED',
    submitted_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_report_week_church UNIQUE (report_year, report_month, report_week_of_month, church_id)
);

COMMENT ON TABLE overseas.weekly_report_submissions IS '주간보고 사용자 제출 데이터';
COMMENT ON COLUMN overseas.weekly_report_submissions.submission_id IS '제출 고유 PK';
COMMENT ON COLUMN overseas.weekly_report_submissions.schema_id IS '제출 당시 적용된 양식 스키마 FK (이력 보존)';
COMMENT ON COLUMN overseas.weekly_report_submissions.report_year IS '보고 대상 연도';
COMMENT ON COLUMN overseas.weekly_report_submissions.report_month IS '보고 대상 월 (1-12)';
COMMENT ON COLUMN overseas.weekly_report_submissions.report_week_of_month IS '보고 대상 월내 주차 (1-5)';
COMMENT ON COLUMN overseas.weekly_report_submissions.church_id IS '교회 FK';
COMMENT ON COLUMN overseas.weekly_report_submissions.church_name IS '교회명 (church 삭제 시에도 이력 보존용)';
COMMENT ON COLUMN overseas.weekly_report_submissions.submitted_by IS '제출자 username';
COMMENT ON COLUMN overseas.weekly_report_submissions.submit_data_json IS '실제 입력 데이터 JSON';
COMMENT ON COLUMN overseas.weekly_report_submissions.photo_paths IS '첨부 이미지 경로 목록 (JSON 배열)';
COMMENT ON COLUMN overseas.weekly_report_submissions.status IS '제출 상태 (SUBMITTED, REVISED)';

-- 19. 주간예배 출결 취합 - 지역 번호/표시명 매핑 테이블
CREATE TABLE IF NOT EXISTS overseas.worship_region_mapping (
    mapping_id   BIGSERIAL PRIMARY KEY,
    region_no    INT NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    is_active    BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE overseas.worship_region_mapping IS '주간예배 출결 취합 - 지역 번호(파일/시트 접두사) ↔ 표시명 매핑';
COMMENT ON COLUMN overseas.worship_region_mapping.region_no IS '지역 파일/템플릿 시트 번호 접두사 (예: 1, 2, ...)';
COMMENT ON COLUMN overseas.worship_region_mapping.display_name IS '관리자 화면에 표시할 지역명 (예: 도쿄)';
COMMENT ON COLUMN overseas.worship_region_mapping.is_active IS '현재 사용 중인 지역 여부';

-- 20. 주간예배 출결 취합 - 업로드된 템플릿(양식.xlsx) 이력 테이블
CREATE TABLE IF NOT EXISTS overseas.worship_template (
    template_id       BIGSERIAL PRIMARY KEY,
    original_filename VARCHAR(255) NOT NULL,
    stored_path       VARCHAR(500) NOT NULL,
    region_count      INT,
    is_active         BOOLEAN DEFAULT FALSE,
    uploaded_by       VARCHAR(50),
    uploaded_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE overseas.worship_template IS '주간예배 출결 취합 - 관리자가 업로드한 양식(템플릿) 파일 이력 (1개만 활성)';
COMMENT ON COLUMN overseas.worship_template.original_filename IS '업로드 당시 원본 파일명';
COMMENT ON COLUMN overseas.worship_template.stored_path IS '서버에 보관된 상대 경로';
COMMENT ON COLUMN overseas.worship_template.region_count IS '업로드 시점에 감지된 지역(시트) 개수 (참고용)';
COMMENT ON COLUMN overseas.worship_template.is_active IS '현재 취합에 사용 중인 활성 템플릿 여부';

-- 21. 전도 월말 보고서 - 업로드된 템플릿(양식) 이력 테이블
CREATE TABLE IF NOT EXISTS overseas.evangelism_report_template (
    template_id       BIGSERIAL PRIMARY KEY,
    original_filename VARCHAR(255) NOT NULL,
    stored_path       VARCHAR(500) NOT NULL,
    password          VARCHAR(200) NOT NULL,
    is_active         BOOLEAN DEFAULT FALSE,
    uploaded_by       VARCHAR(50),
    uploaded_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE overseas.evangelism_report_template IS '전도 월말 보고서 - 관리자가 업로드한 양식(템플릿) 파일 이력 (1개만 활성)';
COMMENT ON COLUMN overseas.evangelism_report_template.original_filename IS '업로드 당시 원본 파일명';
COMMENT ON COLUMN overseas.evangelism_report_template.stored_path IS '서버에 보관된 상대 경로';
COMMENT ON COLUMN overseas.evangelism_report_template.password IS '템플릿 암호화 비밀번호 (업로드 시 입력, 평문 저장)';
COMMENT ON COLUMN overseas.evangelism_report_template.is_active IS '현재 출력에 사용 중인 활성 템플릿 여부';

-- 22. 전도 월말 보고서 - 필드(열) 매핑 설정 테이블
CREATE TABLE IF NOT EXISTS overseas.evangelism_report_field_mapping (
    mapping_id     BIGSERIAL PRIMARY KEY,
    field_key      VARCHAR(50) NOT NULL UNIQUE,
    label          VARCHAR(100) NOT NULL,
    column_letter  VARCHAR(2) NOT NULL,
    data_source    VARCHAR(50) NOT NULL DEFAULT 'NONE',
    is_enabled     BOOLEAN DEFAULT FALSE
);

COMMENT ON TABLE overseas.evangelism_report_field_mapping IS '전도 월말 보고서 - 템플릿 열(D/E/G/I/K/M/O)과 데이터 소스 매핑 설정 (고정 7항목)';
COMMENT ON COLUMN overseas.evangelism_report_field_mapping.field_key IS '필드 식별자 (BASE_REG, MONTHLY_ADMIT, YTD_ADMIT, CURRENT_ATTENDANCE, ACTIVE_TEACHER, CENTER_MONTHLY, CENTER_YTD)';
COMMENT ON COLUMN overseas.evangelism_report_field_mapping.column_letter IS '템플릿 시트 내 열 문자 (예: D, E, G)';
COMMENT ON COLUMN overseas.evangelism_report_field_mapping.data_source IS '데이터 소스 (MEMBERSHIP_PREV_DEC, EVANGELISM_MONTHLY_ADMIT, EVANGELISM_YTD_ADMIT, EVANGELISM_MONTHLY_TEACHER, NONE)';
COMMENT ON COLUMN overseas.evangelism_report_field_mapping.is_enabled IS '이 필드를 실제로 채울지 여부 (보류 항목은 false)';

-- 23. 진단 상세표 카테고리별 컬럼(지표)/수식 구성 설정 테이블
CREATE TABLE IF NOT EXISTS overseas.metric_column_configs (
    config_id     BIGSERIAL PRIMARY KEY,
    category_key  VARCHAR(50) NOT NULL UNIQUE,
    columns_json  TEXT NOT NULL,
    updated_by    VARCHAR(100),
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE overseas.metric_column_configs IS '진단 상세표 카테고리별 컬럼(지표)/수식 구성 설정 (JSON)';
COMMENT ON COLUMN overseas.metric_column_configs.category_key IS '대상 카테고리 키 (diagnosisMetrics.ts의 CATS 키, 예: ①전도, ②센터)';
COMMENT ON COLUMN overseas.metric_column_configs.columns_json IS '컬럼 구성 JSON 배열 (system/custom 컬럼 정의, 순서/라벨/수식 포함)';
COMMENT ON COLUMN overseas.metric_column_configs.updated_by IS '마지막 수정 관리자 username';

-- 24. 해외선교부 현황판 - 등록/종강 수기입력 지표 테이블 (실데이터 연동 전 임시)
CREATE TABLE IF NOT EXISTS overseas.home_dashboard_manual_metrics (
    id                  BIGSERIAL PRIMARY KEY,
    church_id           BIGINT NOT NULL REFERENCES overseas.churches(church_id),
    year_month          VARCHAR(7) NOT NULL,
    registration_count  INT,
    registration_rate   NUMERIC(5, 2),
    graduation_count    INT,
    graduation_rate     NUMERIC(5, 2),
    student_pre_open    INT,
    student_elementary  INT,
    student_middle      INT,
    student_high        INT,
    updated_by          VARCHAR(100),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_home_dashboard_manual_church_month UNIQUE (church_id, year_month)
);

COMMENT ON TABLE overseas.home_dashboard_manual_metrics IS '해외선교부 현황판 - 등록/종강 수기입력 지표 (월별)';
COMMENT ON COLUMN overseas.home_dashboard_manual_metrics.year_month IS '대상 연월 (형식: YYYY-MM)';
COMMENT ON COLUMN overseas.home_dashboard_manual_metrics.registration_count IS '등록 (가개강 이후 정식 등록 인원)';
COMMENT ON COLUMN overseas.home_dashboard_manual_metrics.registration_rate IS '가개강대비 등록률 (%, 수기입력)';
COMMENT ON COLUMN overseas.home_dashboard_manual_metrics.graduation_count IS '종강수';
COMMENT ON COLUMN overseas.home_dashboard_manual_metrics.graduation_rate IS '등록대비 종강률 (%, 수기입력)';
COMMENT ON COLUMN overseas.home_dashboard_manual_metrics.student_pre_open IS '수강생현황 - 가개강 인원 (수기입력)';
COMMENT ON COLUMN overseas.home_dashboard_manual_metrics.student_elementary IS '수강생현황 - 초등 인원 (수기입력)';
COMMENT ON COLUMN overseas.home_dashboard_manual_metrics.student_middle IS '수강생현황 - 중등 인원 (수기입력)';
COMMENT ON COLUMN overseas.home_dashboard_manual_metrics.student_high IS '수강생현황 - 고등 인원 (수기입력)';

-- 25. 관리자 등록 국가별 국기 이미지 테이블
CREATE TABLE IF NOT EXISTS overseas.country_flags (
    country         VARCHAR(100) PRIMARY KEY,
    image_data_url  TEXT NOT NULL,
    updated_by      VARCHAR(100),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE overseas.country_flags IS '관리자 등록 국가별 국기 이미지 (내장 기본 국기보다 우선)';
COMMENT ON COLUMN overseas.country_flags.image_data_url IS '국기 이미지 (data URL, base64)';



-- 26. 등수예상 시뮬레이션 - 기준 재적 테이블 (연도별 기준값)
CREATE TABLE IF NOT EXISTS overseas.simulation_base_registered (
    sim_year        INT NOT NULL,
    center_name     VARCHAR(100) NOT NULL,
    base_registered INT NOT NULL DEFAULT 0,
    use_prev_auto   BOOLEAN DEFAULT FALSE,  -- TRUE: 전전년말 자동, FALSE: 직접입력
    updated_by      VARCHAR(100),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (sim_year, center_name)
);

COMMENT ON TABLE overseas.simulation_base_registered IS '등수예상 시뮬레이션 연도별 기준 재적수';
COMMENT ON COLUMN overseas.simulation_base_registered.use_prev_auto IS 'TRUE: 전년말 재적 자동 계산, FALSE: 직접 입력';

-- 27. 등수예상 시뮬레이션 - 월별 데이터 (실적 및 예상)
CREATE TABLE IF NOT EXISTS overseas.simulation_monthly_data (
    id              BIGSERIAL PRIMARY KEY,
    sim_year        INT NOT NULL,
    center_name     VARCHAR(100) NOT NULL,
    month_num       INT NOT NULL,           -- 1~12
    registered      INT,                    -- 월말 재적수 (실적)
    reg_count       INT,                    -- 월 등록수 (실적)
    grad_count      INT,                    -- 월 종강수 (실적)
    growth_rate     NUMERIC(6,2),           -- 성장율 % (예상 입력 또는 역산)
    reg_rate        NUMERIC(6,2),           -- 등록율 % (예상 입력)
    grad_rate       NUMERIC(6,2),           -- 종강율 % (예상 입력)
    is_forecast     BOOLEAN DEFAULT FALSE,  -- TRUE: 예상 데이터
    note            TEXT,
    updated_by      VARCHAR(100),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_sim_monthly UNIQUE (sim_year, center_name, month_num)
);

COMMENT ON TABLE overseas.simulation_monthly_data IS '등수예상 시뮬레이션 연도별 월별 실적/예상 데이터';
COMMENT ON COLUMN overseas.simulation_monthly_data.is_forecast IS 'TRUE: 예상 입력값, FALSE: 실적 데이터';

-- 28. 등수예상 시뮬레이션 - 차트 설정 저장
CREATE TABLE IF NOT EXISTS overseas.simulation_chart_settings (
    settings_key    VARCHAR(100) PRIMARY KEY,
    settings_value  TEXT NOT NULL,
    updated_by      VARCHAR(100),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE overseas.simulation_chart_settings IS '등수예상 시뮬레이션 차트/표시 설정 저장';
