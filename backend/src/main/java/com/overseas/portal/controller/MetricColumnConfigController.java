package com.overseas.portal.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.overseas.portal.domain.MetricColumnConfig;
import com.overseas.portal.service.MetricColumnConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 진단 상세표 카테고리별 컬럼(지표)/수식 구성 설정 API.
 * 설정이 없는 카테고리는 프론트가 기존 하드코딩 기본값을 그대로 사용한다.
 */
@Slf4j
@RestController
@RequiredArgsConstructor
public class MetricColumnConfigController {

    private final MetricColumnConfigService configService;
    private final ObjectMapper objectMapper;

    /** 사용자 화면용: 저장된 카테고리 설정 전체 (categoryKey -> 컬럼 배열) */
    @GetMapping("/api/v1/metric-columns")
    public ResponseEntity<Map<String, Object>> getEffectiveConfigs() {
        Map<String, Object> result = configService.getAllConfigs().stream()
                .collect(Collectors.toMap(
                        MetricColumnConfig::getCategoryKey,
                        c -> parseColumns(c.getColumnsJson())));
        return ResponseEntity.ok(result);
    }

    /** 관리자용: 저장된 설정 목록 (원본 엔티티) */
    @GetMapping("/api/v1/admin/metric-columns")
    public ResponseEntity<List<MetricColumnConfig>> getAllConfigs() {
        return ResponseEntity.ok(configService.getAllConfigs());
    }

    /** 관리자용: 카테고리 컬럼 구성 저장 (통째로 upsert) */
    @PutMapping("/api/v1/admin/metric-columns/{categoryKey}")
    public ResponseEntity<?> upsertConfig(
            @PathVariable String categoryKey,
            @RequestBody Object columns,
            @AuthenticationPrincipal UserDetails principal) {
        try {
            String json = objectMapper.writeValueAsString(columns);
            String username = principal != null ? principal.getUsername() : null;
            MetricColumnConfig saved = configService.upsertConfig(categoryKey, json, username);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            log.error("컬럼 설정 저장 실패: category={}", categoryKey, e);
            return ResponseEntity.badRequest().body(Map.of("message", "저장 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    /** 관리자용: 카테고리 설정 삭제 (기본값으로 되돌림) */
    @DeleteMapping("/api/v1/admin/metric-columns/{categoryKey}")
    public ResponseEntity<?> resetConfig(@PathVariable String categoryKey) {
        configService.resetConfig(categoryKey);
        return ResponseEntity.ok().build();
    }

    private Object parseColumns(String columnsJson) {
        try {
            return objectMapper.readValue(columnsJson, Object.class);
        } catch (Exception e) {
            log.error("컬럼 설정 파싱 실패", e);
            return List.of();
        }
    }
}
