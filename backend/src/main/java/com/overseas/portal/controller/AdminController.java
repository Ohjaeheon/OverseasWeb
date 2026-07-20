package com.overseas.portal.controller;

import com.overseas.portal.domain.FaithProcessRecord;
import com.overseas.portal.domain.SystemConfig;
import com.overseas.portal.domain.User;
import com.overseas.portal.service.AdminService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

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
        return ResponseEntity.ok(adminService.getAllConfigs());
    }

    @Data
    public static class ConfigUpdateRequest {
        private String configKey;
        private String configValue;
    }

    @PutMapping("/configs")
    public ResponseEntity<SystemConfig> updateConfig(@RequestBody ConfigUpdateRequest request) {
        return ResponseEntity.ok(adminService.updateConfig(request.getConfigKey(), request.getConfigValue()));
    }
}
