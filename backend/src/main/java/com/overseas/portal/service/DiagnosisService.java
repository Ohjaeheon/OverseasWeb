package com.overseas.portal.service;

import com.overseas.portal.domain.Church;
import com.overseas.portal.domain.FaithProcessRecord;
import com.overseas.portal.repository.ChurchRepository;
import com.overseas.portal.repository.FaithProcessRecordRepository;
import com.overseas.portal.repository.SystemConfigRepository;
import com.overseas.portal.repository.EvangelismWeeklyRecordRepository;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DiagnosisService {

    private final FaithProcessRecordRepository faithProcessRecordRepository;
    private final ChurchRepository churchRepository;
    private final SystemConfigRepository systemConfigRepository;
    private final EvangelismWeeklyRecordRepository evangelismWeeklyRecordRepository;

    public String getMenuPermissions() {
        return systemConfigRepository.findByConfigKey("menu_permissions_matrix")
                .map(config -> config.getConfigValue())
                .orElse("");
    }

    public String getRoleDefinitions() {
        return systemConfigRepository.findByConfigKey("role_definitions")
                .map(config -> config.getConfigValue())
                .orElse("");
    }

    public String getAdminMenuLayout() {
        return systemConfigRepository.findByConfigKey("admin_menu_layout")
                .map(config -> config.getConfigValue())
                .orElse("");
    }

    @Data
    @Builder
    public static class RecordDTO {
        private Long recordId;
        private Long churchId;
        private String name;
        private String continent;
        private String country;
        private String jipa;
        private String gubun;
        private Double lat;
        private Double lon;
        private String month;
        private Integer sortOrder;

        // ① 전도
        private Integer evangReg;
        private Integer bibleMonthReg;
        private Integer bibleCumReg;
        private Integer bibleCurAtt;

        // ② 센터
        private Integer centerMonthOn;
        private Integer centerMonthOff;
        private Integer centerMonthTotal;
        private Integer centerCumOn;
        private Integer centerCumOff;
        private Integer centerCumReg;
        private Integer centerMonthGrad;
        private Integer centerTotMonthReg;
        private Integer centerCumGrad;
        private Integer centerAttElem;
        private Integer centerAttMid;
        private Integer centerAttHigh;

        // ③ 내무/교적
        private Integer registered;
        private Integer yearStartReg;
        private Integer regChange;
        private Integer newAdmit;
        private Integer cumNewAdmit;
        private Integer discipline;
        private Integer cumDiscipline;
        private Integer moveIn;
        private Integer moveOut;
        private Integer transIn;
        private Integer transOut;
        private Integer dupReg;
        private Integer prevNewAdmitCnt;

        // ④ 예배 (전성도 & 결석)
        private Integer attReg;
        private Integer attOnsite;
        private Integer attOnline;
        private Integer attEtc;
        private Integer attTotal;
        private Integer absOnce;
        private Integer absLongManage;
        private Integer absLongUnmanage;
        private Integer absTotal;
    }

    @Data
    @Builder
    public static class SummaryMetric {
        private Integer totalChurches;
        private Integer totalRegistered;
        private Integer totalEvangReg;
        private Integer totalCenterMonthReg;
        private Integer totalAttTotal;
        private Integer totalAbsTotal;
    }

    public List<String> getAvailableMonths() {
        List<String> months = new ArrayList<>();
        int startYear = 2025;
        int startMonth = 1;

        java.time.LocalDate now = java.time.LocalDate.now();
        int currentYear = now.getYear();
        int currentMonth = now.getMonthValue();

        try {
            List<String> faithMonths = faithProcessRecordRepository.findDistinctYearMonths();
            if (faithMonths != null) {
                for (String fm : faithMonths) {
                    if (fm != null && fm.matches("^\\d{4}-\\d{2}$")) {
                        String[] parts = fm.split("-");
                        int y = Integer.parseInt(parts[0]);
                        int m = Integer.parseInt(parts[1]);
                        if (y > currentYear || (y == currentYear && m > currentMonth)) {
                            currentYear = y;
                            currentMonth = m;
                        }
                    }
                }
            }
        } catch (Exception e) {
            // Ignored
        }

        for (int y = startYear; y <= currentYear; y++) {
            int endMonth = (y == currentYear) ? currentMonth : 12;
            int startM = (y == startYear) ? startMonth : 1;
            for (int m = startM; m <= endMonth; m++) {
                months.add(String.format("%04d-%02d", y, m));
            }
        }

        months.sort(Collections.reverseOrder());
        return months;
    }

    private RecordDTO mapChurchToDefaultDTO(Church c, String yearMonth) {
        return RecordDTO.builder()
                .recordId(-c.getChurchId())
                .churchId(c.getChurchId())
                .name(c.getName())
                .continent(c.getContinent())
                .country(c.getCountry())
                .jipa(c.getJipa())
                .gubun(c.getGubun())
                .lat(c.getLat() != null ? c.getLat().doubleValue() : null)
                .lon(c.getLon() != null ? c.getLon().doubleValue() : null)
                .month(yearMonth)
                .sortOrder(c.getSortOrder())
                .evangReg(0)
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
                .registered(0)
                .yearStartReg(0)
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
                .attReg(0)
                .attOnsite(0)
                .attOnline(0)
                .attEtc(0)
                .attTotal(0)
                .absOnce(0)
                .absLongManage(0)
                .absLongUnmanage(0)
                .absTotal(0)
                .build();
    }

    public List<RecordDTO> getRecordsByMonth(String yearMonth) {
        List<Church> activeChurches = churchRepository.findByIsActiveTrueOrderBySortOrderAscNameAsc();
        
        if ("all".equalsIgnoreCase(yearMonth) || yearMonth == null || yearMonth.isEmpty()) {
            List<String> availableMonths = getAvailableMonths();
            List<FaithProcessRecord> records = faithProcessRecordRepository.findAllWithChurch();
            
            Map<String, Map<Long, FaithProcessRecord>> monthChurchMap = new HashMap<>();
            for (FaithProcessRecord r : records) {
                monthChurchMap.computeIfAbsent(r.getYearMonth(), k -> new HashMap<>())
                              .put(r.getChurch().getChurchId(), r);
            }
            
            List<RecordDTO> dtos = new ArrayList<>();
            for (String m : availableMonths) {
                Map<Long, FaithProcessRecord> churchMapForMonth = monthChurchMap.getOrDefault(m, Collections.emptyMap());
                for (Church c : activeChurches) {
                    if (churchMapForMonth.containsKey(c.getChurchId())) {
                        dtos.add(mapToDTO(churchMapForMonth.get(c.getChurchId())));
                    } else {
                        dtos.add(mapChurchToDefaultDTO(c, m));
                    }
                }
            }
            return dtos;
        } else {
            List<FaithProcessRecord> records = faithProcessRecordRepository.findAllWithChurchByYearMonth(yearMonth);
            Map<Long, FaithProcessRecord> recordMap = records.stream()
                    .collect(Collectors.toMap(r -> r.getChurch().getChurchId(), r -> r, (r1, r2) -> r1));
            
            List<RecordDTO> dtos = new ArrayList<>();
            for (Church c : activeChurches) {
                if (recordMap.containsKey(c.getChurchId())) {
                    dtos.add(mapToDTO(recordMap.get(c.getChurchId())));
                } else {
                    dtos.add(mapChurchToDefaultDTO(c, yearMonth));
                }
            }
            return dtos;
        }
    }

    public SummaryMetric getSummaryMetric(String yearMonth) {
        List<RecordDTO> records = getRecordsByMonth(yearMonth);
        int totalReg = records.stream().mapToInt(r -> Optional.ofNullable(r.getRegistered()).orElse(0)).sum();
        int totalEvang = records.stream().mapToInt(r -> Optional.ofNullable(r.getEvangReg()).orElse(0)).sum();
        int totalCenter = records.stream().mapToInt(r -> Optional.ofNullable(r.getCenterMonthTotal()).orElse(0)).sum();
        int totalAtt = records.stream().mapToInt(r -> Optional.ofNullable(r.getAttTotal()).orElse(0)).sum();
        int totalAbs = records.stream().mapToInt(r -> Optional.ofNullable(r.getAbsTotal()).orElse(0)).sum();

        return SummaryMetric.builder()
                .totalChurches(records.size())
                .totalRegistered(totalReg)
                .totalEvangReg(totalEvang)
                .totalCenterMonthReg(totalCenter)
                .totalAttTotal(totalAtt)
                .totalAbsTotal(totalAbs)
                .build();
    }

    public List<Church> getAllChurches() {
        // 일반 데이터 페이지용 조회 — 조직도 전용(isOrgOnly=true), 미노출(isExposed=false), 본부/해선부 노드 제외
        return churchRepository.findByIsActiveTrueOrderBySortOrderAscNameAsc().stream()
                .filter(c -> !Boolean.FALSE.equals(c.getIsExposed()))
                .filter(c -> !Boolean.TRUE.equals(c.getIsOrgOnly()))
                .filter(c -> !"본부".equals(c.getContinent()) && !"본부".equals(c.getJipa()) && !"해선부".equals(c.getName()))
                .collect(java.util.stream.Collectors.toList());
    }

    private RecordDTO mapToDTO(FaithProcessRecord r) {
        Church c = r.getChurch();
        return RecordDTO.builder()
                .recordId(r.getRecordId())
                .churchId(c.getChurchId())
                .name(c.getName())
                .continent(c.getContinent())
                .country(c.getCountry())
                .jipa(c.getJipa())
                .gubun(c.getGubun())
                .lat(c.getLat() != null ? c.getLat().doubleValue() : null)
                .lon(c.getLon() != null ? c.getLon().doubleValue() : null)
                .month(r.getYearMonth())
                .sortOrder(c.getSortOrder())
                .evangReg(r.getEvangReg())
                .bibleMonthReg(r.getBibleMonthReg())
                .bibleCumReg(r.getBibleCumReg())
                .bibleCurAtt(r.getBibleCurAtt())
                .centerMonthOn(r.getCenterMonthOn())
                .centerMonthOff(r.getCenterMonthOff())
                .centerMonthTotal(r.getCenterMonthTotal())
                .centerCumOn(r.getCenterCumOn())
                .centerCumOff(r.getCenterCumOff())
                .centerCumReg(r.getCenterCumReg())
                .centerMonthGrad(r.getCenterMonthGrad())
                .centerTotMonthReg(r.getCenterTotMonthReg())
                .centerCumGrad(r.getCenterCumGrad())
                .centerAttElem(r.getCenterAttElem())
                .centerAttMid(r.getCenterAttMid())
                .centerAttHigh(r.getCenterAttHigh())
                .registered(r.getRegistered())
                .yearStartReg(r.getYearStartReg())
                .regChange(r.getRegChange())
                .newAdmit(r.getNewAdmit())
                .cumNewAdmit(r.getCumNewAdmit())
                .discipline(r.getDiscipline())
                .cumDiscipline(r.getCumDiscipline())
                .moveIn(r.getMoveIn())
                .moveOut(r.getMoveOut())
                .transIn(r.getTransIn())
                .transOut(r.getTransOut())
                .dupReg(r.getDupReg())
                .prevNewAdmitCnt(r.getPrevNewAdmitCnt())
                .attReg(r.getAttReg())
                .attOnsite(r.getAttOnsite())
                .attOnline(r.getAttOnline())
                .attEtc(r.getAttEtc())
                .attTotal(r.getAttTotal())
                .absOnce(r.getAbsOnce())
                .absLongManage(r.getAbsLongManage())
                .absLongUnmanage(r.getAbsLongUnmanage())
                .absTotal(r.getAbsTotal())
                .build();
    }
}
