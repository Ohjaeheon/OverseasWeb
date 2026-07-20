package com.overseas.portal.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
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
        if (chatId == null || chatId.isBlank()) {
            log.warn("Telegram Chat ID is missing. Skipping Telegram notification.");
            return false;
        }

        String url = "https://api.telegram.org/bot" + botToken + "/sendMessage";

        String text = String.format("""
                [해선부 업무포탈 2차 인증]
                요청하신 2차 인증번호(OTP)는 [%s] 입니다.
                5분 이내에 로그인 화면에 입력해 주세요.
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
}
