package com.overseas.portal.controller;

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

@Slf4j
@RestController
@RequestMapping("/api/v1/admin/weekly-worship")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class WeeklyWorshipController {

    private final WeeklyWorshipService weeklyWorshipService;

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

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + encodedFileName + "\"; filename*=UTF-8''" + encodedFileName)
                    .body(resource);

        } catch (IOException e) {
            log.error("Failed to download merged worship file", e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
