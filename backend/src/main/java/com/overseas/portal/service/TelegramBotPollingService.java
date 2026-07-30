package com.overseas.portal.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.overseas.portal.domain.SystemConfig;
import com.overseas.portal.domain.TelegramBotConfig;
import com.overseas.portal.domain.User;
import com.overseas.portal.repository.SystemConfigRepository;
import com.overseas.portal.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class TelegramBotPollingService {

    private final UserRepository userRepository;
    private final SystemConfigRepository configRepository;
    private final TelegramBotService telegramBotService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    // 각 봇 토큰별 offset을 메모리에 보관
    private final Map<String, Integer> botOffsets = new ConcurrentHashMap<>();

    @Scheduled(fixedDelay = 3000) // 3초 주기 폴링
    public void pollTelegramUpdates() {
        List<TelegramBotConfig> activeBots = getActiveTelegramBots();
        if (activeBots.isEmpty()) {
            return;
        }

        for (TelegramBotConfig bot : activeBots) {
            String token = bot.getBotToken();
            if (token == null || token.isBlank()) continue;

            try {
                int offset = botOffsets.getOrDefault(token, 0);
                String url = String.format("https://api.telegram.org/bot%s/getUpdates?offset=%d&timeout=1", token, offset);
                
                ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    Map<String, Object> body = response.getBody();
                    Boolean ok = (Boolean) body.get("ok");
                    if (Boolean.TRUE.equals(ok)) {
                        List<Map<String, Object>> result = (List<Map<String, Object>>) body.get("result");
                        if (result != null && !result.isEmpty()) {
                            int maxUpdateId = offset;
                            for (Map<String, Object> update : result) {
                                int updateId = (Integer) update.get("update_id");
                                if (updateId >= maxUpdateId) {
                                    maxUpdateId = updateId + 1;
                                }
                                processSingleUpdate(update, bot);
                            }
                            botOffsets.put(token, maxUpdateId);
                        }
                    }
                }
            } catch (Exception e) {
                // API 호출 오류는 봇 토큰이 만료되었거나 비활성 상태일 때 자주 발생하므로 info/debug 레벨로 제어
                log.debug("Polling error for bot {}: {}", bot.getName(), e.getMessage());
            }
        }
    }

    private List<TelegramBotConfig> getActiveTelegramBots() {
        try {
            Optional<SystemConfig> configOpt = configRepository.findByConfigKey("telegram_bot_configs");
            if (configOpt.isPresent()) {
                return objectMapper.readValue(configOpt.get().getConfigValue(),
                        new TypeReference<List<TelegramBotConfig>>() {});
            }
        } catch (Exception e) {
            log.error("Failed to parse bot configs: {}", e.getMessage());
        }
        return Collections.emptyList();
    }

    private void processSingleUpdate(Map<String, Object> update, TelegramBotConfig bot) {
        try {
            Map<String, Object> message = (Map<String, Object>) update.get("message");
            if (message == null) return;

            Map<String, Object> from = (Map<String, Object>) message.get("from");
            if (from == null) return;

            Map<String, Object> chat = (Map<String, Object>) message.get("chat");
            if (chat == null) return;

            Object chatIdObj = chat.get("id");
            if (chatIdObj == null) return;
            String chatIdStr = String.valueOf(chatIdObj);

            String text = (String) message.get("text");
            String username = (String) from.get("username"); // 텔레그램 @username

            // 1. [2번 기능] Chat ID 확인용 간편 명령어 지원 (/myid, /챗아이디)
            if (text != null && (text.equalsIgnoreCase("/myid") || text.contains("챗아이디") || text.contains("챗 아이디") || text.contains("챗ID") || text.contains("챗 id"))) {
                String replyText = String.format("""
                        [해선부 업무포탈 챗 ID 조회]
                        회원님의 텔레그램 고유 Chat ID는 [%s] 입니다.
                        이 번호를 포탈의 [회원관리] -> [프로필 설정]에서 입력하여 저장해 주세요.
                        """, chatIdStr);
                telegramBotService.sendTestMessage(chatIdStr, replyText, bot.getBotToken());
                return;
            }

            // 2. [1번 기능] @username 매칭 자동 연동 처리
            if (username == null || username.isBlank()) {
                return;
            }

            String normalizedUsername = username.replace("@", "").trim();
            List<User> users = userRepository.findAll();
            
            for (User user : users) {
                String dbTelegramId = user.getTelegramId();
                if (dbTelegramId != null && !dbTelegramId.isBlank()) {
                    String normalizedDbId = dbTelegramId.replace("@", "").trim();
                    if (normalizedDbId.equalsIgnoreCase(normalizedUsername)) {
                        // 기존 챗 ID가 비어있거나 변경되었을 때만 업데이트 및 웰컴 메시지 전송
                        if (!chatIdStr.equals(user.getTelegramChatId())) {
                            user.setTelegramChatId(chatIdStr);
                            userRepository.save(user);
                            log.info("Telegram Chat ID auto-mapped for user {} to {}", user.getUsername(), chatIdStr);

                            // 사용자에게 연동 성공 알림
                            String welcomeText = String.format("""
                                    [해선부 업무포탈 텔레그램 연동 완료]
                                    안녕하세요, %s(%s)님!
                                    회원님의 계정과 텔레그램 봇 [%s]이 자동으로 매핑 및 연동 완료되었습니다.
                                    이제 2차 인증(OTP) 로그인 및 결재 알림을 정상적으로 수신하실 수 있습니다.
                                    """, user.getName(), user.getUsername(), bot.getName());
                            
                            telegramBotService.sendTestMessage(chatIdStr, welcomeText, bot.getBotToken());
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error processing telegram update: {}", e.getMessage());
        }
    }
}
