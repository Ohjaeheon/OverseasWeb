package com.overseas.portal.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.overseas.portal.domain.SystemConfig;
import com.overseas.portal.domain.TelegramBotConfig;
import com.overseas.portal.domain.TelegramOtpLog;
import com.overseas.portal.domain.User;
import com.overseas.portal.repository.SystemConfigRepository;
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
import java.util.List;
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
    private final SystemConfigRepository configRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
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
        private boolean mustChangePassword;
        private boolean isOtpExempt;
        private String telegramChatId;
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

        // 로그인 OTP봇 활성화 상태 확인 및 사용자의 OTP 예외 여부 체크
        boolean otpEnabled = false;
        String otpBotToken = null;
        if (!Boolean.TRUE.equals(user.getIsOtpExempt())) {
            try {
                Optional<SystemConfig> configOpt = configRepository.findByConfigKey("telegram_bot_configs");
                if (configOpt.isPresent()) {
                    String configVal = configOpt.get().getConfigValue();
                    List<TelegramBotConfig> bots = objectMapper.readValue(configVal, 
                            new TypeReference<List<TelegramBotConfig>>() {});
                    for (TelegramBotConfig bot : bots) {
                        if ("otp_bot".equals(bot.getBotId()) && Boolean.TRUE.equals(bot.getIsActive())) {
                            otpEnabled = true;
                            otpBotToken = bot.getBotToken();
                            break;
                        }
                    }
                }
            } catch (Exception e) {
                log.error("Failed to check OTP bot status: {}", e.getMessage());
            }
        }

        boolean isFirstLogin = Boolean.TRUE.equals(user.getMustChangePassword());

        if (otpEnabled && !isTelegramWebApp && !isFirstLogin) {
            // OTP 2차 인증 진행
            if (user.getTelegramChatId() == null || user.getTelegramChatId().isBlank()) {
                throw new IllegalStateException("텔레그램 Chat ID가 설정되지 않아 2차 인증(OTP)을 진행할 수 없습니다. [회원관리] 메뉴에서 텔레그램 연동을 완료하고 다시 시도하세요.");
            }

            // 6자리 OTP 코드 생성
            String otpCode = String.format("%06d", random.nextInt(1000000));
            ZonedDateTime now = ZonedDateTime.now();
            ZonedDateTime expiresAt = now.plusMinutes(3); // 3분 타임아웃 적용

            TelegramOtpLog otpLog = TelegramOtpLog.builder()
                    .user(user)
                    .otpCode(otpCode)
                    .expiresAt(expiresAt)
                    .isVerified(false)
                    .createdAt(now)
                    .build();
            otpLogRepository.save(otpLog);

            // OTP 메시지 발송
            boolean sent = telegramBotService.sendOtpMessage(user.getTelegramChatId(), otpCode, otpBotToken);
            if (!sent) {
                throw new IllegalStateException("텔레그램 OTP 발송에 실패했습니다. 시스템 관리자에게 문의하거나 잠시 후 다시 시도해 주세요.");
            }

            // 1차 인증 세션용 PreAuthToken 생성 (유효시간 3분)
            String preAuthToken = tokenProvider.generatePreAuthToken(user.getUsername());

            return LoginResponse.builder()
                    .requireOtp(true)
                    .preAuthToken(preAuthToken)
                    .message("2차 텔레그램 OTP 인증번호가 발송되었습니다.")
                    .build();
        }

        // OTP 제외 계정이거나, 텔레그램 웹앱 로그인, 혹은 OTP 봇이 비활성화된 경우, 혹은 최초 로그인인 경우 즉시 AccessToken 발급
        String accessToken = tokenProvider.generateAccessToken(user.getUsername(), user.getRole(), user.getName());
        return LoginResponse.builder()
                .requireOtp(false)
                .accessToken(accessToken)
                .username(user.getUsername())
                .name(user.getName())
                .role(user.getRole())
                .assignedCountry(user.getAssignedCountry())
                .mustChangePassword(isFirstLogin)
                .isOtpExempt(Boolean.TRUE.equals(user.getIsOtpExempt()))
                .telegramChatId(user.getTelegramChatId())
                .message(isFirstLogin ? "초기 비밀번호 로그인 성공! 비밀번호를 변경해 주세요." : "로그인 성공!")
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
                .mustChangePassword(Boolean.TRUE.equals(user.getMustChangePassword()))
                .isOtpExempt(Boolean.TRUE.equals(user.getIsOtpExempt()))
                .telegramChatId(user.getTelegramChatId())
                .message("2차 텔레그램 OTP 인증 성공!")
                .build();
    }
}
