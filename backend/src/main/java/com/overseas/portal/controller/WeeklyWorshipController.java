package com.overseas.portal.controller;

import com.overseas.portal.domain.WeeklyWorshipHistory;
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

@Slf4j
@RestController
@RequestMapping("/api/v1/admin/weekly-worship")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class WeeklyWorshipController {

    private final WeeklyWorshipService weeklyWorshipService;

    /**
     * 주간예배출결 취합 프로세스 실행
     */
    @PostMapping("/execute")
    public ResponseEntity<WeeklyWorshipService.WorshipJobResult> executeMerge(
            @RequestParam("file") MultipartFile file) {
        log.info("Received request to merge weekly worship file: {}", file.getOriginalFilename());
        try {
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
     * 취합 결과 임시 파일 다운로드 (실행 직후 페이지용 - 10분 유예 시간 제공)
     */
    @GetMapping("/download")
    public ResponseEntity<Resource> downloadFile(
            @RequestParam("jobId") String jobId,
            @RequestParam("type") String type) {
        log.info("Received download request for Job: {}, Type: {}", jobId, type);
        try {
            WeeklyWorshipService.WorshipJobInfo jobInfo = weeklyWorshipService.getJobInfo(jobId);
            if (jobInfo == null) {
                log.warn("Job info not found for Job ID: {}", jobId);
                return ResponseEntity.notFound().build();
            }

            Path filePath;
            String fileName;

            if ("SUNDAY".equalsIgnoreCase(type)) {
                filePath = jobInfo.getSundayFile();
                fileName = (filePath != null) ? filePath.getFileName().toString() : "해외-예배출결현황_주일.xlsx";
            } else if ("WEDNESDAY".equalsIgnoreCase(type)) {
                filePath = jobInfo.getWednesdayFile();
                fileName = (filePath != null) ? filePath.getFileName().toString() : "해외-예배출결현황_수요.xlsx";
            } else {
                filePath = jobInfo.getZipFile();
                fileName = "해외-예배출결현황_결과.zip";
            }

            if (filePath == null || !Files.exists(filePath)) {
                log.warn("Result file not found at path: {}", filePath);
                return ResponseEntity.notFound().build();
            }

            Resource resource = new UrlResource(filePath.toUri());
            String encodedFileName = URLEncoder.encode(fileName, StandardCharsets.UTF_8.toString()).replaceAll("\\+", "%20");

            // 10분 후에 임시 작업 리소스를 정리하는 비동기 태스크 실행 (다운로드 완료 대기 및 복수 파일 다운로드 여유 시간 제공)
            java.util.concurrent.CompletableFuture.runAsync(() -> {
                try {
                    java.util.concurrent.TimeUnit.MINUTES.sleep(10);
                    weeklyWorshipService.cleanupJob(jobId);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } catch (Exception e) {
                    log.error("Failed to cleanup job " + jobId + " after download", e);
                }
            });

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + encodedFileName + "\"; filename*=UTF-8''" + encodedFileName)
                    .body(resource);

        } catch (IOException e) {
            log.error("Failed to download merged worship file", e);
            return ResponseEntity.internalServerError().build();
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
            @RequestParam("type") String type) {
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
}
