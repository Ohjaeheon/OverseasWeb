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

    @Override
    @Transactional
    public void run(String... args) {
        log.info("Checking and initializing default system data...");

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

        // 3-1. Seed FaithProcessRecords for 2024, 2025, 2026 if not exist
        List<Church> churches = churchRepository.findAll();
        List<FaithProcessRecord> newFaithRecords = new ArrayList<>();
        String[] yearsList = {"2024", "2025", "2026"};
        
        for (Church c : churches) {
            for (String y : yearsList) {
                int endMonth = y.equals("2026") ? 7 : 12;
                for (int m = 1; m <= endMonth; m++) {
                    String ym = String.format("%s-%02d", y, m);
                    boolean exists = faithProcessRecordRepository.findByChurch_ChurchIdAndYearMonth(c.getChurchId(), ym).isPresent();
                    if (!exists) {
                        FaithProcessRecord rec = FaithProcessRecord.builder()
                                .church(c)
                                .yearMonth(ym)
                                .evangReg(100)
                                .bibleMonthReg(0)
                                .bibleCumReg(0)
                                .bibleCurAtt(0)
                                .centerMonthOn(0)
                                .centerMonthOff(0)
                                .centerMonthTotal(0)
                                .centerCumOn(0)
                                .centerCumOff(0)
                                .centerCumReg(0)
                                .centerMonthGrad(0)
                                .centerTotMonthReg(0)
                                .centerCumGrad(0)
                                .centerAttElem(0)
                                .centerAttMid(0)
                                .centerAttHigh(0)
                                .registered(100)
                                .yearStartReg(100)
                                .regChange(0)
                                .newAdmit(0)
                                .cumNewAdmit(0)
                                .discipline(0)
                                .cumDiscipline(0)
                                .moveIn(0)
                                .moveOut(0)
                                .transIn(0)
                                .transOut(0)
                                .dupReg(0)
                                .prevNewAdmitCnt(0)
                                .attReg(100)
                                .attOnsite(90)
                                .attOnline(5)
                                .attEtc(0)
                                .attTotal(95)
                                .absOnce(2)
                                .absLongManage(2)
                                .absLongUnmanage(1)
                                .absTotal(5)
                                .build();
                        newFaithRecords.add(rec);
                    }
                }
            }
        }
        if (!newFaithRecords.isEmpty()) {
            try {
                faithProcessRecordRepository.saveAll(newFaithRecords);
                log.info("Successfully seeded {} new faith process records into database!", newFaithRecords.size());
            } catch (Exception e) {
                log.error("Failed to seed faith process records: {}", e.getMessage());
            }
        }

        // 4. Seed EvangelismWeeklyRecords if count is small (e.g. < 1000)
        if (evangelismWeeklyRecordRepository.count() < 1000) {
            log.info("Count of weekly records is less than 1000. Re-seeding sample weekly records for 2024, 2025, 2026...");
            try {
                evangelismWeeklyRecordRepository.deleteAllInBatch();
            } catch (Exception e) {
                log.warn("Clearing existing weekly records failed: {}", e.getMessage());
            }

            String[] years = {"2024년", "2025년", "2026년"};
            String[] departments = {"교역자", "자문회", "장년회", "부녀회", "청년회"};
            String[] churchesList = {"도쿄교회", "텍사스교회", "튀르키예교회"};

            List<EvangelismWeeklyRecord> seedList = new ArrayList<>();
            Random rand = new Random(42);

            for (String church : churchesList) {
                for (String y : years) {
                    List<String> weeksList = new ArrayList<>();
                    int endMonth = y.equals("2026년") ? 7 : 12;
                    for (int m = 1; m <= endMonth; m++) {
                        int endW = (y.equals("2026년") && m == 7) ? 3 : 4;
                        for (int w = 1; w <= endW; w++) {
                            weeksList.add(m + "월" + w + "주차");
                        }
                    }

                    for (String w : weeksList) {
                        for (String dept : departments) {
                            int base = 10 + rand.nextInt(20);
                            EvangelismWeeklyRecord rec = EvangelismWeeklyRecord.builder()
                                    .churchName(church)
                                    .yearStr(y)
                                    .weekKey(w)
                                    .department(dept)
                                    .regCount(base)
                                    .findCount(rand.nextInt(base / 2 + 1))
                                    .findDropCount(rand.nextInt(3))
                                    .gospelCount(rand.nextInt(base / 3 + 1))
                                    .gospelDropCount(rand.nextInt(2))
                                    .admitCount(rand.nextInt(base / 4 + 1))
                                    .admitDropCount(rand.nextInt(2))
                                    .updatedBy("system_seed")
                                    .build();
                            seedList.add(rec);
                        }
                    }
                }
            }
            evangelismWeeklyRecordRepository.saveAll(seedList);
            log.info("Successfully seeded {} weekly records into database!", seedList.size());
        }
    }
}
