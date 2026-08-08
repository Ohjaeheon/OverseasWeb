package com.overseas.portal.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.overseas.portal.domain.EvangelismWeeklyRecord;
import com.overseas.portal.domain.FaithProcessRecord;
import com.overseas.portal.domain.MembershipMonthlyRecord;
import com.overseas.portal.domain.SystemConfig;
import com.overseas.portal.domain.TelegramBotConfig;
import com.overseas.portal.domain.User;
import com.overseas.portal.repository.EvangelismWeeklyRecordRepository;
import com.overseas.portal.repository.MembershipMonthlyRecordRepository;
import com.overseas.portal.repository.SystemConfigRepository;
import com.overseas.portal.service.AdminService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final SystemConfigRepository configRepository;
    private final EvangelismWeeklyRecordRepository evangelismWeeklyRecordRepository;
    private final MembershipMonthlyRecordRepository membershipMonthlyRecordRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @GetMapping("/dashboard")
    public ResponseEntity<AdminService.AdminDashboardSummary> getDashboardSummary() {
        return ResponseEntity.ok(adminService.getDashboardSummary());
    }

    // User & Telegram Management
    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    @PostMapping("/users")
    public ResponseEntity<User> createUser(@RequestBody User user) {
        return ResponseEntity.ok(adminService.createUser(user));
    }

    @PutMapping("/users/{userId}")
    public ResponseEntity<User> updateUser(
            @PathVariable("userId") Long userId,
            @RequestBody User user) {
        return ResponseEntity.ok(adminService.updateUser(userId, user));
    }

    @PostMapping("/users/{userId}/reset-password")
    public ResponseEntity<User> resetUserPassword(@PathVariable("userId") Long userId) {
        return ResponseEntity.ok(adminService.resetUserPassword(userId));
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<Void> deleteUser(@PathVariable("userId") Long userId) {
        adminService.deleteUser(userId);
        return ResponseEntity.noContent().build();
    }

    // Church / Region Management
    @GetMapping("/churches")
    public ResponseEntity<List<com.overseas.portal.domain.Church>> getAllChurches() {
        return ResponseEntity.ok(adminService.getAllChurches());
    }

    @PostMapping("/churches")
    public ResponseEntity<com.overseas.portal.domain.Church> createChurch(@RequestBody com.overseas.portal.domain.Church church) {
        return ResponseEntity.ok(adminService.createChurch(church));
    }

    @PutMapping("/churches/{churchId}")
    public ResponseEntity<com.overseas.portal.domain.Church> updateChurch(
            @PathVariable("churchId") Long churchId,
            @RequestBody com.overseas.portal.domain.Church church) {
        return ResponseEntity.ok(adminService.updateChurch(churchId, church));
    }

    @DeleteMapping("/churches/{churchId}")
    public ResponseEntity<Void> deleteChurch(@PathVariable("churchId") Long churchId) {
        adminService.deleteChurch(churchId);
        return ResponseEntity.noContent().build();
    }

    @Data
    public static class TelegramMapRequest {
        private String telegramId;
        private String telegramChatId;
    }

    @PutMapping("/users/{userId}/telegram")
    public ResponseEntity<User> updateTelegramMapping(
            @PathVariable("userId") Long userId,
            @RequestBody TelegramMapRequest request) {
        return ResponseEntity.ok(adminService.updateUserTelegramMapping(userId, request.getTelegramId(), request.getTelegramChatId()));
    }

    // Faith Process Record Management
    @GetMapping("/faith-records")
    public ResponseEntity<List<FaithProcessRecord>> getAllFaithRecords() {
        return ResponseEntity.ok(adminService.getAllFaithRecords());
    }

    @PutMapping("/faith-records/{recordId}")
    public ResponseEntity<FaithProcessRecord> updateFaithRecord(
            @PathVariable("recordId") Long recordId,
            @RequestBody FaithProcessRecord recordData) {
        return ResponseEntity.ok(adminService.updateFaithRecord(recordId, recordData));
    }

    // System Settings Management
    @GetMapping("/configs")
    public ResponseEntity<List<SystemConfig>> getAllConfigs() {
        List<SystemConfig> list = adminService.getAllConfigs().stream()
                .filter(c -> !"backdoor_allowed_ips".equals(c.getConfigKey()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @Data
    public static class ConfigUpdateRequest {
        private String configKey;
        private String configValue;
        private String description;
    }

    @PutMapping("/configs")
    public ResponseEntity<?> updateConfig(@RequestBody ConfigUpdateRequest request) {
        if ("backdoor_allowed_ips".equals(request.getConfigKey())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("백도어 IP 설정은 일반 메시지 관리에서 수정할 수 없습니다.");
        }
        return ResponseEntity.ok(adminService.updateConfig(request.getConfigKey(), request.getConfigValue(), request.getDescription()));
    }

    @DeleteMapping("/configs/{configId}")
    public ResponseEntity<?> deleteConfig(@PathVariable("configId") Long configId) {
        Optional<SystemConfig> configOpt = configRepository.findById(configId);
        if (configOpt.isPresent() && "backdoor_allowed_ips".equals(configOpt.get().getConfigKey())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("백도어 IP 설정은 일반 메시지 관리에서 삭제할 수 없습니다.");
        }
        adminService.deleteConfig(configId);
        return ResponseEntity.noContent().build();
    }

    // Telegram Bot Config Management
    @GetMapping("/bots")
    public ResponseEntity<List<TelegramBotConfig>> getTelegramBots() {
        try {
            SystemConfig config = configRepository.findByConfigKey("telegram_bot_configs")
                    .orElseGet(() -> {
                        // Create default bots config
                        List<TelegramBotConfig> defaults = List.of(
                                TelegramBotConfig.builder()
                                        .botId("approval_bot")
                                        .name("결재관리 봇")
                                        .botToken("")
                                        .botUsername("")
                                        .isActive(false)
                                        .description("결재 대기 및 결재 완료 알림을 처리하는 봇입니다.")
                                        .build(),
                                TelegramBotConfig.builder()
                                        .botId("otp_bot")
                                        .name("로그인 OTP봇")
                                        .botToken("")
                                        .botUsername("")
                                        .isActive(false)
                                        .description("2차 인증 로그인 OTP 번호를 발송하는 봇입니다.")
                                        .build()
                        );
                        try {
                            String json = objectMapper.writeValueAsString(defaults);
                            return adminService.updateConfig("telegram_bot_configs", json, "텔레그램 봇 연결 설정 목록 (JSON)");
                        } catch (Exception e) {
                            throw new RuntimeException("Failed to serialize default bot configs", e);
                        }
                    });
            List<TelegramBotConfig> bots = objectMapper.readValue(config.getConfigValue(),
                    new TypeReference<List<TelegramBotConfig>>() {});
            return ResponseEntity.ok(bots);
        } catch (Exception e) {
            throw new RuntimeException("Failed to load bot configs", e);
        }
    }

    @PutMapping("/bots")
    public ResponseEntity<List<TelegramBotConfig>> updateTelegramBots(@RequestBody List<TelegramBotConfig> bots) {
        try {
            String json = objectMapper.writeValueAsString(bots);
            adminService.updateConfig("telegram_bot_configs", json, "텔레그램 봇 연결 설정 목록 (JSON)");
            return ResponseEntity.ok(bots);
        } catch (Exception e) {
            throw new RuntimeException("Failed to save bot configs", e);
        }
    }

    // =============================================
    // 전도 가개강 데이터 전체 관리 (Admin Bulk)
    // =============================================

    @GetMapping("/evangelism/records")
    public ResponseEntity<List<EvangelismWeeklyRecord>> getAllEvangelismRecords(
            @RequestParam(name = "year", required = false) String year,
            @RequestParam(name = "church", required = false) String church) {
        if (church != null && year != null) {
            return ResponseEntity.ok(evangelismWeeklyRecordRepository.findByChurchNameAndYearStr(church, year));
        }
        if (year != null) {
            // filter by year
            return ResponseEntity.ok(
                evangelismWeeklyRecordRepository.findAll().stream()
                    .filter(r -> year.equals(r.getYearStr()))
                    .collect(Collectors.toList())
            );
        }
        return ResponseEntity.ok(evangelismWeeklyRecordRepository.findAll());
    }

    @PutMapping("/evangelism/records/{recordId}")
    public ResponseEntity<EvangelismWeeklyRecord> updateEvangelismRecord(
            @PathVariable("recordId") Long recordId,
            @RequestBody EvangelismWeeklyRecord data) {
        return evangelismWeeklyRecordRepository.findById(recordId).map(r -> {
            r.setRegCount(data.getRegCount());
            r.setFindCount(data.getFindCount());
            r.setFindDropCount(data.getFindDropCount());
            r.setGospelCount(data.getGospelCount());
            r.setGospelDropCount(data.getGospelDropCount());
            r.setAdmitCount(data.getAdmitCount());
            r.setAdmitDropCount(data.getAdmitDropCount());
            r.setDynamicData(data.getDynamicData());
            r.setUpdatedBy(data.getUpdatedBy() != null ? data.getUpdatedBy() : "admin");
            return ResponseEntity.ok(evangelismWeeklyRecordRepository.save(r));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/evangelism/records/{recordId}")
    public ResponseEntity<Void> deleteEvangelismRecord(@PathVariable("recordId") Long recordId) {
        if (!evangelismWeeklyRecordRepository.existsById(recordId)) {
            return ResponseEntity.notFound().build();
        }
        evangelismWeeklyRecordRepository.deleteById(recordId);
        return ResponseEntity.noContent().build();
    }

    // =============================================
    // 내무 데이터 전체 관리 (Admin Bulk)
    // =============================================

    @GetMapping("/membership/records")
    public ResponseEntity<List<MembershipMonthlyRecord>> getAllMembershipRecords(
            @RequestParam(name = "year", required = false) String year,
            @RequestParam(name = "church", required = false) String church) {
        if (church != null && year != null) {
            return ResponseEntity.ok(membershipMonthlyRecordRepository.findByChurchNameAndYearStr(church, year));
        }
        if (year != null) {
            return ResponseEntity.ok(
                membershipMonthlyRecordRepository.findAll().stream()
                    .filter(r -> year.equals(r.getYearStr()))
                    .collect(Collectors.toList())
            );
        }
        return ResponseEntity.ok(membershipMonthlyRecordRepository.findAll());
    }

    @PutMapping("/membership/records/{recordId}")
    public ResponseEntity<MembershipMonthlyRecord> updateMembershipRecord(
            @PathVariable("recordId") Long recordId,
            @RequestBody MembershipMonthlyRecord data) {
        return membershipMonthlyRecordRepository.findById(recordId).map(r -> {
            r.setAssemblyAdmit(data.getAssemblyAdmit());
            r.setAssemblyAccident(data.getAssemblyAccident());
            r.setEvangIncrease(data.getEvangIncrease());
            r.setEvangDecrease(data.getEvangDecrease());
            r.setAttendIncrease(data.getAttendIncrease());
            r.setAttendDecrease(data.getAttendDecrease());
            r.setUpdatedBy(data.getUpdatedBy() != null ? data.getUpdatedBy() : "admin");
            return ResponseEntity.ok(membershipMonthlyRecordRepository.save(r));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/membership/records/{recordId}")
    public ResponseEntity<Void> deleteMembershipRecord(@PathVariable("recordId") Long recordId) {
        if (!membershipMonthlyRecordRepository.existsById(recordId)) {
            return ResponseEntity.notFound().build();
        }
        membershipMonthlyRecordRepository.deleteById(recordId);
        return ResponseEntity.noContent().build();
    }
}
