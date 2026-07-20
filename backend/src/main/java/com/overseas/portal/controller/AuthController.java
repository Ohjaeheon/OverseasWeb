package com.overseas.portal.controller;

import com.overseas.portal.service.AuthService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Data
    public static class LoginRequest {
        private String username;
        private String password;
        private boolean isTelegramWebApp;
    }

    @Data
    public static class VerifyOtpRequest {
        private String preAuthToken;
        private String otpCode;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthService.LoginResponse> login(@RequestBody LoginRequest request) {
        AuthService.LoginResponse response = authService.login(
                request.getUsername(), request.getPassword(), request.isTelegramWebApp());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<AuthService.LoginResponse> verifyOtp(@RequestBody VerifyOtpRequest request) {
        AuthService.LoginResponse response = authService.verifyOtp(
                request.getPreAuthToken(), request.getOtpCode());
        return ResponseEntity.ok(response);
    }
}
