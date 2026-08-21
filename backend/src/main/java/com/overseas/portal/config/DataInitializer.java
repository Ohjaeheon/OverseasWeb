package com.overseas.portal.config;

import com.overseas.portal.domain.*;
import com.overseas.portal.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ChurchRepository churchRepository;
    private final FaithProcessRecordRepository faithProcessRecordRepository;
    private final SystemConfigRepository systemConfigRepository;
    private final PasswordEncoder passwordEncoder;
    private final EvangelismWeeklyRecordRepository evangelismWeeklyRecordRepository;
    private final WorshipRegionMappingRepository worshipRegionMappingRepository;
    private final EvangelismReportFieldMappingRepository evangelismReportFieldMappingRepository;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("Checking and initializing default system data...");

        try {
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS overseas.business_board_attachments (" +
                    "attachment_id BIGSERIAL PRIMARY KEY, " +
                    "post_id BIGINT NOT NULL, " +
                    "doc_type VARCHAR(50) NOT NULL, " +
                    "file_name VARCHAR(255) NOT NULL, " +
                    "file_path VARCHAR(500) NOT NULL, " +
                    "file_size BIGINT NOT NULL" +
                    ");");
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS overseas.business_board_post_referrers (" +
                    "post_id BIGINT NOT NULL, " +
                    "referrer_username VARCHAR(100) NOT NULL, " +
                    "PRIMARY KEY (post_id, referrer_username)" +
                    ");");
            
            // overseas.i18n_dictionary 컬럼 추가 (사용여부 / 최종수정자) — 기존 DB 업그레이드용
            jdbcTemplate.execute("ALTER TABLE overseas.i18n_dictionary ADD COLUMN IF NOT EXISTS use_yn CHAR(1) NOT NULL DEFAULT 'Y';");
            jdbcTemplate.execute("ALTER TABLE overseas.i18n_dictionary ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);");

            // overseas.churches 컬럼 추가 및 해선부 노드 처리
            jdbcTemplate.execute("ALTER TABLE overseas.churches ADD COLUMN IF NOT EXISTS is_exposed BOOLEAN DEFAULT TRUE;");
            jdbcTemplate.execute("ALTER TABLE overseas.churches ADD COLUMN IF NOT EXISTS is_org_only BOOLEAN DEFAULT FALSE;");
            jdbcTemplate.execute("ALTER TABLE overseas.churches ADD COLUMN IF NOT EXISTS founding_date DATE;");

            // 해외선교부 현황판 - 등록/종강 수기입력 지표 테이블 (실데이터 연동 전 임시)
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS overseas.home_dashboard_manual_metrics (" +
                    "id BIGSERIAL PRIMARY KEY, " +
                    "church_id BIGINT NOT NULL REFERENCES overseas.churches(church_id), " +
                    "year_month VARCHAR(7) NOT NULL, " +
                    "registration_count INT, " +
                    "registration_rate NUMERIC(5, 2), " +
                    "graduation_count INT, " +
                    "graduation_rate NUMERIC(5, 2), " +
                    "updated_by VARCHAR(100), " +
                    "updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, " +
                    "CONSTRAINT uq_home_dashboard_manual_church_month UNIQUE (church_id, year_month)" +
                    ");");
            jdbcTemplate.execute("ALTER TABLE overseas.home_dashboard_manual_metrics ADD COLUMN IF NOT EXISTS student_pre_open INT;");
            jdbcTemplate.execute("ALTER TABLE overseas.home_dashboard_manual_metrics ADD COLUMN IF NOT EXISTS student_elementary INT;");
            jdbcTemplate.execute("ALTER TABLE overseas.home_dashboard_manual_metrics ADD COLUMN IF NOT EXISTS student_middle INT;");
            jdbcTemplate.execute("ALTER TABLE overseas.home_dashboard_manual_metrics ADD COLUMN IF NOT EXISTS student_high INT;");

            // 관리자 등록 국가별 국기 이미지 테이블
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS overseas.country_flags (" +
                    "country VARCHAR(100) PRIMARY KEY, " +
                    "image_data_url TEXT NOT NULL, " +
                    "updated_by VARCHAR(100), " +
                    "updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP" +
                    ");");

            // 조직 계층 관리 - 해외교회/지역/개척지(churches, /adminsetting/faith-records 목록) > 부서 > 팀 > 회원
            // (결재 라우팅 등 향후 조직 기반 기능의 토대, 기존 권한 그룹/users.assigned_country와는 무관한 별개 개념).
            // 국가별로 묶지 않고 그 목록의 개별 항목(church_id) 각각을 최상위 조직 단위로 사용한다.
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS overseas.departments (" +
                    "id BIGSERIAL PRIMARY KEY, " +
                    "church_id BIGINT NOT NULL, " +
                    "name VARCHAR(100) NOT NULL, " +
                    "leader_user_id BIGINT REFERENCES overseas.users(user_id) ON DELETE SET NULL, " +
                    "created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, " +
                    "updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP" +
                    ");");
            // 개발 중 country(VARCHAR) 기준으로 먼저 만들어졌던 이전 버전을 church_id 기준으로 정리한다
            // (아직 실 데이터가 쌓이기 전이라 컬럼 교체만으로 충분하다).
            jdbcTemplate.execute("ALTER TABLE overseas.departments DROP CONSTRAINT IF EXISTS uq_department_country_name;");
            jdbcTemplate.execute("ALTER TABLE overseas.departments DROP COLUMN IF EXISTS country;");
            jdbcTemplate.execute("ALTER TABLE overseas.departments ADD COLUMN IF NOT EXISTS church_id BIGINT;");
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS overseas.teams (" +
                    "id BIGSERIAL PRIMARY KEY, " +
                    "department_id BIGINT NOT NULL REFERENCES overseas.departments(id) ON DELETE CASCADE, " +
                    "name VARCHAR(100) NOT NULL, " +
                    "leader_user_id BIGINT REFERENCES overseas.users(user_id) ON DELETE SET NULL, " +
                    "created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, " +
                    "updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, " +
                    "CONSTRAINT uq_team_department_name UNIQUE (department_id, name)" +
                    ");");
            jdbcTemplate.execute("ALTER TABLE overseas.users ADD COLUMN IF NOT EXISTS department_id BIGINT;");
            jdbcTemplate.execute("ALTER TABLE overseas.users ADD COLUMN IF NOT EXISTS team_id BIGINT;");
            // ddl-auto:update가 CommandLineRunner보다 먼저 실행되며, departments/teams/users의 department_id·team_id
            // 컬럼을 JPA 엔티티의 스칼라 Long 필드(@ManyToOne 미사용)만으로 먼저 만들어버릴 수 있다. 이 경우 위
            // CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS에 적어둔 REFERENCES·UNIQUE 절은 전부 무시된다
            // (컬럼/테이블이 이미 존재해 구문 자체가 스킵되기 때문). 그래서 FK/UNIQUE 제약은 존재 여부를 직접
            // 확인한 뒤 없으면 추가하는 방식으로 별도 보장한다.
            addConstraintIfMissing("uq_department_church_name",
                    "ALTER TABLE overseas.departments ADD CONSTRAINT uq_department_church_name UNIQUE (church_id, name)");
            addConstraintIfMissing("uq_team_department_name",
                    "ALTER TABLE overseas.teams ADD CONSTRAINT uq_team_department_name UNIQUE (department_id, name)");
            addConstraintIfMissing("fk_department_church",
                    "ALTER TABLE overseas.departments ADD CONSTRAINT fk_department_church FOREIGN KEY (church_id) REFERENCES overseas.churches(church_id) ON DELETE CASCADE");
            addConstraintIfMissing("fk_department_leader",
                    "ALTER TABLE overseas.departments ADD CONSTRAINT fk_department_leader FOREIGN KEY (leader_user_id) REFERENCES overseas.users(user_id) ON DELETE SET NULL");
            addConstraintIfMissing("fk_team_department",
                    "ALTER TABLE overseas.teams ADD CONSTRAINT fk_team_department FOREIGN KEY (department_id) REFERENCES overseas.departments(id) ON DELETE CASCADE");
            addConstraintIfMissing("fk_team_leader",
                    "ALTER TABLE overseas.teams ADD CONSTRAINT fk_team_leader FOREIGN KEY (leader_user_id) REFERENCES overseas.users(user_id) ON DELETE SET NULL");
            addConstraintIfMissing("fk_user_department",
                    "ALTER TABLE overseas.users ADD CONSTRAINT fk_user_department FOREIGN KEY (department_id) REFERENCES overseas.departments(id) ON DELETE SET NULL");
            addConstraintIfMissing("fk_user_team",
                    "ALTER TABLE overseas.users ADD CONSTRAINT fk_user_team FOREIGN KEY (team_id) REFERENCES overseas.teams(id) ON DELETE SET NULL");

            // 해외선교부 현황판 카테고리의 기본 컬럼/수식 구성 시드 (이미 관리자가 저장했으면 건드리지 않음)
            String overseasBoardColumnsJson = """
                    [
                      {"kind":"system","systemId":"prevYearEndReg","enabled":true,"order":0},
                      {"kind":"system","systemId":"currentReg","enabled":true,"order":1},
                      {"kind":"custom","uid":"seed_growth_rate","id":"growthRate","label":"증가율","valueType":"pct","sourceType":"formula","formula":"currentReg / prevYearEndReg","group":"재적","enabled":true,"order":2},
                      {"kind":"system","systemId":"preOpen","enabled":true,"order":3},
                      {"kind":"system","systemId":"registrationCount","enabled":true,"order":4},
                      {"kind":"system","systemId":"registrationRate","enabled":true,"order":5},
                      {"kind":"system","systemId":"graduationCount","enabled":true,"order":6},
                      {"kind":"system","systemId":"graduationRate","enabled":true,"order":7},
                      {"kind":"system","systemId":"studentPreOpen","enabled":true,"order":8},
                      {"kind":"system","systemId":"studentElementary","enabled":true,"order":9},
                      {"kind":"system","systemId":"studentMiddle","enabled":true,"order":10},
                      {"kind":"system","systemId":"studentHigh","enabled":true,"order":11}
                    ]
                    """;
            jdbcTemplate.update(
                    "INSERT INTO overseas.metric_column_configs (category_key, columns_json) VALUES (?, ?) ON CONFLICT (category_key) DO NOTHING",
                    "해외선교부 현황판", overseasBoardColumnsJson);

            // 해선부 본부 노드 (ID = 0L) 등록 및 조직도 전용 설정
            jdbcTemplate.execute("INSERT INTO overseas.churches (church_id, continent, country, jipa, gubun, name, leader_name, flight_time, distance_km, time_diff, language, religion, is_active, is_exposed, is_org_only) " +
                    "VALUES (0, '본부', '한국', '본부', '부서', '해선부', '해외선교부장', '', 0, '', '', '', true, true, true) " +
                    "ON CONFLICT (church_id) DO UPDATE SET is_org_only = true, continent = '본부', jipa = '본부';");

            // 본부 또는 해선부 기존 노드가 있다면 is_org_only = true로 일괄 업데이트
            jdbcTemplate.execute("UPDATE overseas.churches SET is_org_only = true WHERE continent = '본부' OR jipa = '본부' OR name = '해선부';");
            
            log.info("Programmatically verified/created board tables, church columns, and HaeSeonBu headquarter node.");
        } catch (Exception e) {
            log.error("Failed to initialize board tables or HaeSeonBu: {}", e.getMessage());
        }

        // 1. Initial Admin & Test Users
        if (!userRepository.existsByUsername("admin")) {
            User admin = User.builder()
                    .username("admin")
                    .passwordHash(passwordEncoder.encode("admin123!"))
                    .name("관리자")
                    .role("ROLE_ADMIN")
                    .assignedCountry("전체")
                    .telegramId("@overseas_admin")
                    .telegramChatId("123456789")
                    .isActive(true)
                    .build();
            userRepository.save(admin);
            log.info("Created default admin user: admin / admin123!");
        }

        if (!userRepository.existsByUsername("user")) {
            User user = User.builder()
                    .username("user")
                    .passwordHash(passwordEncoder.encode("user123!"))
                    .name("해외선교부 담당자")
                    .role("ROLE_USER")
                    .assignedCountry("일본")
                    .telegramId("@overseas_user")
                    .telegramChatId("987654321")
                    .isActive(true)
                    .build();
            userRepository.save(user);
            log.info("Created default user: user / user123!");
        }

        // 2. Initial Telegram Config
        if (systemConfigRepository.findByConfigKey("TELEGRAM_BOT_TOKEN").isEmpty()) {
            systemConfigRepository.save(SystemConfig.builder()
                    .configKey("TELEGRAM_BOT_TOKEN")
                    .configValue("7894561230:AAExampleTokenForOverseasPortal")
                    .description("텔레그램 OTP 발송용 봇 API 토큰")
                    .build());
        }

        if (systemConfigRepository.findByConfigKey("evangelism_items_by_country").isEmpty()) {
            systemConfigRepository.save(SystemConfig.builder()
                    .configKey("evangelism_items_by_country")
                    .configValue("{\"default\":[{\"key\":\"find\",\"label\":\"찾\",\"fullName\":\"찾기\",\"color\":\"#2563eb\",\"isDrop\":false,\"groupName\":\"찾기 상세분석\",\"groupDesc\":\"주차별 찾기와 탈락수를 볼 수 있습니다.\"},{\"key\":\"findDrop\",\"label\":\"탈\",\"color\":\"#dc2626\",\"isDrop\":true,\"groupName\":\"찾기 상세분석\"},{\"key\":\"gospel\",\"label\":\"복\",\"fullName\":\"복음방\",\"color\":\"#7c3aed\",\"isDrop\":false,\"groupName\":\"복음방 상세분석\",\"groupDesc\":\"주차별 복음방과 탈락수를 볼 수 있습니다.\"},{\"key\":\"gospelDrop\",\"label\":\"탈\",\"color\":\"#dc2626\",\"isDrop\":true,\"groupName\":\"복음방 상세분석\"},{\"key\":\"admit\",\"label\":\"개\",\"fullName\":\"개강\",\"color\":\"#16a34a\",\"isDrop\":false,\"groupName\":\"개강 상세분석\",\"groupDesc\":\"주차별 개강과 탈락수를 볼 수 있습니다.\"},{\"key\":\"admitDrop\",\"label\":\"탈\",\"color\":\"#dc2626\",\"isDrop\":true,\"groupName\":\"개강 상세분석\"}]}")
                    .description("국가별 전도 실적 가변 항목 설정 (JSON)")
                    .build());
        }

        // 2-1. Initial Help Description Configs
        if (systemConfigRepository.findByConfigKey("DESC_EVANGELISM_STATUS_1").isEmpty()) {
            systemConfigRepository.save(SystemConfig.builder()
                    .configKey("DESC_EVANGELISM_STATUS_1")
                    .configValue("선택한 교회의 주차별 전도 현황을 요약하여 한눈에 볼 수 있는 메인 대시보드 표입니다.")
                    .description("(1) 회별 전도 현황 도움말 설명")
                    .build());
        }
        if (systemConfigRepository.findByConfigKey("DESC_FIND_DETAIL_2").isEmpty()) {
            systemConfigRepository.save(SystemConfig.builder()
                    .configKey("DESC_FIND_DETAIL_2")
                    .configValue("주차별 찾기와 탈락수를 볼 수 있습니다.")
                    .description("(2) 찾기 상세분석 도움말 설명")
                    .build());
        }
        if (systemConfigRepository.findByConfigKey("DESC_GOSPEL_DETAIL_3").isEmpty()) {
            systemConfigRepository.save(SystemConfig.builder()
                    .configKey("DESC_GOSPEL_DETAIL_3")
                    .configValue("주차별 복음방과 탈락수를 볼 수 있습니다.")
                    .description("(3) 복음방 상세분석 도움말 설명")
                    .build());
        }
        if (systemConfigRepository.findByConfigKey("DESC_ADMIT_DETAIL_4").isEmpty()) {
            systemConfigRepository.save(SystemConfig.builder()
                    .configKey("DESC_ADMIT_DETAIL_4")
                    .configValue("주차별 가개강(등록)과 탈락수를 볼 수 있습니다.")
                    .description("(4) 가개강 상세분석 도움말 설명")
                    .build());
        }

        if (systemConfigRepository.findByConfigKey("backdoor_allowed_ips").isEmpty()) {
            systemConfigRepository.save(SystemConfig.builder()
                    .configKey("backdoor_allowed_ips")
                    .configValue("[\"127.0.0.1\",\"0:0:0:0:0:0:0:1\",\"::1\"]")
                    .description("백도어 허용 IP 리스트 (JSON Array)")
                    .build());
        }

        // 3. Seed All 21 Churches and 42 Faith Records from data.js into PostgreSQL DB if count < 21
        if (churchRepository.count() < 21) {
            log.info("Seeding all 21 churches and 42 faith process records from data.js into PostgreSQL overseas database...");
            try {
                faithProcessRecordRepository.deleteAllInBatch();
                churchRepository.deleteAllInBatch();
            } catch (Exception e) {
                log.warn("Clearing existing church data: {}", e.getMessage());
            }

            Map<String, Church> churchMap = new HashMap<>();
            Church church_0 = Church.builder()
                    .continent("아시아")
                    .country("일본")
                    .jipa("맛디아")
                    .gubun("교회")
                    .name("도쿄교회")
                    .leaderName("도쿄 담임사역자")
                    .flightTime("직항 약 2시간 30분")
                    .distanceKm(1200)
                    .timeDiff("시차 없음 (한국과 동일)")
                    .language("일본어")
                    .religion("신토 · 불교")
                    .lat(new BigDecimal("35.6812546"))
                    .lon(new BigDecimal("139.766706"))
                    .isActive(true)
                    .build();
            churchRepository.save(church_0);
            churchMap.put("도쿄교회", church_0);
            Church church_1 = Church.builder()
                    .continent("북아메리카")
                    .country("미국")
                    .jipa("맛디아")
                    .gubun("교회")
                    .name("텍사스교회")
                    .leaderName("텍사스 담임사역자")
                    .flightTime("직항 약 14시간")
                    .distanceKm(11200)
                    .timeDiff("한국보다 14시간 느림")
                    .language("영어")
                    .religion("개신교 · 가톨릭")
                    .lat(new BigDecimal("31.2638905"))
                    .lon(new BigDecimal("-98.5456116"))
                    .isActive(true)
                    .build();
            churchRepository.save(church_1);
            churchMap.put("텍사스교회", church_1);
            Church church_2 = Church.builder()
                    .continent("유럽")
                    .country("튀르키예")
                    .jipa("맛디아")
                    .gubun("교회")
                    .name("튀르키예교회")
                    .leaderName("튀르키예 담임사역자")
                    .flightTime("직항 약 11시간")
                    .distanceKm(7900)
                    .timeDiff("한국보다 6시간 느림")
                    .language("튀르키예어")
                    .religion("이슬람교 (99%)")
                    .lat(new BigDecimal("41.006381"))
                    .lon(new BigDecimal("28.9758715"))
                    .isActive(true)
                    .build();
            churchRepository.save(church_2);
            churchMap.put("튀르키예교회", church_2);
            Church church_3 = Church.builder()
                    .continent("아시아")
                    .country("파키스탄")
                    .jipa("맛디아")
                    .gubun("교회")
                    .name("파키스탄교회")
                    .leaderName("파키스탄 담임사역자")
                    .flightTime("직항 약 8시간 30분")
                    .distanceKm(5300)
                    .timeDiff("한국보다 4시간 느림")
                    .language("우르두어 · 영어")
                    .religion("이슬람교 (96%)")
                    .lat(new BigDecimal("31.5656822"))
                    .lon(new BigDecimal("74.3141829"))
                    .isActive(true)
                    .build();
            churchRepository.save(church_3);
            churchMap.put("파키스탄교회", church_3);
            Church church_4 = Church.builder()
                    .continent("아시아")
                    .country("인도")
                    .jipa("맛디아")
                    .gubun("교회")
                    .name("인도첸나이교회")
                    .leaderName("인도첸나이교회 담임사역자")
                    .flightTime("직항 약 8시간 50분")
                    .distanceKm(5600)
                    .timeDiff("한국보다 3시간 30분 느림")
                    .language("힌디어 · 타밀어 · 영어")
                    .religion("힌두교 (79%) · 이슬람교 · 기독교")
                    .lat(new BigDecimal("13.0836939"))
                    .lon(new BigDecimal("80.270186"))
                    .isActive(true)
                    .build();
            churchRepository.save(church_4);
            churchMap.put("인도첸나이교회", church_4);
            Church church_5 = Church.builder()
                    .continent("아프리카")
                    .country("콩고민주공화국")
                    .jipa("맛디아")
                    .gubun("교회")
                    .name("콩고민주공화국킨샤사교회")
                    .leaderName("콩고민주공화국킨샤사 담임사역자")
                    .flightTime("경유 약 17시간")
                    .distanceKm(11800)
                    .timeDiff("한국보다 8시간 느림")
                    .language("프랑스어 · 링갈라어")
                    .religion("가톨릭 (50%) · 개신교 (35%)")
                    .lat(new BigDecimal("-4.32171"))
                    .lon(new BigDecimal("15.3122511"))
                    .isActive(true)
                    .build();
            churchRepository.save(church_5);
            churchMap.put("콩고민주공화국킨샤사교회", church_5);
            Church church_6 = Church.builder()
                    .continent("아시아")
                    .country("카자흐스탄")
                    .jipa("맛디아")
                    .gubun("지역")
                    .name("대전교회카자흐스탄아스타나지역")
                    .leaderName("카자흐스탄아스타나 담임사역자")
                    .flightTime("직항 약 6시간 30분")
                    .distanceKm(4760)
                    .timeDiff("한국보다 4시간 느림")
                    .language("카자흐어 · 러시아어")
                    .religion("이슬람교 (70%) · 정교회")
                    .lat(new BigDecimal("51.1159933"))
                    .lon(new BigDecimal("71.4677059"))
                    .isActive(true)
                    .build();
            churchRepository.save(church_6);
            churchMap.put("대전교회카자흐스탄아스타나지역", church_6);
            Church church_7 = Church.builder()
                    .continent("유럽")
                    .country("포르투갈")
                    .jipa("맛디아")
                    .gubun("지역")
                    .name("대전교회포르투갈리스본지역")
                    .leaderName("포르투갈리스본 담임사역자")
                    .flightTime("경유 약 14시간 30분")
                    .distanceKm(9600)
                    .timeDiff("한국보다 8시간 느림")
                    .language("포르투갈어")
                    .religion("가톨릭 (81%)")
                    .lat(new BigDecimal("38.7077507"))
                    .lon(new BigDecimal("-9.1365919"))
                    .isActive(true)
                    .build();
            churchRepository.save(church_7);
            churchMap.put("대전교회포르투갈리스본지역", church_7);
            Church church_8 = Church.builder()
                    .continent("중앙아메리카")
                    .country("멕시코")
                    .jipa("맛디아")
                    .gubun("지역")
                    .name("천안교회멕시코과달라하라지역")
                    .leaderName("멕시코과달라하라 담임사역자")
                    .flightTime("경유 약 16시간")
                    .distanceKm(11800)
                    .timeDiff("한국보다 15시간 느림")
                    .language("스페인어")
                    .religion("가톨릭 (78%)")
                    .lat(new BigDecimal("20.6720375"))
                    .lon(new BigDecimal("-103.338396"))
                    .isActive(true)
                    .build();
            churchRepository.save(church_8);
            churchMap.put("천안교회멕시코과달라하라지역", church_8);
            Church church_9 = Church.builder()
                    .continent("남아메리카")
                    .country("브라질")
                    .jipa("맛디아")
                    .gubun("지역")
                    .name("청주교회브라질리우데자네이루지역")
                    .leaderName("브라질리우데자네이루 담임사역자")
                    .flightTime("경유 약 23시간")
                    .distanceKm(17900)
                    .timeDiff("한국보다 12시간 느림")
                    .language("포르투갈어")
                    .religion("가톨릭 (64%) · 개신교 (22%)")
                    .lat(new BigDecimal("-22.9110137"))
                    .lon(new BigDecimal("-43.2093727"))
                    .isActive(true)
                    .build();
            churchRepository.save(church_9);
            churchMap.put("청주교회브라질리우데자네이루지역", church_9);
            Church church_10 = Church.builder()
                    .continent("아시아")
                    .country("인도네시아")
                    .jipa("맛디아")
                    .gubun("지역")
                    .name("인도첸나이교회인도네시아마카사르지역")
                    .leaderName("인도네시아마카사르 담임사역자")
                    .flightTime("직항 약 7시간")
                    .distanceKm(5200)
                    .timeDiff("한국보다 2시간 느림")
                    .language("인도네시아어")
                    .religion("이슬람교 (87%) · 개신교 (7%)")
                    .lat(new BigDecimal("-5.1342962"))
                    .lon(new BigDecimal("119.4124282"))
                    .isActive(true)
                    .build();
            churchRepository.save(church_10);
            churchMap.put("인도첸나이교회인도네시아마카사르지역", church_10);
            Church church_11 = Church.builder()
                    .continent("")
                    .country("")
                    .jipa("맛디아")
                    .gubun("개척지")
                    .name("대전교회해외개척지역")
                    .leaderName("해외개척 담임사역자")
                    .flightTime("직항 약 8시간")
                    .distanceKm(6500)
                    .timeDiff("한국보다 4시간 느림")
                    .language("현지어 · 영어")
                    .religion("기독교 · 주요종교")
                    .lat(new BigDecimal("None"))
                    .lon(new BigDecimal("None"))
                    .isActive(true)
                    .build();
            churchRepository.save(church_11);
            churchMap.put("대전교회해외개척지역", church_11);
            Church church_12 = Church.builder()
                    .continent("")
                    .country("")
                    .jipa("맛디아")
                    .gubun("개척지")
                    .name("청주교회해외개척지역")
                    .leaderName("해외개척 담임사역자")
                    .flightTime("직항 약 8시간")
                    .distanceKm(6500)
                    .timeDiff("한국보다 4시간 느림")
                    .language("현지어 · 영어")
                    .religion("기독교 · 주요종교")
                    .lat(new BigDecimal("None"))
                    .lon(new BigDecimal("None"))
                    .isActive(true)
                    .build();
            churchRepository.save(church_12);
            churchMap.put("청주교회해외개척지역", church_12);
            Church church_13 = Church.builder()
                    .continent("")
                    .country("")
                    .jipa("맛디아")
                    .gubun("개척지")
                    .name("텍사스교회해외개척지역")
                    .leaderName("텍사스해외개척 담임사역자")
                    .flightTime("직항 약 8시간")
                    .distanceKm(6500)
                    .timeDiff("한국보다 4시간 느림")
                    .language("현지어 · 영어")
                    .religion("기독교 · 주요종교")
                    .lat(new BigDecimal("None"))
                    .lon(new BigDecimal("None"))
                    .isActive(true)
                    .build();
            churchRepository.save(church_13);
            churchMap.put("텍사스교회해외개척지역", church_13);
            Church church_14 = Church.builder()
                    .continent("")
                    .country("")
                    .jipa("맛디아")
                    .gubun("개척지")
                    .name("인도첸나이교회해외개척지역")
                    .leaderName("해외개척 담임사역자")
                    .flightTime("직항 약 8시간")
                    .distanceKm(6500)
                    .timeDiff("한국보다 4시간 느림")
                    .language("현지어 · 영어")
                    .religion("기독교 · 주요종교")
                    .lat(new BigDecimal("None"))
                    .lon(new BigDecimal("None"))
                    .isActive(true)
                    .build();
            churchRepository.save(church_14);
            churchMap.put("인도첸나이교회해외개척지역", church_14);
            Church church_15 = Church.builder()
                    .continent("아시아")
                    .country("인도")
                    .jipa("맛디아")
                    .gubun("지역")
                    .name("인도첸나이인도하이데라바드지역")
                    .leaderName("인도하이데라바드 담임사역자")
                    .flightTime("직항 약 8시간 50분")
                    .distanceKm(5600)
                    .timeDiff("한국보다 3시간 30분 느림")
                    .language("힌디어 · 타밀어 · 영어")
                    .religion("힌두교 (79%) · 이슬람교 · 기독교")
                    .lat(new BigDecimal("17.385"))
                    .lon(new BigDecimal("78.4867"))
                    .isActive(true)
                    .build();
            churchRepository.save(church_15);
            churchMap.put("인도첸나이인도하이데라바드지역", church_15);
            Church church_16 = Church.builder()
                    .continent("아시아")
                    .country("인도")
                    .jipa("맛디아")
                    .gubun("지역")
                    .name("인도첸나이인도뭄바이지역")
                    .leaderName("인도뭄바이 담임사역자")
                    .flightTime("직항 약 8시간 50분")
                    .distanceKm(5600)
                    .timeDiff("한국보다 3시간 30분 느림")
                    .language("힌디어 · 타밀어 · 영어")
                    .religion("힌두교 (79%) · 이슬람교 · 기독교")
                    .lat(new BigDecimal("19.076"))
                    .lon(new BigDecimal("72.8777"))
                    .isActive(true)
                    .build();
            churchRepository.save(church_16);
            churchMap.put("인도첸나이인도뭄바이지역", church_16);
            Church church_17 = Church.builder()
                    .continent("아시아")
                    .country("인도")
                    .jipa("맛디아")
                    .gubun("지역")
                    .name("인도첸나이인도오디샤지역")
                    .leaderName("인도오디샤 담임사역자")
                    .flightTime("직항 약 8시간 50분")
                    .distanceKm(5600)
                    .timeDiff("한국보다 3시간 30분 느림")
                    .language("힌디어 · 타밀어 · 영어")
                    .religion("힌두교 (79%) · 이슬람교 · 기독교")
                    .lat(new BigDecimal("20.2961"))
                    .lon(new BigDecimal("85.8245"))
                    .isActive(true)
                    .build();
            churchRepository.save(church_17);
            churchMap.put("인도첸나이인도오디샤지역", church_17);
            Church church_18 = Church.builder()
                    .continent("아시아")
                    .country("인도")
                    .jipa("맛디아")
                    .gubun("지역")
                    .name("인도첸나이인도카르나타카서부지역")
                    .leaderName("인도카르나타카서부 담임사역자")
                    .flightTime("직항 약 8시간 50분")
                    .distanceKm(5600)
                    .timeDiff("한국보다 3시간 30분 느림")
                    .language("힌디어 · 타밀어 · 영어")
                    .religion("힌두교 (79%) · 이슬람교 · 기독교")
                    .lat(new BigDecimal("12.9141"))
                    .lon(new BigDecimal("74.856"))
                    .isActive(true)
                    .build();
            churchRepository.save(church_18);
            churchMap.put("인도첸나이인도카르나타카서부지역", church_18);
            Church church_19 = Church.builder()
                    .continent("아프리카")
                    .country("카메룬")
                    .jipa("맛디아")
                    .gubun("지역")
                    .name("텍사스교회부에아지역")
                    .leaderName("텍사스부에아 담임사역자")
                    .flightTime("경유 약 18시간")
                    .distanceKm(11500)
                    .timeDiff("한국보다 8시간 느림")
                    .language("프랑스어 · 영어")
                    .religion("가톨릭 (38%) · 개신교 (26%) · 이슬람교")
                    .lat(new BigDecimal("4.1567895"))
                    .lon(new BigDecimal("9.2315915"))
                    .isActive(true)
                    .build();
            churchRepository.save(church_19);
            churchMap.put("텍사스교회부에아지역", church_19);
            Church church_20 = Church.builder()
                    .continent("아시아")
                    .country("인도네시아")
                    .jipa("맛디아")
                    .gubun("지역")
                    .name("인도첸나이교회인도네시아쿠팡지역")
                    .leaderName("인도네시아쿠팡 담임사역자")
                    .flightTime("직항 약 7시간")
                    .distanceKm(5200)
                    .timeDiff("한국보다 2시간 느림")
                    .language("인도네시아어")
                    .religion("이슬람교 (87%) · 개신교 (7%)")
                    .lat(new BigDecimal("-10.1632209"))
                    .lon(new BigDecimal("123.6017755"))
                    .isActive(true)
                    .build();
            churchRepository.save(church_20);
            churchMap.put("인도첸나이교회인도네시아쿠팡지역", church_20);
            log.info("Successfully seeded 21 churches with enriched metadata into PostgreSQL database!");
        }

        // 4. Seed default worship region mapping (matches the 19 sheets currently in 양식.xlsx)
        if (worshipRegionMappingRepository.count() == 0) {
            log.info("Seeding default worship region mapping (19 regions)...");
            String[][] defaults = {
                    {"1", "도쿄"}, {"2", "텍사스"}, {"3", "튀르키예"}, {"4", "파키스탄"},
                    {"5", "인도첸나이"}, {"6", "민주콩고"}, {"7", "카자흐스탄"}, {"8", "포르투갈"},
                    {"9", "멕시코"}, {"10", "브라질"}, {"11", "카메룬부에아"}, {"12", "인니(마카사르)"},
                    {"13", "인도하이데라바드"}, {"14", "인도뭄바이"}, {"15", "인도오디샤"},
                    {"16", "인도카르나타카서부"}, {"17", "인니(쿠팡)"}, {"18", "모잠비크"}, {"19", "카메룬"}
            };
            for (String[] d : defaults) {
                worshipRegionMappingRepository.save(WorshipRegionMapping.builder()
                        .regionNo(Integer.parseInt(d[0]))
                        .displayName(d[1])
                        .isActive(true)
                        .build());
            }
            log.info("Successfully seeded {} worship region mappings.", defaults.length);
        }

        // 5. Seed default evangelism monthly report field mapping (7 fixed fields)
        if (evangelismReportFieldMappingRepository.count() == 0) {
            log.info("Seeding default evangelism report field mapping (7 fields)...");
            Object[][] defaults = {
                    {"BASE_REG", "금년초재적 (전년도 12월 재적)", "D", "MEMBERSHIP_PREV_DEC", true},
                    {"MONTHLY_ADMIT", "월등록 (당월 개강)", "E", "EVANGELISM_MONTHLY_ADMIT", true},
                    {"YTD_ADMIT", "등록 연누계", "G", "EVANGELISM_YTD_ADMIT", true},
                    {"CURRENT_ATTENDANCE", "현재 출석수", "I", "NONE", false},
                    {"ACTIVE_TEACHER", "활동교사수", "K", "EVANGELISM_MONTHLY_TEACHER", true},
                    {"CENTER_MONTHLY", "월센터등록", "M", "NONE", false},
                    {"CENTER_YTD", "센터등록 연누계", "O", "NONE", false}
            };
            for (Object[] d : defaults) {
                evangelismReportFieldMappingRepository.save(EvangelismReportFieldMapping.builder()
                        .fieldKey((String) d[0])
                        .label((String) d[1])
                        .columnLetter((String) d[2])
                        .dataSource((String) d[3])
                        .isEnabled((Boolean) d[4])
                        .build());
            }
            log.info("Successfully seeded {} evangelism report field mappings.", defaults.length);
        }

        // 6. Seed menu message dictionary (i18n_dictionary) — 프론트 메뉴 대/중/소분류 라벨(한국어/영어)
        //    이미 등록/수정된 키는 절대 덮어쓰지 않는다 (ON CONFLICT DO NOTHING).
        String[][] menuSeeds = {
                // {message_key, ko, en}
                // 사용자 포탈 — 최상위(그룹 없음)
                {"menu.user.home", "홈 (종합 현황)", "Home (Overview)"},
                {"menu.user.calendar", "캘린더", "Calendar"},
                {"menu.user.organization", "조직도", "Organization Chart"},
                // 사용자 포탈 — 게시판
                {"menu.user.grp.게시판", "게시판", "Board"},
                {"menu.user.notice", "공지사항", "Notices"},
                // 사용자 포탈 — 진단
                {"menu.user.grp.진단", "진 단", "Diagnosis"},
                {"menu.user.diag", "교회 진단서", "Church Diagnosis"},
                {"menu.user.inspect", "점검 (양·질)", "Inspection (Quantity·Quality)"},
                {"menu.user.funnel", "관문별 통과율", "Funnel Pass Rate"},
                // 사용자 포탈 — 신앙 프로세스
                {"menu.user.grp.신앙프로세스", "신앙 프로세스", "Faith Process"},
                {"menu.user.p1", "전도·가개강", "Evangelism·Provisional Enrollment"},
                {"menu.user.child.p1_check", "①-1. 교회별 데이터 확인", "①-1. Check by Church"},
                {"menu.user.child.p1_agg", "①-2. 주간보고", "①-2. Weekly Report"},
                {"menu.user.child.p1_plan", "①-3. 계획", "①-3. Plan"},
                {"menu.user.child.p1_monthly", "①-4. 월간보고", "①-4. Monthly Report"},
                {"menu.user.child.p1_report", "①-5. 월말보고서 출력", "①-5. Print Monthly Report"},
                {"menu.user.p2", "센터", "Center"},
                {"menu.user.p3", "내무", "Membership"},
                {"menu.user.child.p3_check", "③-1. 교회별 데이터 확인", "③-1. Check by Church"},
                {"menu.user.child.p3_input", "③-2. 월별 데이터 입력", "③-2. Monthly Data Entry"},
                {"menu.user.p4", "예배", "Worship"},
                // 사용자 포탈 — 업무
                {"menu.user.grp.업무", "업 무", "Business"},
                {"menu.user.business", "재정", "Finance"},
                {"menu.user.child.ledger", "원장헌금", "Ledger Offering"},
                {"menu.user.child.ledger_archive", "ㄴ 품의서 및 회의록", "└ Requisitions & Minutes"},
                {"menu.user.child.ledger_report", "ㄴ 품의서 및 회의록 작성", "└ Write Requisitions & Minutes"},
                {"menu.user.child.fruit", "열매헌금", "Fruit Offering"},
                {"menu.user.child.fruit_archive", "ㄴ 품의서 및 회의록", "└ Requisitions & Minutes"},
                {"menu.user.child.transport", "교통비", "Transportation"},
                {"menu.user.child.transport_archive", "ㄴ 품의서 및 회의록", "└ Requisitions & Minutes"},
                {"menu.user.child.mission", "선교비", "Mission Fund"},
                {"menu.user.child.mission_archive", "ㄴ 품의서 및 회의록", "└ Requisitions & Minutes"},
                // 사용자 포탈 — 보고
                {"menu.user.grp.보고", "보 고", "Reports"},
                {"menu.user.weekly_report_sub", "주간보고", "Weekly Report"},
                {"menu.user.child.weekly_report_input", "보고입력", "Report Entry"},
                // 사용자 포탈 — 결재
                {"menu.user.grp.결재", "결 재", "Approvals"},
                {"menu.user.approvals/pending", "결재 대기중인 건", "Pending Approvals"},
                {"menu.user.approvals/completed", "결재 완료 건", "Completed Approvals"},

                // 관리자 포탈 — 최상위(그룹 없음)
                {"menu.admin.home", "홈 (종합 현황)", "Home (Overview)"},
                // 관리자 포탈 — 교회/지역/개척지
                {"menu.admin.grp.교회/지역/개척지", "교회/지역/개척지", "Churches/Regions/Church Plants"},
                {"menu.admin.diag", "목록 및 설정", "List & Settings"},
                {"menu.admin.inspect", "상세 점검 (양·질)", "Detailed Inspection (Quantity·Quality)"},
                // 관리자 포탈 — 데이터 관리
                {"menu.admin.grp.데이터관리", "데이터 관리", "Data Management"},
                {"menu.admin.weekly_worship", "주간예배 출결", "Weekly Worship Attendance"},
                {"menu.admin.child.adminsetting.weekly-worship", "자동 취합 실행", "Run Auto Aggregation"},
                {"menu.admin.child.adminsetting.weekly-worship.history", "이전 데이터 확인", "View Past Data"},
                {"menu.admin.child.adminsetting.weekly-worship.settings", "지역/양식 설정", "Region/Template Settings"},
                {"menu.admin.weekly_report_status", "주간보고 관리", "Weekly Report Management"},
                {"menu.admin.child.adminsetting.weekly-report-status", "제출 현황 확인", "Check Submission Status"},
                {"menu.admin.child.adminsetting.weekly-report-schema", "주차별 양식 관리", "Weekly Template Management"},
                {"menu.admin.evangelism_bulk", "전도 가개강 데이터 전체관리", "Evangelism Data Management"},
                {"menu.admin.child.adminsetting.evangelism-bulk", "데이터 전체관리", "Manage All Data"},
                {"menu.admin.child.adminsetting.evangelism-bulk.report-template", "월말보고서 양식관리", "Monthly Report Template"},
                {"menu.admin.membership_bulk", "내무 데이터 전체관리", "Membership Data Management"},
                {"menu.admin.overseas_board_manual", "현황판 등록·종강 수기입력", "Board Registration/Completion Manual Entry"},
                {"menu.admin.dashboard_config", "메뉴 관리 (상세표·수식 설정)", "Menu Management (Table/Formula Settings)"},
                {"menu.admin.graph_management", "그래프 관리", "Graph Management"},
                {"menu.admin.child.adminsetting.graph-management.board", "현황판 그래프 관리", "Board Graph Management"},
                // 관리자 포탈 — 회원 및 권한
                {"menu.admin.grp.회원및권한", "회원 및 권한", "Members & Permissions"},
                {"menu.admin.users", "회원 관리", "Member Management"},
                {"menu.admin.roles", "권한 목록 및 소속 회원 관리", "Role Groups & Member Assignment"},
                {"menu.admin.perm", "권한별 접근 메뉴 설정", "Menu Access Permission Settings"},
                {"menu.admin.org_structure", "조직 관리 (교회·부서·팀)", "Organization Management (Church/Dept/Team)"},
                // 관리자 포탈 — 로그 및 시스템
                {"menu.admin.grp.로그및시스템", "로그 및 시스템", "Logs & System"},
                {"menu.admin.admin_bot", "봇 연결 관리", "Bot Connection Management"},
                {"menu.admin.sys", "시스템 설정", "System Settings"},
                {"menu.admin.messages", "메시지 관리", "Message Management"},
                {"menu.admin.login_log", "로그인 로그", "Login Logs"},
                {"menu.admin.access_log", "접근로그", "Access Logs"},
                {"menu.admin.file_upload_logs", "파일 업로드 로그", "File Upload Logs"},
                {"menu.admin.file_download_logs", "파일 다운로드 로그", "File Download Logs"},
                {"menu.admin.backdoor_ips", "백도어 IP 관리", "Backdoor IP Management"},
                // 관리자 포탈 — 등수예상 시뮬레이션
                {"menu.admin.grp.등수예상시뮬레이션", "등수예상 시뮬레이션", "Ranking Prediction Simulation"},
                {"menu.admin.simulation", "등수예상 시뮬레이션", "Ranking Prediction Simulation"},
                {"menu.admin.child.adminsetting.simulation.center", "센터예상", "Center Prediction"},
                {"menu.admin.child.adminsetting.simulation.termination", "종강수예상", "Completion Count Prediction"},
                {"menu.admin.child.adminsetting.simulation.growth", "성장율예상", "Growth Rate Prediction"},
        };
        int menuSeedRows = 0;
        for (String[] seed : menuSeeds) {
            for (int langIdx = 0; langIdx < 2; langIdx++) {
                String langCode = langIdx == 0 ? "ko" : "en";
                jdbcTemplate.update(
                        "INSERT INTO overseas.i18n_dictionary (message_key, lang_code, message_value, category, use_yn, updated_by, updated_at) " +
                                "VALUES (?, ?, ?, 'MENU', 'Y', 'system', CURRENT_TIMESTAMP) ON CONFLICT (message_key, lang_code) DO NOTHING",
                        seed[0], langCode, seed[langIdx + 1]);
                menuSeedRows++;
            }
        }
        log.info("Verified {} menu message dictionary seed entries (ko+en).", menuSeedRows);

        log.info("Demo data seeding disabled as per clean startup requirements.");
    }

    /**
     * ddl-auto:update가 이 CommandLineRunner보다 먼저 실행되어 JPA 엔티티 메타데이터만으로 테이블/컬럼을
     * 먼저 만들어버리면, 뒤이어 실행되는 CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS 문에 적어둔
     * FK·UNIQUE 제약절은 조용히 무시된다(테이블/컬럼이 이미 존재해 문장 자체가 스킵되므로). 제약이 실제로
     * 존재하는지 pg_constraint에서 직접 확인한 뒤 없을 때만 추가해 항상 보장되도록 한다.
     */
    private void addConstraintIfMissing(String constraintName, String alterStatement) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM pg_constraint WHERE conname = ?", Integer.class, constraintName);
        if (count == null || count == 0) {
            jdbcTemplate.execute(alterStatement + ";");
        }
    }
}
