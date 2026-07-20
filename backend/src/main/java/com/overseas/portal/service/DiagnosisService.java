package com.overseas.portal.service;

import com.overseas.portal.domain.Church;
import com.overseas.portal.domain.FaithProcessRecord;
import com.overseas.portal.repository.ChurchRepository;
import com.overseas.portal.repository.FaithProcessRecordRepository;
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
        List<String> months = faithProcessRecordRepository.findDistinctYearMonths();
        return months.isEmpty() ? List.of("2026-05") : months;
    }

    public List<RecordDTO> getRecordsByMonth(String yearMonth) {
        List<FaithProcessRecord> records;
        if ("all".equalsIgnoreCase(yearMonth) || yearMonth == null || yearMonth.isEmpty()) {
            records = faithProcessRecordRepository.findAllWithChurch();
        } else {
            records = faithProcessRecordRepository.findAllWithChurchByYearMonth(yearMonth);
        }
        return records.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    public SummaryMetric getSummaryMetric(String yearMonth) {
        List<FaithProcessRecord> records = faithProcessRecordRepository.findAllWithChurchByYearMonth(yearMonth);
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
        return churchRepository.findByIsActiveTrue();
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
