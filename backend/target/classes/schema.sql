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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_key_lang UNIQUE (message_key, lang_code)
);

COMMENT ON TABLE overseas.i18n_dictionary IS '다국어 리소스 딕셔너리';
COMMENT ON COLUMN overseas.i18n_dictionary.dict_id IS '사전 항목 PK';
COMMENT ON COLUMN overseas.i18n_dictionary.message_key IS '다국어 메시지 키';
COMMENT ON COLUMN overseas.i18n_dictionary.lang_code IS '언어 코드 (ko, en, th, zh, ja)';
COMMENT ON COLUMN overseas.i18n_dictionary.message_value IS '번역 텍스트 값';
COMMENT ON COLUMN overseas.i18n_dictionary.category IS '카테고리 (UI, DIAGNOSIS, ADMIN)';

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
