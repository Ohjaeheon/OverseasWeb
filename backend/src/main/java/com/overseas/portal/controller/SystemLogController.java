package com.overseas.portal.controller;

import com.overseas.portal.domain.AccessLog;
import com.overseas.portal.domain.LoginLog;
import com.overseas.portal.service.SystemLogService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SystemLogController {

    private final SystemLogService systemLogService;

    @Data
    public static class AccessLogRequest {
        private String pageName;
        private String path;
    }

    /**
     * 페이지 접근 로그 등록 (비인증 사용자도 접근 가능해야 하므로 /api/v1/logs 경로 사용)
     */
    @PostMapping("/api/v1/logs/access")
    public ResponseEntity<Void> logAccess(
            @RequestBody AccessLogRequest request,
            jakarta.servlet.http.HttpServletRequest httpRequest) {
        
        String username = SecurityContextHolder.getContext().getAuthentication() != null
                ? SecurityContextHolder.getContext().getAuthentication().getName()
                : "guest";
        
        String ip = getClientIp(httpRequest);
        systemLogService.logAccess(username, request.getPageName(), request.getPath(), ip);
        return ResponseEntity.ok().build();
    }

    /**
     * 로그인 로그 조회 (관리자 전용)
     */
    @GetMapping("/api/v1/admin/logs/login")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<LoginLog>> getLoginLogs(
            @RequestParam(value = "query", required = false, defaultValue = "") String query,
            @RequestParam(value = "status", required = false, defaultValue = "ALL") String status) {
        log.info("Fetching login logs with query='{}', status='{}'", query, status);
        return ResponseEntity.ok(systemLogService.getLoginLogs(query, status));
    }

    /**
     * 접근 로그 조회 (관리자 전용)
     */
    @GetMapping("/api/v1/admin/logs/access")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AccessLog>> getAccessLogs(
            @RequestParam(value = "query", required = false, defaultValue = "") String query) {
        log.info("Fetching access logs with query='{}'", query);
        return ResponseEntity.ok(systemLogService.getAccessLogs(query));
    }

    /**
     * 로그인 로그 비우기 (관리자 전용)
     */
    @DeleteMapping("/api/v1/admin/logs/login")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> clearLoginLogs() {
        log.warn("Request to clear all login logs received");
        systemLogService.clearLoginLogs();
        return ResponseEntity.ok().build();
    }

    /**
     * 접근 로그 비우기 (관리자 전용)
     */
    @DeleteMapping("/api/v1/admin/logs/access")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> clearAccessLogs() {
        log.warn("Request to clear all access logs received");
        systemLogService.clearAccessLogs();
        return ResponseEntity.ok().build();
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
        return ip;
    }
}
