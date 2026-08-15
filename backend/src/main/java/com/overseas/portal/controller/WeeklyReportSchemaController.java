package com.overseas.portal.controller;

import com.overseas.portal.domain.WeeklyReportSchema;
import com.overseas.portal.service.WeeklyReportSchemaService;
import com.overseas.portal.util.WeekUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 주간보고 양식 스키마 관리 API (관리자용)
 */
@Slf4j
@RestController
@RequiredArgsConstructor
public class WeeklyReportSchemaController {

    private final WeeklyReportSchemaService schemaService;

    /** 전체 양식 목록 */
    @GetMapping("/api/v1/admin/weekly-report/schemas")
    public ResponseEntity<List<WeeklyReportSchema>> getAllSchemas() {
        return ResponseEntity.ok(schemaService.getAllSchemas());
    }

    /** 새 양식 생성 */
    @PostMapping("/api/v1/admin/weekly-report/schemas")
    public ResponseEntity<?> createSchema(
            @RequestBody WeeklyReportSchema schema,
            @AuthenticationPrincipal UserDetails principal) {
        try {
            if (principal != null) {
                schema.setCreatedBy(principal.getUsername());
            }
            return ResponseEntity.ok(schemaService.createSchema(schema));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /** 양식 수정 */
    @PutMapping("/api/v1/admin/weekly-report/schemas/{schemaId}")
    public ResponseEntity<?> updateSchema(
            @PathVariable Long schemaId,
            @RequestBody WeeklyReportSchema schema) {
        try {
            return ResponseEntity.ok(schemaService.updateSchema(schemaId, schema));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /** 양식 사용 설정 */
    @PostMapping("/api/v1/admin/weekly-report/schemas/{schemaId}/activate")
    public ResponseEntity<WeeklyReportSchema> enableSchema(@PathVariable Long schemaId) {
        return ResponseEntity.ok(schemaService.setEnabled(schemaId, true));
    }

    /** 양식 사용 중지 */
    @PostMapping("/api/v1/admin/weekly-report/schemas/{schemaId}/deactivate")
    public ResponseEntity<WeeklyReportSchema> disableSchema(@PathVariable Long schemaId) {
        return ResponseEntity.ok(schemaService.setEnabled(schemaId, false));
    }

    /** 양식 삭제 */
    @DeleteMapping("/api/v1/admin/weekly-report/schemas/{schemaId}")
    public ResponseEntity<?> deleteSchema(@PathVariable Long schemaId) {
        try {
            schemaService.deleteSchema(schemaId);
            return ResponseEntity.ok().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /** 현재 주차에 적용될 양식 조회 (사용자용, 기본값) */
    @GetMapping("/api/v1/weekly-report/active-schema")
    public ResponseEntity<?> getActiveSchema() {
        try {
            return ResponseEntity.ok(schemaService.getCurrentSchema());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    /** 특정 주차에 적용될 양식 조회 (사용자용, 주차 선택기에서 사용) */
    @GetMapping("/api/v1/weekly-report/schema-for-week")
    public ResponseEntity<?> getSchemaForWeek(
            @RequestParam int year, @RequestParam int month, @RequestParam int weekOfMonth) {
        try {
            return ResponseEntity.ok(schemaService.getSchemaForWeek(year, month, weekOfMonth));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    /** 현재 서버 기준 주차 조회 (프론트-백엔드 주차 계산 어긋남 방지용) */
    @GetMapping("/api/v1/weekly-report/current-week")
    public ResponseEntity<WeekUtil.Week> getCurrentWeek() {
        return ResponseEntity.ok(WeekUtil.currentWeek());
    }

    /** 특정 양식 단건 조회 */
    @GetMapping("/api/v1/admin/weekly-report/schemas/{schemaId}")
    public ResponseEntity<WeeklyReportSchema> getSchema(@PathVariable Long schemaId) {
        return ResponseEntity.ok(schemaService.getSchema(schemaId));
    }
}
