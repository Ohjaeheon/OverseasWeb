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
            
            // overseas.churches 컬럼 추가 및 해선부 노드 처리
            jdbcTemplate.execute("ALTER TABLE overseas.churches ADD COLUMN IF NOT EXISTS is_exposed BOOLEAN DEFAULT TRUE;");
            jdbcTemplate.execute("ALTER TABLE overseas.churches ADD COLUMN IF NOT EXISTS is_org_only BOOLEAN DEFAULT FALSE;");

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

        log.info("Demo data seeding disabled as per clean startup requirements.");
    }
}
