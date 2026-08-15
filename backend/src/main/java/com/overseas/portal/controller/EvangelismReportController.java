package com.overseas.portal.controller;

import com.overseas.portal.domain.EvangelismReportFieldMapping;
import com.overseas.portal.domain.EvangelismReportTemplate;
import com.overseas.portal.service.EvangelismReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/evangelism/monthly-report")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class EvangelismReportController {

    private final EvangelismReportService evangelismReportService;
    private final com.overseas.portal.service.FileLogService fileLogService;

    /**
     * 업로드된 템플릿 이력 전체 조회 (활성 템플릿 포함, 비밀번호는 응답에 포함하지 않음)
     */
    @GetMapping("/template")
    public ResponseEntity<List<Map<String, Object>>> listTemplates() {
        List<Map<String, Object>> result = evangelismReportService.listTemplates().stream()
                .map(this::toTemplateSummary)
                .toList();
        return ResponseEntity.ok(result);
    }

    /**
     * 새 템플릿(양식) 업로드 및 즉시 활성화
     */
    @PostMapping("/template")
    public ResponseEntity<?> uploadTemplate(@RequestParam("file") MultipartFile file,
                                             @RequestParam("password") String password,
                                             jakarta.servlet.http.HttpServletRequest request) {
        try {
            String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
            String ip = getClientIp(request);
            fileLogService.logUpload(username, file.getOriginalFilename(), file.getSize(), ip);

            EvangelismReportTemplate saved = evangelismReportService.uploadTemplate(file, password, username);
            return ResponseEntity.ok(toTemplateSummary(saved));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to upload evangelism report template", e);
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * 과거 템플릿으로 롤백(활성 전환)
     */
    @PostMapping("/template/{id}/activate")
    public ResponseEntity<?> activateTemplate(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(toTemplateSummary(evangelismReportService.activateTemplate(id)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * 필드(열) 매핑 전체 조회
     */
    @GetMapping("/field-mappings")
    public ResponseEntity<List<EvangelismReportFieldMapping>> listFieldMappings() {
        return ResponseEntity.ok(evangelismReportService.listFieldMappings());
    }

    /**
     * 필드(열) 매핑 수정 (열 문자 / 데이터 소스 / 사용 여부)
     */
    @PutMapping("/field-mappings/{id}")
    public ResponseEntity<?> updateFieldMapping(@PathVariable Long id, @RequestBody EvangelismReportFieldMapping body) {
        try {
            return ResponseEntity.ok(evangelismReportService.updateFieldMapping(
                    id, body.getColumnLetter(), body.getDataSource(), body.getIsEnabled()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * 선택한 교회·연·월 기준 월말보고서 엑셀 생성 및 다운로드
     */
    @GetMapping("/export")
    public ResponseEntity<?> export(@RequestParam String church,
                                     @RequestParam int year,
                                     @RequestParam int month,
                                     jakarta.servlet.http.HttpServletRequest request) {
        try {
            EvangelismReportService.ReportResult result = evangelismReportService.generateReport(church, year, month);

            String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
            String ip = getClientIp(request);
            fileLogService.logDownload(username, result.getFileName(), ip);

            String encodedFileName = URLEncoder.encode(result.getFileName(), StandardCharsets.UTF_8).replaceAll("\\+", "%20");
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + encodedFileName + "\"; filename*=UTF-8''" + encodedFileName)
                    .body(new ByteArrayResource(result.getData()));
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to generate evangelism monthly report", e);
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }

    private Map<String, Object> toTemplateSummary(EvangelismReportTemplate t) {
        Map<String, Object> map = new java.util.HashMap<>();
        map.put("templateId", t.getTemplateId());
        map.put("originalFilename", t.getOriginalFilename());
        map.put("isActive", t.getIsActive());
        map.put("uploadedBy", t.getUploadedBy());
        map.put("uploadedAt", t.getUploadedAt());
        return map;
    }

    private String getClientIp(jakarta.servlet.http.HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        if ("0:0:0:0:0:0:0:1".equals(ip)) {
            ip = "127.0.0.1";
        }
        return ip;
    }
}
