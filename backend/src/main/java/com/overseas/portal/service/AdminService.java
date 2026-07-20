package com.overseas.portal.service;

import com.overseas.portal.domain.*;
import com.overseas.portal.repository.*;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminService {

    private final UserRepository userRepository;
    private final FaithProcessRecordRepository faithProcessRecordRepository;
    private final ChurchRepository churchRepository;
    private final I18nDictionaryRepository i18nRepository;
    private final SystemConfigRepository configRepository;
    private final AuditLogRepository auditLogRepository;

    @Data
    @Builder
    public static class AdminDashboardSummary {
        private long totalUsers;
        private long activeUsers;
        private long totalChurches;
        private long totalFaithRecords;
        private List<AuditLog> recentLogs;
    }

    @Transactional(readOnly = true)
    public AdminDashboardSummary getDashboardSummary() {
        return AdminDashboardSummary.builder()
                .totalUsers(userRepository.count())
                .activeUsers(userRepository.findAll().stream().filter(User::getIsActive).count())
                .totalChurches(churchRepository.count())
                .totalFaithRecords(faithProcessRecordRepository.count())
                .recentLogs(auditLogRepository.findTop50ByOrderByCreatedAtDesc())
                .build();
    }

    private final PasswordEncoder passwordEncoder;

    // User Management
    @Transactional(readOnly = true)
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User createUser(User user) {
        if (userRepository.existsByUsername(user.getUsername())) {
            throw new IllegalArgumentException("이미 사용 중인 아이디입니다: " + user.getUsername());
        }
        // 초기 비밀번호 gotjsqn 및 변경 플래그 설정
        user.setPasswordHash(passwordEncoder.encode("gotjsqn"));
        user.setMustChangePassword(true);
        if (user.getAssignedCountry() == null || user.getAssignedCountry().isEmpty()) {
            user.setAssignedCountry("전체");
        }
        logAudit("ADMIN", "CREATE_USER", "Created user: " + user.getUsername() + ", assignedCountry: " + user.getAssignedCountry());
        return userRepository.save(user);
    }

    public User updateUser(Long userId, User updated) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. ID: " + userId));
        if (updated.getName() != null) user.setName(updated.getName());
        if (updated.getRole() != null) user.setRole(updated.getRole());
        if (updated.getAssignedCountry() != null) user.setAssignedCountry(updated.getAssignedCountry());
        if (updated.getTelegramId() != null) user.setTelegramId(updated.getTelegramId());
        if (updated.getTelegramChatId() != null) user.setTelegramChatId(updated.getTelegramChatId());
        if (updated.getIsActive() != null) user.setIsActive(updated.getIsActive());

        logAudit("ADMIN", "UPDATE_USER", "Updated user ID: " + userId + ", username: " + user.getUsername());
        return userRepository.save(user);
    }

    public User resetUserPassword(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. ID: " + userId));
        user.setPasswordHash(passwordEncoder.encode("gotjsqn"));
        user.setMustChangePassword(true);
        logAudit("ADMIN", "RESET_PASSWORD", "Reset password to gotjsqn for user: " + user.getUsername());
        return userRepository.save(user);
    }

    public void deleteUser(Long userId) {
        userRepository.deleteById(userId);
        logAudit("ADMIN", "DELETE_USER", "Deleted user ID: " + userId);
    }

    public User updateUserTelegramMapping(Long userId, String telegramId, String telegramChatId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        user.setTelegramId(telegramId);
        user.setTelegramChatId(telegramChatId);
        logAudit(user.getUsername(), "UPDATE_TELEGRAM_MAPPING", "Updated Telegram ID: " + telegramId + ", Chat ID: " + telegramChatId);
        return userRepository.save(user);
    }

    // Church Management
    @Transactional(readOnly = true)
    public List<Church> getAllChurches() {
        return churchRepository.findAll();
    }

    public Church createChurch(Church church) {
        logAudit("ADMIN", "CREATE_CHURCH", "Created church: " + church.getName() + " (" + church.getGubun() + ")");
        return churchRepository.save(church);
    }

    public Church updateChurch(Long churchId, Church updated) {
        Church church = churchRepository.findById(churchId)
                .orElseThrow(() -> new IllegalArgumentException("교회/지역을 찾을 수 없습니다. ID: " + churchId));
        if (updated.getName() != null) church.setName(updated.getName());
        if (updated.getGubun() != null) church.setGubun(updated.getGubun());
        if (updated.getJipa() != null) church.setJipa(updated.getJipa());
        if (updated.getContinent() != null) church.setContinent(updated.getContinent());
        if (updated.getCountry() != null) church.setCountry(updated.getCountry());
        if (updated.getLeaderName() != null) church.setLeaderName(updated.getLeaderName());
        if (updated.getFlightTime() != null) church.setFlightTime(updated.getFlightTime());
        if (updated.getDistanceKm() != null) church.setDistanceKm(updated.getDistanceKm());
        if (updated.getTimeDiff() != null) church.setTimeDiff(updated.getTimeDiff());
        if (updated.getLanguage() != null) church.setLanguage(updated.getLanguage());
        if (updated.getReligion() != null) church.setReligion(updated.getReligion());
        logAudit("ADMIN", "UPDATE_CHURCH", "Updated church ID: " + churchId + ", name: " + church.getName());
        return churchRepository.save(church);
    }

    public void deleteChurch(Long churchId) {
        churchRepository.deleteById(churchId);
        logAudit("ADMIN", "DELETE_CHURCH", "Deleted church ID: " + churchId);
    }

    // Faith Process Record Management
    @Transactional(readOnly = true)
    public List<FaithProcessRecord> getAllFaithRecords() {
        return faithProcessRecordRepository.findAll();
    }

    public FaithProcessRecord updateFaithRecord(Long recordId, FaithProcessRecord updatedData) {
        FaithProcessRecord record = faithProcessRecordRepository.findById(recordId)
                .orElseThrow(() -> new IllegalArgumentException("진단 기록을 찾을 수 없습니다."));

        if (updatedData.getEvangReg() != null) record.setEvangReg(updatedData.getEvangReg());
        if (updatedData.getBibleMonthReg() != null) record.setBibleMonthReg(updatedData.getBibleMonthReg());
        if (updatedData.getCenterMonthTotal() != null) record.setCenterMonthTotal(updatedData.getCenterMonthTotal());
        if (updatedData.getRegistered() != null) record.setRegistered(updatedData.getRegistered());
        if (updatedData.getAttTotal() != null) record.setAttTotal(updatedData.getAttTotal());
        if (updatedData.getAbsTotal() != null) record.setAbsTotal(updatedData.getAbsTotal());

        logAudit("ADMIN", "UPDATE_FAITH_RECORD", "Updated Record ID: " + recordId + " for month: " + record.getYearMonth());
        return faithProcessRecordRepository.save(record);
    }

    // System Config Management
    @Transactional(readOnly = true)
    public List<SystemConfig> getAllConfigs() {
        return configRepository.findAll();
    }

    public SystemConfig updateConfig(String configKey, String configValue) {
        SystemConfig config = configRepository.findByConfigKey(configKey)
                .orElseGet(() -> SystemConfig.builder().configKey(configKey).build());
        config.setConfigValue(configValue);
        logAudit("ADMIN", "UPDATE_CONFIG", "Updated key: " + configKey);
        return configRepository.save(config);
    }

    private void logAudit(String username, String action, String details) {
        auditLogRepository.save(AuditLog.builder()
                .username(username)
                .action(action)
                .details(details)
                .createdAt(ZonedDateTime.now())
                .build());
    }
}
