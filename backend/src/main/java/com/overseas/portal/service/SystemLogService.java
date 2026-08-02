package com.overseas.portal.service;

import com.overseas.portal.domain.AccessLog;
import com.overseas.portal.domain.LoginLog;
import com.overseas.portal.domain.User;
import com.overseas.portal.repository.AccessLogRepository;
import com.overseas.portal.repository.LoginLogRepository;
import com.overseas.portal.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class SystemLogService {

    private final LoginLogRepository loginLogRepository;
    private final AccessLogRepository accessLogRepository;
    private final UserRepository userRepository;

    private String normalizeIp(String ip) {
        if (ip == null) return "127.0.0.1";
        String trimmed = ip.trim();
        if ("0:0:0:0:0:0:0:1".equals(trimmed) || "::1".equals(trimmed)) {
            return "127.0.0.1";
        }
        return trimmed;
    }

    /**
     * 로그인 로그 저장
     */
    public void logLogin(String username, String status, String ipAddress, String details) {
        String name = "GUEST";
        String cleanUsername = username;

        if (username != null && !username.equals("anonymousUser") && !username.isEmpty()) {
            name = userRepository.findByUsername(username)
                    .map(User::getName)
                    .orElse(username);
        } else {
            cleanUsername = "guest";
        }

        LoginLog loginLog = LoginLog.builder()
                .username(cleanUsername)
                .name(name)
                .ipAddress(normalizeIp(ipAddress))
                .status(status)
                .details(details)
                .createdAt(ZonedDateTime.now())
                .build();

        loginLogRepository.save(loginLog);
        log.info("Saved login log: User={}, Status={}, IP={}", cleanUsername, status, loginLog.getIpAddress());
    }

    /**
     * 접근 로그 저장
     */
    public void logAccess(String username, String pageName, String path, String ipAddress) {
        String name = "GUEST";
        String cleanUsername = username;

        if (username != null && !username.equals("anonymousUser") && !username.isEmpty()) {
            name = userRepository.findByUsername(username)
                    .map(User::getName)
                    .orElse(username);
        } else {
            cleanUsername = "guest";
        }

        AccessLog accessLog = AccessLog.builder()
                .username(cleanUsername)
                .name(name)
                .pageName(pageName)
                .path(path)
                .ipAddress(normalizeIp(ipAddress))
                .createdAt(ZonedDateTime.now())
                .build();

        accessLogRepository.save(accessLog);
        log.info("Saved access log: User={}, Page={}, Path={}, IP={}", cleanUsername, pageName, path, accessLog.getIpAddress());
    }

    /**
     * 로그인 로그 조회 (필터링 적용)
     */
    @Transactional(readOnly = true)
    public List<LoginLog> getLoginLogs(String query, String status) {
        return loginLogRepository.findAllByQueryAndStatus(query, status);
    }

    /**
     * 접근 로그 조회 (필터링 적용)
     */
    @Transactional(readOnly = true)
    public List<AccessLog> getAccessLogs(String query) {
        return accessLogRepository.findAllByQuery(query);
    }

    /**
     * 로그인 로그 전체 비우기
     */
    public void clearLoginLogs() {
        loginLogRepository.deleteAllInBatch();
        log.warn("Cleared all login logs");
    }

    /**
     * 접근 로그 전체 비우기
     */
    public void clearAccessLogs() {
        accessLogRepository.deleteAllInBatch();
        log.warn("Cleared all access logs");
    }
}
