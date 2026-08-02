package com.overseas.portal.controller;

import com.overseas.portal.domain.FileDownloadLog;
import com.overseas.portal.domain.FileUploadLog;
import com.overseas.portal.domain.User;
import com.overseas.portal.repository.UserRepository;
import com.overseas.portal.service.FileLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/admin/logs")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class FileLogController {

    private final FileLogService fileLogService;
    private final UserRepository userRepository;

    private boolean isAdmin() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        if (username == null || username.equals("anonymousUser") || username.isEmpty()) {
            return false;
        }
        return userRepository.findByUsername(username)
                .map(user -> "ROLE_ADMIN".equals(user.getRole()))
                .orElse(false);
    }

    /**
     * 파일 업로드 로그 목록 조회
     */
    @GetMapping("/file-upload")
    public ResponseEntity<List<FileUploadLog>> getFileUploadLogs(
            @RequestParam(value = "query", required = false) String query) {
        if (!isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(fileLogService.getFileUploadLogs(query));
    }

    /**
     * 파일 다운로드 로그 목록 조회
     */
    @GetMapping("/file-download")
    public ResponseEntity<List<FileDownloadLog>> getFileDownloadLogs(
            @RequestParam(value = "query", required = false) String query) {
        if (!isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(fileLogService.getFileDownloadLogs(query));
    }

    /**
     * 파일 업로드 로그 비우기
     */
    @DeleteMapping("/file-upload")
    public ResponseEntity<Void> clearFileUploadLogs() {
        if (!isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        fileLogService.clearFileUploadLogs();
        return ResponseEntity.ok().build();
    }

    /**
     * 파일 다운로드 로그 비우기
     */
    @DeleteMapping("/file-download")
    public ResponseEntity<Void> clearFileDownloadLogs() {
        if (!isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        fileLogService.clearFileDownloadLogs();
        return ResponseEntity.ok().build();
    }
}
