package com.overseas.portal.service;

import com.overseas.portal.domain.TelegramOtpLog;
import com.overseas.portal.domain.User;
import com.overseas.portal.repository.TelegramOtpLogRepository;
import com.overseas.portal.repository.UserRepository;
import com.overseas.portal.security.JwtTokenProvider;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.ZonedDateTime;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final TelegramOtpLogRepository otpLogRepository;
    private final TelegramBotService telegramBotService;
    private final JwtTokenProvider tokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom random = new SecureRandom();

    @Data
    @Builder
    public static class LoginResponse {
        private boolean requireOtp;
        private String preAuthToken;
        private String accessToken;
        private String username;
        private String name;
        private String role;
        private String assignedCountry;
        private String message;
    }

    @Transactional
    public LoginResponse login(String username, String password, boolean isTelegramWebApp) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("아이디 또는 비밀번호가 일치하지 않습니다."));

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new IllegalArgumentException("아이디 또는 비밀번호가 일치하지 않습니다.");
        }

        if (!user.getIsActive()) {
            throw new IllegalStateException("비활성화된 계정입니다. 관리자에게 문의하세요.");
        }

        // OTP 2차 인증 미연동 모드: ID/PW 검증 완료 후 즉시 AccessToken 발급
        String accessToken = tokenProvider.generateAccessToken(user.getUsername(), user.getRole(), user.getName());
        return LoginResponse.builder()
                .requireOtp(false)
                .accessToken(accessToken)
                .username(user.getUsername())
                .name(user.getName())
                .role(user.getRole())
                .assignedCountry(user.getAssignedCountry())
                .message("로그인 성공!")
                .build();
    }

    @Transactional
    public LoginResponse verifyOtp(String preAuthToken, String otpCode) {
        if (!tokenProvider.validateToken(preAuthToken)) {
            throw new IllegalArgumentException("1차 인증 세션이 만료되었습니다. 다시 로그인해주세요.");
        }

        String username = tokenProvider.getUsernameFromToken(preAuthToken);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("사용자 정보를 찾을 수 없습니다."));

        Optional<TelegramOtpLog> latestOtp = otpLogRepository
                .findTopByUser_UserIdAndIsVerifiedFalseOrderByCreatedAtDesc(user.getUserId());

        if (latestOtp.isEmpty()) {
            throw new IllegalArgumentException("유효한 OTP 발송 내역이 없습니다.");
        }

        TelegramOtpLog otpLog = latestOtp.get();
        if (ZonedDateTime.now().isAfter(otpLog.getExpiresAt())) {
            throw new IllegalArgumentException("인증번호 입력 시간이 만료되었습니다.");
        }

        if (!otpLog.getOtpCode().equals(otpCode)) {
            throw new IllegalArgumentException("인증번호(OTP)가 일치하지 않습니다.");
        }

        // 인증 성공 처리
        otpLog.setIsVerified(true);
        otpLogRepository.save(otpLog);

        String accessToken = tokenProvider.generateAccessToken(user.getUsername(), user.getRole(), user.getName());

        return LoginResponse.builder()
                .requireOtp(false)
                .accessToken(accessToken)
                .username(user.getUsername())
                .name(user.getName())
                .role(user.getRole())
                .assignedCountry(user.getAssignedCountry())
                .message("2차 텔레그램 OTP 인증 성공!")
                .build();
    }
}
