package com.overseas.portal.controller;

import com.overseas.portal.dto.LedgerSaveRequest;
import com.overseas.portal.service.BusinessLedgerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/business/ledger")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class BusinessLedgerController {

    private final BusinessLedgerService ledgerService;

    /**
     * 특정 연도의 모든 원장헌금 실적 맵 조회
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getLedgerRecords(@RequestParam("year") Integer year) {
        log.info("Received request to fetch ledger records for year: {}", year);
        return ResponseEntity.ok(ledgerService.getLedgerRecordsMap(year));
    }

    /**
     * 특정 월의 기안 데이터 및 실적 저장
     */
    @PostMapping("/save")
    public ResponseEntity<Void> saveLedgerRecord(@RequestBody LedgerSaveRequest request) {
        log.info("Received request to save ledger record for {}/{}", request.getYear(), request.getMonth());
        ledgerService.saveLedgerRecord(request);
        return ResponseEntity.ok().build();
    }

    /**
     * 연도 내 12개월 실적 일괄 저장
     */
    @PostMapping("/save-batch")
    public ResponseEntity<Void> saveLedgerRecordsBatch(@RequestBody List<LedgerSaveRequest> requests) {
        if (requests != null && !requests.isEmpty()) {
            log.info("Received request to batch save ledger records for year: {}", requests.get(0).getYear());
        }
        ledgerService.saveLedgerRecordsBatch(requests);
        return ResponseEntity.ok().build();
    }
}
