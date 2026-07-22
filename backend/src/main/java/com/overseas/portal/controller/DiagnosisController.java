package com.overseas.portal.controller;

import com.overseas.portal.domain.Church;
import com.overseas.portal.service.DiagnosisService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/v1/diagnosis")
@RequiredArgsConstructor
public class DiagnosisController {

    private final DiagnosisService diagnosisService;

    @GetMapping("/permissions")
    public ResponseEntity<Map<String, String>> getMenuPermissions() {
        String permissions = diagnosisService.getMenuPermissions();
        Map<String, String> response = new HashMap<>();
        response.put("permissions", permissions);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/months")
    public ResponseEntity<List<String>> getAvailableMonths() {
        return ResponseEntity.ok(diagnosisService.getAvailableMonths());
    }

    @GetMapping("/records")
    public ResponseEntity<List<DiagnosisService.RecordDTO>> getRecordsByMonth(
            @RequestParam(name = "month", defaultValue = "2026-05") String month) {
        return ResponseEntity.ok(diagnosisService.getRecordsByMonth(month));
    }

    @GetMapping("/summary")
    public ResponseEntity<DiagnosisService.SummaryMetric> getSummaryMetric(
            @RequestParam(name = "month", defaultValue = "2026-05") String month) {
        return ResponseEntity.ok(diagnosisService.getSummaryMetric(month));
    }

    @GetMapping("/churches")
    public ResponseEntity<List<Church>> getAllChurches() {
        return ResponseEntity.ok(diagnosisService.getAllChurches());
    }
}
