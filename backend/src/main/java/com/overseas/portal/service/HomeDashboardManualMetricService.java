package com.overseas.portal.service;

import com.overseas.portal.domain.Church;
import com.overseas.portal.domain.HomeDashboardManualMetric;
import com.overseas.portal.repository.ChurchRepository;
import com.overseas.portal.repository.HomeDashboardManualMetricRepository;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 해외선교부 현황판의 등록/종강 수기입력 지표(등록·가개강대비등록률·종강수·등록대비종강률) 관리.
 */
@Service
@RequiredArgsConstructor
public class HomeDashboardManualMetricService {

    private final HomeDashboardManualMetricRepository repository;
    private final ChurchRepository churchRepository;
    private final DiagnosisService diagnosisService;

    /** 특정 연월의 전체 대상 교회 + 저장된 값(없으면 null 필드) 목록. */
    @Transactional(readOnly = true)
    public List<ManualMetricRowDTO> getAllForMonth(String yearMonth) {
        List<Church> churches = diagnosisService.getAllChurches();
        Map<Long, HomeDashboardManualMetric> existingByChurchId = repository.findByYearMonth(yearMonth).stream()
                .collect(Collectors.toMap(m -> m.getChurch().getChurchId(), m -> m));

        return churches.stream().map(c -> {
            HomeDashboardManualMetric m = existingByChurchId.get(c.getChurchId());
            return ManualMetricRowDTO.builder()
                    .churchId(c.getChurchId())
                    .churchName(c.getName())
                    .jipa(c.getJipa())
                    .country(c.getCountry())
                    .yearMonth(yearMonth)
                    .registrationCount(m != null ? m.getRegistrationCount() : null)
                    .registrationRate(m != null ? m.getRegistrationRate() : null)
                    .graduationCount(m != null ? m.getGraduationCount() : null)
                    .graduationRate(m != null ? m.getGraduationRate() : null)
                    .studentPreOpen(m != null ? m.getStudentPreOpen() : null)
                    .studentElementary(m != null ? m.getStudentElementary() : null)
                    .studentMiddle(m != null ? m.getStudentMiddle() : null)
                    .studentHigh(m != null ? m.getStudentHigh() : null)
                    .build();
        }).collect(Collectors.toList());
    }

    @Transactional
    public void bulkUpsert(List<ManualMetricRowDTO> incoming, String username) {
        incoming.forEach(item -> {
            HomeDashboardManualMetric row = repository.findByChurch_ChurchIdAndYearMonth(item.getChurchId(), item.getYearMonth())
                    .orElseGet(() -> HomeDashboardManualMetric.builder()
                            .church(churchRepository.getReferenceById(item.getChurchId()))
                            .yearMonth(item.getYearMonth())
                            .build());
            row.setRegistrationCount(item.getRegistrationCount());
            row.setRegistrationRate(item.getRegistrationRate());
            row.setGraduationCount(item.getGraduationCount());
            row.setGraduationRate(item.getGraduationRate());
            row.setStudentPreOpen(item.getStudentPreOpen());
            row.setStudentElementary(item.getStudentElementary());
            row.setStudentMiddle(item.getStudentMiddle());
            row.setStudentHigh(item.getStudentHigh());
            row.setUpdatedBy(username);
            repository.save(row);
        });
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ManualMetricRowDTO {
        private Long churchId;
        private String churchName;
        private String jipa;
        private String country;
        private String yearMonth;
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
