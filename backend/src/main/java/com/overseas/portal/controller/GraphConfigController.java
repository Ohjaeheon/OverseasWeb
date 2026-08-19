package com.overseas.portal.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.overseas.portal.domain.GraphConfig;
import com.overseas.portal.service.GraphConfigService;
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
 * 대시보드 카테고리별(예: 해외선교부 현황판) 그래프 구성 설정 API.
 * 설정이 없는 카테고리는 프론트가 빈 목록(그래프 없음)으로 처리한다.
 */
@Slf4j
@RestController
@RequiredArgsConstructor
public class GraphConfigController {

    private final GraphConfigService configService;
    private final ObjectMapper objectMapper;

    /** 사용자 화면용: 저장된 카테고리 설정 전체 (categoryKey -> 그래프 배열) */
    @GetMapping("/api/v1/graph-configs")
    public ResponseEntity<Map<String, Object>> getEffectiveConfigs() {
        Map<String, Object> result = configService.getAllConfigs().stream()
                .collect(Collectors.toMap(
                        GraphConfig::getCategoryKey,
                        c -> parseGraphs(c.getGraphsJson())));
        return ResponseEntity.ok(result);
    }

    /** 관리자용: 저장된 설정 목록 (원본 엔티티) */
    @GetMapping("/api/v1/admin/graph-configs")
    public ResponseEntity<List<GraphConfig>> getAllConfigs() {
        return ResponseEntity.ok(configService.getAllConfigs());
    }

    /** 관리자용: 카테고리 그래프 구성 저장 (통째로 upsert) */
    @PutMapping("/api/v1/admin/graph-configs/{categoryKey}")
    public ResponseEntity<?> upsertConfig(
            @PathVariable String categoryKey,
            @RequestBody Object graphs,
            @AuthenticationPrincipal UserDetails principal) {
        try {
            String json = objectMapper.writeValueAsString(graphs);
            String username = principal != null ? principal.getUsername() : null;
            GraphConfig saved = configService.upsertConfig(categoryKey, json, username);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            log.error("그래프 설정 저장 실패: category={}", categoryKey, e);
            return ResponseEntity.badRequest().body(Map.of("message", "저장 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    /** 관리자용: 카테고리 설정 삭제 (빈 상태로 되돌림) */
    @DeleteMapping("/api/v1/admin/graph-configs/{categoryKey}")
    public ResponseEntity<?> resetConfig(@PathVariable String categoryKey) {
        configService.resetConfig(categoryKey);
        return ResponseEntity.ok().build();
    }

    private Object parseGraphs(String graphsJson) {
        try {
            return objectMapper.readValue(graphsJson, Object.class);
        } catch (Exception e) {
            log.error("그래프 설정 파싱 실패", e);
            return List.of();
        }
    }
}
