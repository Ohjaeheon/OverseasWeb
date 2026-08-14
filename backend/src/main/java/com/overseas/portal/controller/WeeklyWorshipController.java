package com.overseas.portal.controller;

import com.overseas.portal.domain.WeeklyWorshipHistory;
import com.overseas.portal.domain.WorshipRegionMapping;
import com.overseas.portal.domain.WorshipTemplate;
import com.overseas.portal.service.WeeklyWorshipService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/admin/weekly-worship")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class WeeklyWorshipController {

    private final WeeklyWorshipService weeklyWorshipService;
    private final com.overseas.portal.service.FileLogService fileLogService;

    /**
     * 주간예배출결 취합 프로세스 실행
     */
    @PostMapping("/execute")
    public ResponseEntity<WeeklyWorshipService.WorshipJobResult> executeMerge(
            @RequestParam("file") MultipartFile file,
            jakarta.servlet.http.HttpServletRequest request) {
        log.info("Received request to merge weekly worship file: {}", file.getOriginalFilename());
        try {
            // 업로드 로그 기록
            String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
            String ip = getClientIp(request);
            fileLogService.logUpload(username, file.getOriginalFilename(), file.getSize(), ip);

            WeeklyWorshipService.WorshipJobResult result = weeklyWorshipService.executeMerge(file);
            if (result.isSuccess()) {
                return ResponseEntity.ok(result);
            } else {
                return ResponseEntity.badRequest().body(result);
            }
        } catch (Exception e) {
            log.error("Error executing merge", e);
            return ResponseEntity.internalServerError().body(
                    WeeklyWorshipService.WorshipJobResult.builder()
                            .success(false)
                            .errorMessage(e.getMessage())
                            .build()
            );
        }
    }



    /**
     * 주간예배 취합 과거 전체 이력 조회
     */
    @GetMapping("/history")
    public ResponseEntity<List<WeeklyWorshipHistory>> getHistoryList() {
        log.info("Received request to fetch all weekly worship history");
        return ResponseEntity.ok(weeklyWorshipService.getHistoryList());
    }

    /**
     * 보관용 이력 파일 다운로드 (영구 소장용)
     */
    @GetMapping("/history/download")
    public ResponseEntity<Resource> downloadHistoryFile(
            @RequestParam("historyId") Long historyId,
            @RequestParam("type") String type,
            jakarta.servlet.http.HttpServletRequest request) {
        log.info("Received history download request for historyId: {}, Type: {}", historyId, type);
        try {
            Path filePath = weeklyWorshipService.getHistoryFile(historyId, type);
            String fileName = filePath.getFileName().toString();

            // 사용자 친화적 이름 맵핑
            if (fileName.startsWith("original_")) {
                fileName = "주간예배출결_원본_업로드.zip";
            } else if (fileName.startsWith("sunday_")) {
                fileName = "해외-예배출결현황_주일_결과.xlsx";
            } else if (fileName.startsWith("wednesday_")) {
                fileName = "해외-예배출결현황_수요_결과.xlsx";
            } else if (fileName.startsWith("merged_")) {
                fileName = "해외-예배출결현황_전체결과.zip";
            }

            // 다운로드 로그 기록
            String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
            String ip = getClientIp(request);
            fileLogService.logDownload(username, fileName, ip);

            Resource resource = new UrlResource(filePath.toUri());
            String encodedFileName = URLEncoder.encode(fileName, StandardCharsets.UTF_8.toString()).replaceAll("\\+", "%20");

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + encodedFileName + "\"; filename*=UTF-8''" + encodedFileName)
                    .body(resource);

        } catch (IOException | IllegalArgumentException e) {
            log.error("Failed to download history file for historyId: " + historyId, e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * 특정 이력의 보관된 물리 파일 삭제 (이력 및 로그는 유지)
     */
    @PostMapping("/history/delete-files")
    public ResponseEntity<Void> deleteHistoryFiles(@RequestParam("historyId") Long historyId) {
        log.info("Received request to delete history files for historyId: {}", historyId);
        try {
            weeklyWorshipService.deleteHistoryFiles(historyId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Failed to delete history files", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * 지역 매핑 전체 조회
     */
    @GetMapping("/regions")
    public ResponseEntity<List<WorshipRegionMapping>> listRegions() {
        return ResponseEntity.ok(weeklyWorshipService.listRegions());
    }

    /**
     * 지역 매핑 신규 등록
     */
    @PostMapping("/regions")
    public ResponseEntity<?> createRegion(@RequestBody WorshipRegionMapping body) {
        try {
            return ResponseEntity.ok(weeklyWorshipService.createRegion(body.getRegionNo(), body.getDisplayName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * 지역 매핑 수정 (번호/표시명/활성여부)
     */
    @PutMapping("/regions/{id}")
    public ResponseEntity<?> updateRegion(@PathVariable Long id, @RequestBody WorshipRegionMapping body) {
        try {
            return ResponseEntity.ok(weeklyWorshipService.updateRegion(id, body.getRegionNo(), body.getDisplayName(), body.getIsActive()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * 지역 매핑 삭제
     */
    @DeleteMapping("/regions/{id}")
    public ResponseEntity<?> deleteRegion(@PathVariable Long id) {
        try {
            weeklyWorshipService.deleteRegion(id);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * 업로드된 템플릿 이력 전체 조회 (활성 템플릿 포함)
     */
    @GetMapping("/template")
    public ResponseEntity<List<WorshipTemplate>> listTemplates() {
        return ResponseEntity.ok(weeklyWorshipService.listTemplates());
    }

    /**
     * 새 템플릿(양식.xlsx) 업로드 및 즉시 활성화
     */
    @PostMapping("/template")
    public ResponseEntity<?> uploadTemplate(@RequestParam("file") MultipartFile file,
                                             jakarta.servlet.http.HttpServletRequest request) {
        try {
            String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
            String ip = getClientIp(request);
            fileLogService.logUpload(username, file.getOriginalFilename(), file.getSize(), ip);

            return ResponseEntity.ok(weeklyWorshipService.uploadTemplate(file, username));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to upload worship template", e);
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * 과거 템플릿으로 롤백(활성 전환)
     */
    @PostMapping("/template/{id}/activate")
    public ResponseEntity<?> activateTemplate(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(weeklyWorshipService.activateTemplate(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to activate worship template", e);
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
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
