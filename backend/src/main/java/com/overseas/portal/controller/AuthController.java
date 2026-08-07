package com.overseas.portal.controller;

import com.overseas.portal.security.JwtTokenProvider;
import com.overseas.portal.service.AuthService;
import com.overseas.portal.service.SystemLogService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final SystemLogService systemLogService;
    private final JwtTokenProvider tokenProvider;

    @Data
    public static class LoginRequest {
        private String username;
        private String password;
        private boolean isTelegramWebApp;
        private String telegramInitData;
    }

    @Data
    public static class TelegramLoginRequest {
        private String initData;
    }

    @Data
    public static class VerifyOtpRequest {
        private String preAuthToken;
        private String otpCode;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthService.LoginResponse> login(
            @RequestBody LoginRequest request,
            jakarta.servlet.http.HttpServletRequest httpRequest) {
        String ip = getClientIp(httpRequest);
        try {
            AuthService.LoginResponse response = authService.login(
                    request.getUsername(), request.getPassword(), request.isTelegramWebApp(), request.getTelegramInitData());
            
            if (response.isRequireOtp()) {
                systemLogService.logLogin(request.getUsername(), "SUCCESS", ip, "1차 로그인 성공 (OTP 인증 대기)");
            } else {
                systemLogService.logLogin(request.getUsername(), "SUCCESS", ip, "로그인 성공");
            }
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            systemLogService.logLogin(request.getUsername(), "FAILED", ip, e.getMessage());
            throw e;
        }
    }

    @PostMapping("/telegram-login")
    public ResponseEntity<AuthService.LoginResponse> telegramLogin(
            @RequestBody TelegramLoginRequest request,
            jakarta.servlet.http.HttpServletRequest httpRequest) {
        String ip = getClientIp(httpRequest);
        try {
            AuthService.LoginResponse response = authService.telegramLogin(request.getInitData());
            if ("NOT_LINKED".equals(response.getMessage())) {
                systemLogService.logLogin("unknown_telegram", "FAILED", ip, "텔레그램 계정 미연동 자동 로그인 실패");
            } else {
                systemLogService.logLogin(response.getUsername(), "SUCCESS", ip, "텔레그램 자동 로그인 성공");
            }
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            systemLogService.logLogin("unknown_telegram", "FAILED", ip, e.getMessage());
            throw e;
        }
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<AuthService.LoginResponse> verifyOtp(
            @RequestBody VerifyOtpRequest request,
            jakarta.servlet.http.HttpServletRequest httpRequest) {
        String ip = getClientIp(httpRequest);
        String username = "unknown";
        try {
            if (request.getPreAuthToken() != null && !request.getPreAuthToken().isEmpty()) {
                username = tokenProvider.getUsernameFromToken(request.getPreAuthToken());
            }
        } catch (Exception ignored) {}

        try {
            AuthService.LoginResponse response = authService.verifyOtp(
                    request.getPreAuthToken(), request.getOtpCode());
            systemLogService.logLogin(response.getUsername(), "SUCCESS", ip, "2차 OTP 로그인 성공");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            systemLogService.logLogin(username, "FAILED", ip, "2차 OTP 인증 실패: " + e.getMessage());
            throw e;
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
        return ip;
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            authService.logout(token);
        }
        return ResponseEntity.ok().build();
    }
}
