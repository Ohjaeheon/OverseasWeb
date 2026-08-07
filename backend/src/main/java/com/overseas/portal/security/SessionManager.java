package com.overseas.portal.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class SessionManager {

    private static final long SESSION_EXPIRY_MS = 30 * 60 * 1000; // 30분 (밀리초)

    // Key: accessToken, Value: UserSessionInfo
    private final Map<String, UserSessionInfo> sessions = new ConcurrentHashMap<>();

    public static class UserSessionInfo {
        private final String username;
        private final long loginTime;
        private volatile long lastActivityTime;

        public UserSessionInfo(String username) {
            this.username = username;
            this.loginTime = System.currentTimeMillis();
            this.lastActivityTime = this.loginTime;
        }

        public String getUsername() {
            return username;
        }

        public long getLastActivityTime() {
            return lastActivityTime;
        }

        public void touch() {
            this.lastActivityTime = System.currentTimeMillis();
        }
    }

    /**
     * 만료된 세션을 일괄 정리합니다.
     */
    public synchronized void cleanupExpiredSessions() {
        long now = System.currentTimeMillis();
        sessions.entrySet().removeIf(entry -> {
            boolean expired = (now - entry.getValue().getLastActivityTime()) > SESSION_EXPIRY_MS;
            if (expired) {
                log.info("Session expired for user: {}", entry.getValue().getUsername());
            }
            return expired;
        });
    }

    /**
     * 새 세션을 등록합니다. 중복 로그인을 방지하기 위해 해당 사용자의 기존 세션을 제거합니다.
     */
    public synchronized void registerSession(String username, String token) {
        // 만료 세션 정리
        cleanupExpiredSessions();

        // 중복 로그인 방지: 동일 사용자의 기존 세션을 모두 제거
        sessions.entrySet().removeIf(entry -> {
            boolean isSameUser = entry.getValue().getUsername().equals(username);
            if (isSameUser) {
                log.info("Removing duplicate session for user: {} due to new login", username);
            }
            return isSameUser;
        });

        // 새 세션 등록
        sessions.put(token, new UserSessionInfo(username));
        log.info("Registered session for user: {}. Active sessions count: {}", username, sessions.size());
    }

    /**
     * 세션의 유효성을 검증하고, 유효한 경우 마지막 활동 시간을 현재 시각으로 갱신합니다.
     */
    public boolean validateAndTouchSession(String token) {
        UserSessionInfo sessionInfo = sessions.get(token);
        if (sessionInfo == null) {
            return false;
        }

        long now = System.currentTimeMillis();
        if ((now - sessionInfo.getLastActivityTime()) > SESSION_EXPIRY_MS) {
            sessions.remove(token);
            log.info("Session expired (on access) for user: {}", sessionInfo.getUsername());
            return false;
        }

        sessionInfo.touch();
        return true;
    }

    /**
     * 특정 세션을 즉시 만료(삭제)시킵니다. (로그아웃 등)
     */
    public void removeSession(String token) {
        if (token != null) {
            UserSessionInfo removed = sessions.remove(token);
            if (removed != null) {
                log.info("Removed session for user: {}", removed.getUsername());
            }
        }
    }

    /**
     * 1분마다 만료된 세션을 정기 정리합니다.
     */
    @Scheduled(fixedRate = 60000)
    public void scheduledCleanup() {
        cleanupExpiredSessions();
    }
}
