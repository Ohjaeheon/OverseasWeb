package com.overseas.portal.controller;

import com.overseas.portal.domain.Church;
import com.overseas.portal.domain.WeeklyReportSubmission;
import com.overseas.portal.service.FileLogService;
import com.overseas.portal.service.WeeklyReportSubmissionService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 주간보고 제출 데이터 API
 */
@Slf4j
@RestController
@RequiredArgsConstructor
public class WeeklyReportSubmissionController {

    private final WeeklyReportSubmissionService submissionService;
    private final FileLogService fileLogService;

    @Value("${app.upload.weekly-report-photos:./uploads/weekly-report-photos}")
    private String uploadDir;

    /** 접근 가능 교회 목록 (권한 필터링) */
    @GetMapping("/api/v1/weekly-report/accessible-churches")
    public ResponseEntity<List<Church>> getAccessibleChurches() {
        return ResponseEntity.ok(submissionService.getAccessibleChurches());
    }

    /** 보고 데이터 제출 (대상 주차는 현재 주차와 일치해야 함 — 지난 주차는 거부) */
    @PostMapping("/api/v1/weekly-report/submit")
    public ResponseEntity<?> submitReport(@RequestBody Map<String, Object> body) {
        try {
            Integer reportYear = Integer.valueOf(body.get("reportYear").toString());
            Integer reportMonth = Integer.valueOf(body.get("reportMonth").toString());
            Integer reportWeekOfMonth = Integer.valueOf(body.get("reportWeekOfMonth").toString());
            Long churchId = Long.valueOf(body.get("churchId").toString());
            String submitDataJson = body.get("submitDataJson").toString();
            String photoPaths = body.containsKey("photoPaths") ? body.get("photoPaths").toString() : null;

            WeeklyReportSubmission result = submissionService.submitReport(
                    reportYear, reportMonth, reportWeekOfMonth, churchId, submitDataJson, photoPaths);
            return ResponseEntity.ok(result);
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("주간보고 제출 오류", e);
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /** 사진 업로드 */
    @PostMapping(value = "/api/v1/weekly-report/submit/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadPhotos(
            @RequestParam("files") List<MultipartFile> files,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest request) {
        try {
            Path dir = Paths.get(uploadDir);
            if (!Files.exists(dir)) Files.createDirectories(dir);

            List<String> savedPaths = new ArrayList<>();
            String username = principal != null ? principal.getUsername() : "anonymous";
            String ip = getClientIp(request);

            for (MultipartFile file : files) {
                String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "photo";
                String savedName = System.currentTimeMillis() + "_" + originalName;
                Path dest = dir.resolve(savedName);
                file.transferTo(dest.toFile());
                savedPaths.add("weekly-report-photos/" + savedName);

                fileLogService.logUpload(username, originalName, file.getSize(), ip);
            }

            return ResponseEntity.ok(Map.of("paths", savedPaths));
        } catch (IOException e) {
            log.error("사진 업로드 오류", e);
            return ResponseEntity.internalServerError().body(Map.of("message", "파일 업로드에 실패했습니다."));
        }
    }

    /** 제출 현황 조회 - 주차별 (관리자용, 미지정 시 전체) */
    @GetMapping("/api/v1/admin/weekly-report/submissions")
    public ResponseEntity<List<WeeklyReportSubmission>> getSubmissions(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer weekOfMonth) {
        if (year != null && month != null && weekOfMonth != null) {
            return ResponseEntity.ok(submissionService.getSubmissionsByWeek(year, month, weekOfMonth));
        }
        return ResponseEntity.ok(submissionService.getAllSubmissions());
    }

    /** 제출 상세 조회 (관리자용) */
    @GetMapping("/api/v1/admin/weekly-report/submissions/{submissionId}")
    public ResponseEntity<WeeklyReportSubmission> getSubmission(@PathVariable Long submissionId) {
        return ResponseEntity.ok(submissionService.getSubmission(submissionId));
    }

    /** 제출 삭제 (관리자용) */
    @DeleteMapping("/api/v1/admin/weekly-report/submissions/{submissionId}")
    public ResponseEntity<Void> deleteSubmission(@PathVariable Long submissionId) {
        submissionService.deleteSubmission(submissionId);
        return ResponseEntity.ok().build();
    }

    /** 내 교회의 전체 제출 이력 (주차 선택기에서 제출/잠금 여부 표시용) */
    @GetMapping("/api/v1/weekly-report/my-submissions")
    public ResponseEntity<List<WeeklyReportSubmission>> getMySubmissions(@RequestParam Long churchId) {
        return ResponseEntity.ok(submissionService.getMySubmissions(churchId));
    }

    /** 내 교회의 특정 주차 제출 여부 확인 (사용자용) */
    @GetMapping("/api/v1/weekly-report/my-submission")
    public ResponseEntity<?> getMySubmission(
            @RequestParam int year, @RequestParam int month, @RequestParam int weekOfMonth,
            @RequestParam Long churchId) {
        return submissionService.getMySubmission(year, month, weekOfMonth, churchId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) ip = request.getRemoteAddr();
        if (ip != null && ip.contains(",")) ip = ip.split(",")[0].trim();
        if ("0:0:0:0:0:0:0:1".equals(ip)) ip = "127.0.0.1";
        return ip;
    }
}
