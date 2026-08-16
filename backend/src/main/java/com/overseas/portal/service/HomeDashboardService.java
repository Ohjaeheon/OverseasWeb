package com.overseas.portal.service;

import com.overseas.portal.domain.Church;
import com.overseas.portal.domain.FaithProcessRecord;
import com.overseas.portal.domain.HomeDashboardManualMetric;
import com.overseas.portal.domain.MembershipMonthlyRecord;
import com.overseas.portal.repository.FaithProcessRecordRepository;
import com.overseas.portal.repository.HomeDashboardManualMetricRepository;
import com.overseas.portal.repository.MembershipMonthlyRecordRepository;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 홈 화면 "해외선교부 현황판" 집계.
 * 교회 마스터(churches) + 내무 재적(membership_monthly_records) + 전도 가개강(faith_process_records)
 * + 등록/종강 수기입력(home_dashboard_manual_metrics)을 조합해 교회별 한 행(row)을 만든다.
 * 증가율(현재적/신42년말재적*100)은 여기서 계산하지 않는다 — dashboard-config의 커스텀 수식 컬럼으로 관리된다.
 */
@Service
@RequiredArgsConstructor
public class HomeDashboardService {

    private final DiagnosisService diagnosisService;
    private final MembershipMonthlyRecordRepository membershipMonthlyRecordRepository;
    private final FaithProcessRecordRepository faithProcessRecordRepository;
    private final HomeDashboardManualMetricRepository homeDashboardManualMetricRepository;

    @Transactional(readOnly = true)
    public List<OverseasBoardRowDTO> getOverseasBoard(int year, int month) {
        List<Church> churches = diagnosisService.getAllChurches();

        Map<String, Integer> prevYearEndByChurchName = sumAssemblyRegByChurchName(
                membershipMonthlyRecordRepository.findByYearStrAndMonthKey((year - 1) + "년", "12월"));
        Map<String, Integer> currentByChurchName = sumAssemblyRegByChurchName(
                membershipMonthlyRecordRepository.findByYearStrAndMonthKey(year + "년", month + "월"));

        String yearMonth = String.format("%d-%02d", year, month);
        Map<Long, Integer> preOpenByChurchId = faithProcessRecordRepository.findAllWithChurchByYearMonth(yearMonth).stream()
                .collect(Collectors.toMap(r -> r.getChurch().getChurchId(),
                        r -> r.getBibleMonthReg() != null ? r.getBibleMonthReg() : 0));

        Map<Long, HomeDashboardManualMetric> manualByChurchId = homeDashboardManualMetricRepository.findByYearMonth(yearMonth).stream()
                .collect(Collectors.toMap(m -> m.getChurch().getChurchId(), m -> m));

        return churches.stream().map(c -> {
            HomeDashboardManualMetric manual = manualByChurchId.get(c.getChurchId());
            return OverseasBoardRowDTO.builder()
                    .churchId(c.getChurchId())
                    .name(c.getName())
                    .jipa(c.getJipa())
                    .gubun(c.getGubun())
                    .continent(c.getContinent())
                    .country(c.getCountry())
                    .foundingDate(c.getFoundingDate())
                    .leaderName(c.getLeaderName())
                    .prevYearEndReg(prevYearEndByChurchName.getOrDefault(c.getName(), 0))
                    .currentReg(currentByChurchName.getOrDefault(c.getName(), 0))
                    .preOpen(preOpenByChurchId.getOrDefault(c.getChurchId(), 0))
                    .registrationCount(manual != null ? manual.getRegistrationCount() : null)
                    .registrationRate(manual != null ? manual.getRegistrationRate() : null)
                    .graduationCount(manual != null ? manual.getGraduationCount() : null)
                    .graduationRate(manual != null ? manual.getGraduationRate() : null)
                    .studentPreOpen(manual != null ? manual.getStudentPreOpen() : null)
                    .studentElementary(manual != null ? manual.getStudentElementary() : null)
                    .studentMiddle(manual != null ? manual.getStudentMiddle() : null)
                    .studentHigh(manual != null ? manual.getStudentHigh() : null)
                    .build();
        }).collect(Collectors.toList());
    }

    private Map<String, Integer> sumAssemblyRegByChurchName(List<MembershipMonthlyRecord> records) {
        return records.stream().collect(Collectors.groupingBy(
                MembershipMonthlyRecord::getChurchName,
                Collectors.summingInt(r -> r.getCalculatedAssemblyReg() != null ? r.getCalculatedAssemblyReg() : 0)));
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OverseasBoardRowDTO {
        private Long churchId;
        private String name;
        private String jipa;
        private String gubun;
        private String continent;
        private String country;
        private LocalDate foundingDate;
        private String leaderName;
        private Integer prevYearEndReg;
        private Integer currentReg;
        private Integer preOpen;
        private Integer registrationCount;
        private BigDecimal registrationRate;
        private Integer graduationCount;
        private BigDecimal graduationRate;
        private Integer studentPreOpen;
        private Integer studentElementary;
        private Integer studentMiddle;
        private Integer studentHigh;
    }
}
