package com.overseas.portal.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.overseas.portal.domain.SystemConfig;
import com.overseas.portal.domain.TelegramBotConfig;
import com.overseas.portal.domain.User;
import com.overseas.portal.repository.SystemConfigRepository;
import com.overseas.portal.repository.UserRepository;
import com.overseas.portal.security.JwtTokenProvider;
import com.overseas.portal.service.TelegramBotService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final SystemConfigRepository configRepository;
    private final TelegramBotService telegramBotService;
    private final JwtTokenProvider tokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private User getAuthenticatedUser(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new IllegalArgumentException("인증 토큰이 누락되었습니다.");
        }
        String token = authHeader.replace("Bearer ", "");
        if (!tokenProvider.validateToken(token)) {
            throw new IllegalArgumentException("인증 토큰이 유효하지 않습니다.");
        }
        String username = tokenProvider.getUsernameFromToken(token);
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("사용자 정보를 찾을 수 없습니다."));
    }

    @GetMapping("/profile")
    public ResponseEntity<User> getMyProfile(@RequestHeader("Authorization") String authHeader) {
        User user = getAuthenticatedUser(authHeader);
        return ResponseEntity.ok(user);
    }

    @GetMapping("/list-simple")
    public ResponseEntity<?> getSimpleUserList() {
        List<java.util.Map<String, String>> simpleList = userRepository.findAll().stream()
                .filter(User::getIsActive)
                .map(u -> java.util.Map.of(
                        "username", u.getUsername(),
                        "name", u.getName()
                ))
                .toList();
        return ResponseEntity.ok(simpleList);
    }

    @Data
    public static class ProfileUpdateRequest {
        private String telegramId;
        private String telegramChatId;
    }

    @PutMapping("/profile")
    public ResponseEntity<User> updateMyProfile(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody ProfileUpdateRequest request) {
        User user = getAuthenticatedUser(authHeader);
        user.setTelegramId(request.getTelegramId());
        user.setTelegramChatId(request.getTelegramChatId());
        return ResponseEntity.ok(userRepository.save(user));
    }

    @Data
    public static class ProfileBotTestRequest {
        private String botId;
        private String testMessage;
    }

    @PostMapping("/profile/bot-test")
    public ResponseEntity<String> testBotMessage(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody ProfileBotTestRequest request) {
        User user = getAuthenticatedUser(authHeader);

        if (user.getTelegramChatId() == null || user.getTelegramChatId().isBlank()) {
            return ResponseEntity.badRequest().body("텔레그램 Chat ID가 설정되지 않았습니다. 정보를 먼저 저장하고 다시 시도하세요.");
        }

        // 해당 봇 설정 조회
        SystemConfig config = configRepository.findByConfigKey("telegram_bot_configs")
                .orElseThrow(() -> new IllegalArgumentException("봇 설정 목록이 데이터베이스에 존재하지 않습니다."));

        try {
            List<TelegramBotConfig> bots = objectMapper.readValue(config.getConfigValue(),
                    new TypeReference<List<TelegramBotConfig>>() {});
            TelegramBotConfig targetBot = bots.stream()
                    .filter(b -> b.getBotId().equals(request.getBotId()))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("요청한 봇을 찾을 수 없습니다. ID: " + request.getBotId()));

            if (targetBot.getBotToken() == null || targetBot.getBotToken().isBlank()) {
                return ResponseEntity.badRequest().body("해당 봇의 토큰이 등록되어 있지 않습니다.");
            }

            String msg = String.format("""
                    [해선부 업무포탈 텔레그램 연동 테스트]
                    발송 봇: %s
                    사용자: %s (%s)
                    내용: %s
                    """, targetBot.getName(), user.getName(), user.getUsername(), request.getTestMessage());

            boolean success = telegramBotService.sendTestMessage(user.getTelegramChatId(), msg, targetBot.getBotToken());

            if (success) {
                return ResponseEntity.ok("성공적으로 테스트 메시지를 발송했습니다.");
            } else {
                return ResponseEntity.internalServerError().body("메시지 발송 실패. 토큰이 올바른지, 봇과 대화방이 시작되었는지 확인해 주세요.");
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("테스트 에러: " + e.getMessage());
        }
    }

    @Data
    public static class PasswordUpdateRequest {
        private String currentPassword;
        private String newPassword;
    }

    @PutMapping("/profile/password")
    public ResponseEntity<String> updatePassword(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody PasswordUpdateRequest request) {
        try {
            User user = getAuthenticatedUser(authHeader);

            if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
                return ResponseEntity.badRequest().body("현재 비밀번호가 일치하지 않습니다.");
            }

            if (request.getNewPassword() == null || request.getNewPassword().isBlank()) {
                return ResponseEntity.badRequest().body("새 비밀번호를 입력해주세요.");
            }

            // 새 비밀번호 설정 및 mustChangePassword 해제
            user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
            user.setMustChangePassword(false);
            userRepository.save(user);

            return ResponseEntity.ok("비밀번호가 성공적으로 변경되었습니다.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("비밀번호 변경 실패: " + e.getMessage());
        }
    }
}
