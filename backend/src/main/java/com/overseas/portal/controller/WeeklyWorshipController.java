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
}
