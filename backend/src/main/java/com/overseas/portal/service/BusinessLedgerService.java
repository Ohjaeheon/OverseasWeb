package com.overseas.portal.service;

import com.overseas.portal.domain.BusinessLedgerRecord;
import com.overseas.portal.dto.LedgerSaveRequest;
import com.overseas.portal.repository.BusinessLedgerRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class BusinessLedgerService {

    private final BusinessLedgerRecordRepository repository;

    /**
     * 특정 연도의 원장헌금 실적 데이터를 프론트엔드 store 맵 포맷으로 조회
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getLedgerRecordsMap(Integer year) {
        List<BusinessLedgerRecord> records = repository.findAllByYear(year);
        Map<String, Object> resultMap = new HashMap<>();

        // Group by year_month (e.g. 2026_2)
        Map<String, List<BusinessLedgerRecord>> grouped = records.stream()
                .collect(Collectors.groupingBy(r -> r.getYear() + "_" + r.getMonth()));

        grouped.forEach((key, list) -> {
            if (list.isEmpty()) return;
            BusinessLedgerRecord first = list.get(0);

            Map<String, Object> monthData = new HashMap<>();
            monthData.put("reportDate", first.getReportDate());
            monthData.put("draftUser", first.getDraftUser());
            monthData.put("expenseDate", first.getExpenseDate());
            monthData.put("meetingDate", first.getMeetingDate());

            List<Map<String, Object>> countries = list.stream().map(r -> {
                Map<String, Object> c = new HashMap<>();
                c.put("name", r.getChurchName());
                c.put("amount", r.getAmount());
                return c;
            }).collect(Collectors.toList());

            monthData.put("countries", countries);
            resultMap.put(key, monthData);
        });

        return resultMap;
    }

    /**
     * 특정 월의 원장헌금 기안 데이터 저장
     */
    public void saveLedgerRecord(LedgerSaveRequest request) {
        // 기존 해당 연월 레코드 삭제 (Replace 방식)
        repository.deleteAllByYearAndMonth(request.getYear(), request.getMonth());

        if (request.getCountries() == null || request.getCountries().isEmpty()) {
            log.info("Saved ledger record (Empty countries) for {}/{}", request.getYear(), request.getMonth());
            return;
        }

        List<BusinessLedgerRecord> recordsToSave = request.getCountries().stream()
                .map(c -> BusinessLedgerRecord.builder()
                        .year(request.getYear())
                        .month(request.getMonth())
                        .churchName(c.getName())
                        .amount(c.getAmount())
                        .reportDate(request.getReportDate())
                        .draftUser(request.getDraftUser())
                        .expenseDate(request.getExpenseDate())
                        .meetingDate(request.getMeetingDate())
                        .build())
                .collect(Collectors.toList());

        repository.saveAll(recordsToSave);
        log.info("Successfully saved {} ledger records for {}/{}", recordsToSave.size(), request.getYear(), request.getMonth());
    }

    /**
     * 연도별 12개월 실적 일괄 저장 (Batch)
     */
    public void saveLedgerRecordsBatch(List<LedgerSaveRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            return;
        }

        // 배치 대상 연도 추출
        Integer year = requests.get(0).getYear();
        
        // 해당 연도의 모든 기존 데이터 삭제
        repository.deleteAllByYear(year);

        List<BusinessLedgerRecord> recordsToSave = new ArrayList<>();
        for (LedgerSaveRequest request : requests) {
            if (request.getCountries() == null || request.getCountries().isEmpty()) {
                continue;
            }

            request.getCountries().forEach(c -> {
                recordsToSave.add(BusinessLedgerRecord.builder()
                        .year(request.getYear())
                        .month(request.getMonth())
                        .churchName(c.getName())
                        .amount(c.getAmount())
                        .reportDate(request.getReportDate())
                        .draftUser(request.getDraftUser())
                        .expenseDate(request.getExpenseDate())
                        .meetingDate(request.getMeetingDate())
                        .build());
            });
        }

        if (!recordsToSave.isEmpty()) {
            repository.saveAll(recordsToSave);
        }
        log.info("Successfully saved batch of {} ledger records for year {}", recordsToSave.size(), year);
    }
}
