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
import com.overseas.portal.security.SessionManager;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.nio.charset.StandardCharsets;
import java.net.URLDecoder;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

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
    private final SessionManager sessionManager;
    private final ObjectMapper objectMapper = new ObjectMapper()
            .configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    private final SecureRandom random = new SecureRandom();

    @Value("${telegram.bot-token}")
    private String botToken;

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
        private String telegramUsername;
        private String message;
    }

    @Transactional
    public LoginResponse login(String username, String password, boolean isTelegramWebApp, String telegramInitData) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("아이디 또는 비밀번호가 일치하지 않습니다."));

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new IllegalArgumentException("아이디 또는 비밀번호가 일치하지 않습니다.");
        }

        if (!user.getIsActive()) {
            throw new IllegalStateException("비활성화된 계정입니다. 관리자에게 문의하세요.");
        }

        // 만약 텔레그램 웹앱 내부에서 수동 로그인한 경우, 계정 자동 연동 처리
        if (isTelegramWebApp && telegramInitData != null && !telegramInitData.isBlank()) {
            try {
                TelegramUser tgUser = parseAndVerifyTelegramInitData(telegramInitData);
                String tgIdStr = String.valueOf(tgUser.getId());
                String tgUsername = tgUser.getUsername();

                boolean modified = false;
                if (!tgIdStr.equals(user.getTelegramChatId())) {
                    user.setTelegramChatId(tgIdStr);
                    modified = true;
                }
                if (tgUsername != null && !tgUsername.isBlank() && !tgUsername.equals(user.getTelegramId())) {
                    user.setTelegramId(tgUsername);
                    modified = true;
                }
                if (modified) {
                    userRepository.save(user);
                    log.info("Linked telegram account (ID: {}, Username: {}) to user {} during manual login", 
                            tgIdStr, tgUsername, username);
                }
            } catch (Exception e) {
                log.error("Failed to link telegram account during manual login: {}", e.getMessage());
                throw new IllegalArgumentException("텔레그램 데이터 연동에 실패했습니다: " + e.getMessage());
            }
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
        sessionManager.registerSession(user.getUsername(), accessToken);
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
    public LoginResponse telegramLogin(String initData) {
        TelegramUser tgUser = parseAndVerifyTelegramInitData(initData);
        String tgIdStr = String.valueOf(tgUser.getId());
        String tgUsername = tgUser.getUsername();

        // 1. Find user by telegramChatId first
        Optional<User> userOpt = userRepository.findByTelegramChatId(tgIdStr);

        // 2. If not found, try to find by telegramId
        if (userOpt.isEmpty() && tgUsername != null && !tgUsername.isBlank()) {
            List<User> allUsers = userRepository.findAll();
            for (User u : allUsers) {
                if (u.getTelegramId() != null && !u.getTelegramId().isBlank()) {
                    String normDb = u.getTelegramId().replace("@", "").trim();
                    String normTg = tgUsername.replace("@", "").trim();
                    if (normDb.equalsIgnoreCase(normTg)) {
                        userOpt = Optional.of(u);
                        break;
                    }
                }
            }
        }

        if (userOpt.isEmpty()) {
            // 계정이 연동되지 않은 상태 반환
            return LoginResponse.builder()
                    .requireOtp(false)
                    .accessToken(null)
                    .telegramChatId(tgIdStr)
                    .telegramUsername(tgUsername)
                    .message("NOT_LINKED")
                    .build();
        }

        User user = userOpt.get();

        if (!user.getIsActive()) {
            throw new IllegalStateException("비활성화된 계정입니다. 관리자에게 문의하세요.");
        }

        // 정보 자동 갱신/매핑
        boolean modified = false;
        if (!tgIdStr.equals(user.getTelegramChatId())) {
            user.setTelegramChatId(tgIdStr);
            modified = true;
        }
        if (tgUsername != null && !tgUsername.isBlank() && !tgUsername.equals(user.getTelegramId())) {
            user.setTelegramId(tgUsername);
            modified = true;
        }
        if (modified) {
            userRepository.save(user);
            log.info("Telegram auto-login mapped/updated details for user: {}", user.getUsername());
        }

        boolean isFirstLogin = Boolean.TRUE.equals(user.getMustChangePassword());

        // 텔레그램 웹앱 접속 시 2차 인증(OTP)은 강제 면제
        String accessToken = tokenProvider.generateAccessToken(user.getUsername(), user.getRole(), user.getName());
        sessionManager.registerSession(user.getUsername(), accessToken);
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
                .message("텔레그램 자동 로그인 성공!")
                .build();
    }

    private TelegramUser parseAndVerifyTelegramInitData(String initData) {
        if (initData == null || initData.isBlank()) {
            throw new IllegalArgumentException("Telegram initData가 존재하지 않습니다.");
        }

        List<String> botTokens = new ArrayList<>();
        if (this.botToken != null && !this.botToken.isBlank()) {
            botTokens.add(this.botToken);
        }

        try {
            Optional<SystemConfig> configOpt = configRepository.findByConfigKey("telegram_bot_configs");
            if (configOpt.isPresent()) {
                List<TelegramBotConfig> bots = objectMapper.readValue(configOpt.get().getConfigValue(), 
                        new TypeReference<List<TelegramBotConfig>>() {});
                for (TelegramBotConfig bot : bots) {
                    if (Boolean.TRUE.equals(bot.getIsActive()) && bot.getBotToken() != null && !bot.getBotToken().isBlank()) {
                        if (!botTokens.contains(bot.getBotToken())) {
                            botTokens.add(bot.getBotToken());
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to read telegram bot configs for verification: {}", e.getMessage());
        }

        if (botTokens.isEmpty()) {
            throw new IllegalStateException("인증 처리를 위한 텔레그램 봇 토큰이 서버에 설정되지 않았습니다.");
        }

        Map<String, String> params = new HashMap<>();
        String hash = null;
        try {
            String[] pairs = initData.split("&");
            for (String pair : pairs) {
                int idx = pair.indexOf("=");
                if (idx == -1) continue;
                String key = URLDecoder.decode(pair.substring(0, idx), StandardCharsets.UTF_8.name());
                String val = URLDecoder.decode(pair.substring(idx + 1), StandardCharsets.UTF_8.name());
                if ("hash".equals(key)) {
                    hash = val;
                } else {
                    params.put(key, val);
                }
            }
        } catch (Exception e) {
            throw new IllegalArgumentException("Telegram initData 포맷이 잘못되었습니다.");
        }

        if (hash == null) {
            throw new IllegalArgumentException("Telegram initData 서명(hash)이 누락되었습니다.");
        }

        List<String> keys = new ArrayList<>(params.keySet());
        Collections.sort(keys);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < keys.size(); i++) {
            String key = keys.get(i);
            sb.append(key).append("=").append(params.get(key));
            if (i < keys.size() - 1) {
                sb.append("\n");
            }
        }
        String dataCheckString = sb.toString();

        boolean verified = false;
        for (String token : botTokens) {
            if (verifySignature(dataCheckString, hash, token)) {
                verified = true;
                break;
            }
        }

        if (!verified) {
            throw new IllegalArgumentException("텔레그램 서명 검증(Hash Verification)에 실패했습니다.");
        }

        String userJson = params.get("user");
        if (userJson == null) {
            throw new IllegalArgumentException("Telegram initData에 user 객체가 존재하지 않습니다.");
        }

        try {
            return objectMapper.readValue(userJson, TelegramUser.class);
        } catch (Exception e) {
            throw new IllegalArgumentException("Telegram user 파싱 에러: " + e.getMessage());
        }
    }

    private boolean verifySignature(String dataCheckString, String hash, String botToken) {
        try {
            byte[] secretKey = hmacSha256("WebAppData".getBytes(StandardCharsets.UTF_8), botToken.getBytes(StandardCharsets.UTF_8));
            byte[] calculatedHashBytes = hmacSha256(secretKey, dataCheckString.getBytes(StandardCharsets.UTF_8));
            String calculatedHash = bytesToHex(calculatedHashBytes);
            return calculatedHash.equalsIgnoreCase(hash);
        } catch (Exception e) {
            log.error("Failed to verify telegram signature: {}", e.getMessage());
            return false;
        }
    }

    private byte[] hmacSha256(byte[] key, byte[] data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKeySpec = new SecretKeySpec(key, "HmacSHA256");
        mac.init(secretKeySpec);
        return mac.doFinal(data);
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    @Data
    @NoArgsConstructor
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
    public static class TelegramUser {
        private Long id;
        private String first_name;
        private String last_name;
        private String username;
        private String language_code;
        private Boolean is_premium;
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
        sessionManager.registerSession(user.getUsername(), accessToken);

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

    public void logout(String token) {
        sessionManager.removeSession(token);
    }
}
