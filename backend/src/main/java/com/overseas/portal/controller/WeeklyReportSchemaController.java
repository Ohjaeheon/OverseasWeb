package com.overseas.portal.controller;

import com.overseas.portal.domain.WeeklyReportSchema;
import com.overseas.portal.service.WeeklyReportSchemaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
    public ResponseEntity<WeeklyReportSchema> createSchema(
            @RequestBody WeeklyReportSchema schema,
            @AuthenticationPrincipal UserDetails principal) {
        if (principal != null) {
            schema.setCreatedBy(principal.getUsername());
        }
        return ResponseEntity.ok(schemaService.createSchema(schema));
    }

    /** 양식 수정 */
    @PutMapping("/api/v1/admin/weekly-report/schemas/{schemaId}")
    public ResponseEntity<WeeklyReportSchema> updateSchema(
            @PathVariable Long schemaId,
            @RequestBody WeeklyReportSchema schema) {
        return ResponseEntity.ok(schemaService.updateSchema(schemaId, schema));
    }

    /** 양식 활성화 */
    @PostMapping("/api/v1/admin/weekly-report/schemas/{schemaId}/activate")
    public ResponseEntity<WeeklyReportSchema> activateSchema(@PathVariable Long schemaId) {
        return ResponseEntity.ok(schemaService.activateSchema(schemaId));
    }

    /** 양식 비활성화 */
    @PostMapping("/api/v1/admin/weekly-report/schemas/{schemaId}/deactivate")
    public ResponseEntity<WeeklyReportSchema> deactivateSchema(@PathVariable Long schemaId) {
        return ResponseEntity.ok(schemaService.deactivateSchema(schemaId));
    }

    /** 양식 삭제 */
    @DeleteMapping("/api/v1/admin/weekly-report/schemas/{schemaId}")
    public ResponseEntity<Void> deleteSchema(@PathVariable Long schemaId) {
        schemaService.deleteSchema(schemaId);
        return ResponseEntity.ok().build();
    }

    /** 현재 활성 양식 조회 (사용자용) */
    @GetMapping("/api/v1/weekly-report/active-schema")
    public ResponseEntity<?> getActiveSchema() {
        try {
            return ResponseEntity.ok(schemaService.getActiveSchema());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(404).body(e.getMessage());
        }
    }

    /** 특정 양식 단건 조회 */
    @GetMapping("/api/v1/admin/weekly-report/schemas/{schemaId}")
    public ResponseEntity<WeeklyReportSchema> getSchema(@PathVariable Long schemaId) {
        return ResponseEntity.ok(schemaService.getSchema(schemaId));
    }
}
