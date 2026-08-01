package com.overseas.portal.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
public class TelegramBotService {

    @Value("${telegram.bot-token}")
    private String botToken;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * 텔레그램 Chat ID로 OTP 2차 인증 메시지 발송
     */
    public boolean sendOtpMessage(String chatId, String otpCode) {
        return sendOtpMessage(chatId, otpCode, this.botToken);
    }

    /**
     * 텔레그램 Chat ID로 OTP 2차 인증 메시지 발송 (동적 토큰 지원)
     */
    public boolean sendOtpMessage(String chatId, String otpCode, String token) {
        if (chatId == null || chatId.isBlank()) {
            log.warn("Telegram Chat ID is missing. Skipping Telegram notification.");
            return false;
        }

        String targetToken = (token != null && !token.isBlank()) ? token : this.botToken;
        String url = "https://api.telegram.org/bot" + targetToken + "/sendMessage";

        String text = String.format("""
                [해선부 업무포탈 2차 인증]
                요청하신 2차 인증번호(OTP)는 [%s] 입니다.
                3분 이내에 로그인 화면에 입력해 주세요.
                """, otpCode);

        Map<String, Object> body = new HashMap<>();
        body.put("chat_id", chatId);
        body.put("text", text);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(url, body, String.class);
            log.info("Telegram OTP sent to Chat ID {}: {}", chatId, response.getStatusCode());
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            log.error("Failed to send Telegram OTP message to Chat ID {}: {}", chatId, e.getMessage());
            return false;
        }
    }

    /**
     * 텔레그램 Chat ID로 테스트 메시지 발송 (동적 토큰 지원)
     */
    public boolean sendTestMessage(String chatId, String message, String token) {
        if (chatId == null || chatId.isBlank()) {
            log.warn("Telegram Chat ID is missing. Skipping Telegram notification.");
            return false;
        }

        String targetToken = (token != null && !token.isBlank()) ? token : this.botToken;
        String url = "https://api.telegram.org/bot" + targetToken + "/sendMessage";

        Map<String, Object> body = new HashMap<>();
        body.put("chat_id", chatId);
        body.put("text", message);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(url, body, String.class);
            log.info("Telegram test message sent to Chat ID {}: {}", chatId, response.getStatusCode());
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            log.error("Failed to send Telegram test message to Chat ID {}: {}", chatId, e.getMessage());
            return false;
        }
    }

    /**
     * 텔레그램으로 취합 완료 엑셀/ZIP 파일 직접 전송 (동적 토큰 지원)
     */
    public boolean sendDocument(String chatId, byte[] fileBytes, String filename, String caption, String token) {
        if (chatId == null || chatId.isBlank()) {
            return false;
        }

        String targetToken = (token != null && !token.isBlank()) ? token : this.botToken;
        String url = "https://api.telegram.org/bot" + targetToken + "/sendDocument";

        try {
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("chat_id", chatId);
            body.add("caption", caption);

            ByteArrayResource resource = new ByteArrayResource(fileBytes) {
                @Override
                public String getFilename() {
                    return filename;
                }
            };
            body.add("document", resource);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, requestEntity, String.class);
            log.info("Telegram document sent to Chat ID {}: {}", chatId, response.getStatusCode());
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            log.error("Failed to send Telegram document to Chat ID {}: {}", chatId, e.getMessage());
            return false;
        }
    }
}
