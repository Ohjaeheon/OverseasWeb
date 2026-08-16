package com.overseas.portal.controller;

import com.overseas.portal.service.HomeDashboardManualMetricService;
import com.overseas.portal.service.HomeDashboardManualMetricService.ManualMetricRowDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 해외선교부 현황판 - 등록/종강 수기입력 지표 관리자 API.
 * 실데이터 연동 전까지 관리자가 월별로 직접 입력한다.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/home-dashboard-manual")
@RequiredArgsConstructor
public class HomeDashboardManualMetricController {

    private final HomeDashboardManualMetricService service;

    @GetMapping
    public ResponseEntity<List<ManualMetricRowDTO>> getAll(
            @RequestParam String year, @RequestParam String month) {
        String yearMonth = String.format("%s-%02d", year, Integer.parseInt(month));
        return ResponseEntity.ok(service.getAllForMonth(yearMonth));
    }

    @PutMapping
    public ResponseEntity<?> bulkSave(
            @RequestBody List<ManualMetricRowDTO> rows,
            @AuthenticationPrincipal UserDetails principal) {
        try {
            String username = principal != null ? principal.getUsername() : null;
            service.bulkUpsert(rows, username);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("현황판 수기입력 지표 저장 실패", e);
            return ResponseEntity.badRequest().body(Map.of("message", "저장 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }
}
