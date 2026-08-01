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
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class TelegramBotPollingService {

    private final UserRepository userRepository;
    private final SystemConfigRepository configRepository;
    private final TelegramBotService telegramBotService;
    private final WeeklyWorshipService weeklyWorshipService;
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

            // 2. [신규 기능] 주간예배출결 자동 취합 처리 (사용자가 .zip 파일을 텔레그램 봇으로 전송했을 때)
            Map<String, Object> document = (Map<String, Object>) message.get("document");
            if (document != null) {
                String fileId = (String) document.get("file_id");
                String fileName = (String) document.get("file_name");
                if (fileName != null && fileName.toLowerCase().endsWith(".zip")) {
                    handleTelegramZipUpload(chatIdStr, fileId, fileName, bot);
                    return;
                }
            }

            // 3. [1번 기능] @username 매칭 자동 연동 처리
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

    /**
     * 텔레그램으로 업로드된 ZIP 파일 다운로드 및 자동 취합 실행
     */
    private void handleTelegramZipUpload(String chatId, String fileId, String fileName, TelegramBotConfig bot) {
        log.info("Received Zip file upload from Chat ID: {}, File: {}", chatId, fileName);
        String token = bot.getBotToken();

        // 1. 등록된 사용자인지 및 주간예배 출결 취합 권한이 있는지 확인
        Optional<User> userOpt = userRepository.findAll().stream()
                .filter(u -> chatId.equals(u.getTelegramChatId()))
                .findFirst();

        if (userOpt.isEmpty() || !Boolean.TRUE.equals(userOpt.get().getIsWorshipPermitted())) {
            log.warn("Unauthorized ZIP upload attempt from Chat ID: {}. Silent ignore.", chatId);
            return;
        }

        User user = userOpt.get();
        telegramBotService.sendTestMessage(chatId, String.format("[%s님] 주간예배 출결 ZIP 파일 수신 완료. 취합 스크립트 구동을 시작합니다. 잠시만 기다려 주세요...", user.getName()), token);

        try {
            // 2. 파일 다운로드
            byte[] fileBytes = downloadFile(fileId, token);
            if (fileBytes == null || fileBytes.length == 0) {
                telegramBotService.sendTestMessage(chatId, "[에러] 텔레그램 서버에서 파일을 다운로드하는 데 실패했습니다.", token);
                return;
            }

            // 3. 취합 수행
            TelegramMultipartFile tmf = new TelegramMultipartFile(fileBytes, fileName);
            WeeklyWorshipService.WorshipJobResult result = weeklyWorshipService.executeMerge(tmf);

            if (result.isSuccess()) {
                Long historyId = result.getHistoryId();
                log.info("Telegram Worship Merge Success: History ID: {}", historyId);

                // 4. 결과 파일 로드 및 텔레그램 전송
                try {
                    java.nio.file.Path sundayPath = weeklyWorshipService.getHistoryFile(historyId, "SUNDAY");
                    java.nio.file.Path wednesdayPath = weeklyWorshipService.getHistoryFile(historyId, "WEDNESDAY");
                    java.nio.file.Path zipPath = weeklyWorshipService.getHistoryFile(historyId, "ALL_ZIP");

                    byte[] sundayBytes = Files.readAllBytes(sundayPath);
                    byte[] wednesdayBytes = Files.readAllBytes(wednesdayPath);
                    byte[] zipBytes = Files.readAllBytes(zipPath);

                    // 주차 정보 가져오기
                    String weekInfo = weeklyWorshipService.getHistoryList().stream()
                            .filter(h -> h.getHistoryId().equals(historyId))
                            .map(h -> h.getWeekInfo())
                            .findFirst().orElse("주간예배");

                    telegramBotService.sendTestMessage(chatId, String.format("[성공] %s 주간예배 출결 현황 취합 완료!\n모바일에서 즉시 열람하실 수 있도록 결과 엑셀 및 압축본을 전송합니다.", weekInfo), token);

                    telegramBotService.sendDocument(chatId, sundayBytes, "해외-예배출결현황_주일_결과.xlsx", "[결과] 주일예배 출결 현황", token);
                    telegramBotService.sendDocument(chatId, wednesdayBytes, "해외-예배출결현황_수요_결과.xlsx", "[결과] 수요예배 출결 현황", token);
                    telegramBotService.sendDocument(chatId, zipBytes, "해외-예배출결현황_전체결과.zip", "[결과] 주일/수요 통합 합본 (.zip)", token);

                } catch (Exception ex) {
                    log.error("Failed to read/send result files for history " + historyId, ex);
                    telegramBotService.sendTestMessage(chatId, "[에러] 취합에 성공했으나 결과 파일을 가공 및 전송하는 데 실패했습니다.", token);
                }
            } else {
                log.error("Telegram Worship Merge Failed: {}", result.getErrorMessage());
                telegramBotService.sendTestMessage(chatId, String.format("[실패] 취합 처리 중 에러가 발생했습니다.\n- 사유: %s\n\n상세 내용은 포탈 로그에서 확인해 주세요.", result.getErrorMessage()), token);
            }

        } catch (Exception e) {
            log.error("Failed to process Telegram merge job", e);
            telegramBotService.sendTestMessage(chatId, "[에러] 서버 내부 처리 중 오류가 발생했습니다: " + e.getMessage(), token);
        }
    }

    /**
     * 텔레그램 파일 다운로드
     */
    private byte[] downloadFile(String fileId, String token) {
        String url = String.format("https://api.telegram.org/bot%s/getFile?file_id=%s", token, fileId);
        try {
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response != null && Boolean.TRUE.equals(response.get("ok"))) {
                Map<String, Object> result = (Map<String, Object>) response.get("result");
                if (result != null) {
                    String filePath = (String) result.get("file_path");
                    String downloadUrl = String.format("https://api.telegram.org/file/bot%s/%s", token, filePath);
                    return restTemplate.getForObject(downloadUrl, byte[].class);
                }
            }
        } catch (Exception e) {
            log.error("Failed to download file from Telegram: " + fileId, e);
        }
        return null;
    }

    /**
     * MultipartFile 구현체
     */
    private static class TelegramMultipartFile implements MultipartFile {
        private final byte[] content;
        private final String filename;

        public TelegramMultipartFile(byte[] content, String filename) {
            this.content = content;
            this.filename = filename;
        }

        @Override
        public String getName() {
            return "file";
        }

        @Override
        public String getOriginalFilename() {
            return filename;
        }

        @Override
        public String getContentType() {
            return "application/zip";
        }

        @Override
        public boolean isEmpty() {
            return content == null || content.length == 0;
        }

        @Override
        public long getSize() {
            return content.length;
        }

        @Override
        public byte[] getBytes() throws IOException {
            return content;
        }

        @Override
        public InputStream getInputStream() throws IOException {
            return new ByteArrayInputStream(content);
        }

        @Override
        public void transferTo(java.io.File dest) throws IOException, IllegalStateException {
            Files.write(dest.toPath(), content);
        }
    }
}
