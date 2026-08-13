package com.overseas.portal.controller;

import com.overseas.portal.domain.EvangelismWeeklyRecord;
import com.overseas.portal.domain.EvangelismEditRequest;
import com.overseas.portal.domain.SystemConfig;
import com.overseas.portal.repository.EvangelismWeeklyRecordRepository;
import com.overseas.portal.repository.EvangelismEditRequestRepository;
import com.overseas.portal.repository.SystemConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import com.fasterxml.jackson.databind.ObjectMapper;

@Slf4j
@RestController
@RequestMapping("/api/v1/evangelism")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class EvangelismController {

    private final EvangelismWeeklyRecordRepository evangelismWeeklyRecordRepository;
    private final EvangelismEditRequestRepository evangelismEditRequestRepository;
    private final SystemConfigRepository systemConfigRepository;
    private final ObjectMapper objectMapper;

    private ResponseEntity<Map<String, Object>> encryptResponse(Object data) {
        Map<String, Object> response = new HashMap<>();
        try {
            String json = objectMapper.writeValueAsString(data);
            String encrypted = com.overseas.portal.security.EncryptionUtil.encrypt(json);
            response.put("encryptedData", encrypted);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("error", "Encryption failed: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    @GetMapping("/records")
    public ResponseEntity<Map<String, Object>> getRecords(
            @RequestParam(name = "church", required = false) String church,
            @RequestParam(name = "year", required = false) String year,
            @RequestParam(name = "week", required = false) String week) {

        if (church != null && year != null && week != null) {
            return encryptResponse(evangelismWeeklyRecordRepository.findByChurchNameAndYearStrAndWeekKey(church, year, week));
        }
        if (church != null && year != null) {
            return encryptResponse(evangelismWeeklyRecordRepository.findByChurchNameAndYearStr(church, year));
        }
        if (year != null && week != null) {
            return encryptResponse(evangelismWeeklyRecordRepository.findByYearStrAndWeekKey(year, week));
        }
        if (year != null) {
            return encryptResponse(evangelismWeeklyRecordRepository.findByYearStr(year));
        }
        return encryptResponse(evangelismWeeklyRecordRepository.findAll());
    }

    @GetMapping("/config/monthly-report-notice")
    public ResponseEntity<Map<String, Object>> getMonthlyReportNotice() {
        String value = systemConfigRepository.findByConfigKey("DESC_EVANGELISM_MONTHLY_REPORT_NOTICE")
                .map(config -> config.getConfigValue())
                .orElse("");
        Map<String, Object> result = new HashMap<>();
        result.put("value", value);
        return encryptResponse(result);
    }

    @GetMapping("/config/items")
    public ResponseEntity<Map<String, Object>> getItemsConfig() {
        try {
            String configVal = systemConfigRepository.findByConfigKey("evangelism_items_by_country")
                    .map(config -> config.getConfigValue())
                    .orElse("{\"default\":[{\"key\":\"find\",\"label\":\"찾\",\"color\":\"#2563eb\",\"isDrop\":false,\"groupName\":\"찾기 상세분석\",\"groupDesc\":\"주차별 찾기와 탈락수를 볼 수 있습니다.\"},{\"key\":\"findDrop\",\"label\":\"탈\",\"color\":\"#dc2626\",\"isDrop\":true,\"groupName\":\"찾기 상세분석\"},{\"key\":\"gospel\",\"label\":\"복\",\"color\":\"#7c3aed\",\"isDrop\":false,\"groupName\":\"복음방 상세분석\",\"groupDesc\":\"주차별 복음방과 탈락수를 볼 수 있습니다.\"},{\"key\":\"gospelDrop\",\"label\":\"탈\",\"color\":\"#dc2626\",\"isDrop\":true,\"groupName\":\"복음방 상세분석\"},{\"key\":\"admit\",\"label\":\"개\",\"color\":\"#16a34a\",\"isDrop\":false,\"groupName\":\"가개강 상세분석\",\"groupDesc\":\"주차별 가개강(등록)과 탈락수를 볼 수 있습니다.\"},{\"key\":\"admitDrop\",\"label\":\"탈\",\"color\":\"#dc2626\",\"isDrop\":true,\"groupName\":\"가개강 상세분석\"}]}");

            Object parsed = objectMapper.readValue(configVal, Object.class);
            return encryptResponse(parsed);
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(500).body(err);
        }
    }

    @PostMapping("/config/items")
    @Transactional
    public ResponseEntity<Map<String, Object>> saveItemsConfig(@RequestBody Map<String, Object> newConfig) {
        log.info("Saving new evangelism items configuration...");
        try {
            String json = objectMapper.writeValueAsString(newConfig);
            SystemConfig config = systemConfigRepository.findByConfigKey("evangelism_items_by_country")
                    .orElseGet(() -> SystemConfig.builder()
                            .configKey("evangelism_items_by_country")
                            .description("국가별 전도 실적 가변 항목 설정 (JSON)")
                            .build());
            config.setConfigValue(json);
            systemConfigRepository.save(config);
            return encryptResponse(newConfig);
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(500).body(err);
        }
    }

    @PostMapping("/records")
    @Transactional
    public ResponseEntity<Map<String, Object>> saveRecords(@RequestBody List<EvangelismWeeklyRecord> records) {
        log.info("Batch saving/updating {} evangelism weekly records into PostgreSQL DB...", records.size());
        for (EvangelismWeeklyRecord r : records) {
            List<EvangelismWeeklyRecord> existing = evangelismWeeklyRecordRepository.findByChurchNameAndYearStrAndWeekKey(
                    r.getChurchName(), r.getYearStr(), r.getWeekKey()
            );
            EvangelismWeeklyRecord target = existing.stream()
                    .filter(e -> e.getDepartment().equals(r.getDepartment()))
                    .findFirst()
                    .orElse(r);

            // Preserve existing regCount (calculated from Membership) unless r.getRegCount() has a valid non-zero value
            if (target.getRecordId() != null && target.getRegCount() != null && target.getRegCount() > 0) {
                if (r.getRegCount() != null && r.getRegCount() > 0) {
                    target.setRegCount(r.getRegCount());
                }
            } else {
                target.setRegCount(r.getRegCount() != null ? r.getRegCount() : 0);
            }
            target.setFindCount(r.getFindCount() != null ? r.getFindCount() : 0);
            target.setFindDropCount(r.getFindDropCount() != null ? r.getFindDropCount() : 0);
            target.setGospelCount(r.getGospelCount() != null ? r.getGospelCount() : 0);
            target.setGospelDropCount(r.getGospelDropCount() != null ? r.getGospelDropCount() : 0);
            target.setAdmitCount(r.getAdmitCount() != null ? r.getAdmitCount() : 0);
            target.setAdmitDropCount(r.getAdmitDropCount() != null ? r.getAdmitDropCount() : 0);
            target.setDynamicData(r.getDynamicData());
            target.setUpdatedBy(r.getUpdatedBy() != null ? r.getUpdatedBy() : "system");

            evangelismWeeklyRecordRepository.save(target);
        }

        // Mark any approved request for this church, year, and week as USED
        if (!records.isEmpty()) {
            EvangelismWeeklyRecord first = records.get(0);
            List<EvangelismEditRequest> approved = evangelismEditRequestRepository
                    .findByChurchNameAndYearStrAndWeekKeyAndStatus(first.getChurchName(), first.getYearStr(), first.getWeekKey(), "APPROVED");
            for (EvangelismEditRequest req : approved) {
                req.setStatus("USED");
                evangelismEditRequestRepository.save(req);
            }
        }

        return encryptResponse(records);
    }

    @PostMapping("/edit-requests")
    public ResponseEntity<Map<String, Object>> createEditRequest(@RequestBody EvangelismEditRequest request) {
        log.info("Creating edit request for church: {}, week: {}, by: {}", request.getChurchName(), request.getWeekKey(), request.getRequestedBy());
        request.setStatus("PENDING");
        request.setRequestedAt(ZonedDateTime.now());
        EvangelismEditRequest saved = evangelismEditRequestRepository.save(request);
        return encryptResponse(saved);
    }

    private boolean isAdminRequest() {
        org.springframework.security.core.Authentication auth =
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().contains("ADMIN"));
    }

    @GetMapping("/edit-requests/pending")
    public ResponseEntity<Map<String, Object>> getPendingRequests(
            @RequestParam(name = "username", required = false) String username,
            @RequestParam(name = "name", required = false) String name) {
        log.info("Fetching pending edit requests for name: {}", name);
        List<EvangelismEditRequest> list;
        if (isAdminRequest()) {
            list = evangelismEditRequestRepository.findByStatus("PENDING");
        } else {
            list = evangelismEditRequestRepository.findByRequestedToAndStatus(name != null ? name : "", "PENDING");
        }
        return encryptResponse(list);
    }

    @GetMapping("/edit-requests/completed")
    public ResponseEntity<Map<String, Object>> getCompletedRequests(
            @RequestParam(name = "username", required = false) String username,
            @RequestParam(name = "name", required = false) String name) {
        log.info("Fetching completed edit requests for name: {}", name);
        List<EvangelismEditRequest> list;
        List<String> completedStatuses = List.of("APPROVED", "REJECTED", "USED");
        if (isAdminRequest()) {
            list = evangelismEditRequestRepository.findByStatusIn(completedStatuses);
        } else {
            list = evangelismEditRequestRepository.findByRequestedToAndStatusIn(name != null ? name : "", completedStatuses);
        }
        return encryptResponse(list);
    }

    @PostMapping("/edit-requests/{id}/approve")
    public ResponseEntity<Map<String, Object>> approveRequest(
            @PathVariable(name = "id") Long id,
            @RequestParam(name = "comment", required = false) String comment) {
        log.info("Approving edit request ID: {}, comment: {}", id, comment);
        return evangelismEditRequestRepository.findById(id).map(req -> {
            req.setStatus("APPROVED");
            req.setApprovedAt(ZonedDateTime.now());
            req.setApproverComment(comment);
            evangelismEditRequestRepository.save(req);
            return encryptResponse(req);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/edit-requests/{id}/reject")
    public ResponseEntity<Map<String, Object>> rejectRequest(
            @PathVariable(name = "id") Long id,
            @RequestParam(name = "comment", required = false) String comment) {
        log.info("Rejecting edit request ID: {}, comment: {}", id, comment);
        return evangelismEditRequestRepository.findById(id).map(req -> {
            req.setStatus("REJECTED");
            req.setApproverComment(comment);
            evangelismEditRequestRepository.save(req);
            return encryptResponse(req);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/edit-requests/check")
    public ResponseEntity<Map<String, Object>> checkApprovedRequest(
            @RequestParam(name = "church") String church,
            @RequestParam(name = "year") String year,
            @RequestParam(name = "week") String week) {
        List<EvangelismEditRequest> approved = evangelismEditRequestRepository
                .findByChurchNameAndYearStrAndWeekKeyAndStatus(church, year, week, "APPROVED");
        boolean hasAccess = !approved.isEmpty();
        Map<String, Object> result = new HashMap<>();
        result.put("hasAccess", hasAccess);
        return encryptResponse(result);
    }

    // =========================================================================
    // 사용자별 그래프 대시보드 설정 (GET / POST)
    // =========================================================================
    @GetMapping("/chart-config")
    public ResponseEntity<Map<String, Object>> getChartConfig(
            @RequestParam(name = "username") String username) {
        String key = "evangelism_chart_configs_" + username;
        String configVal = systemConfigRepository.findByConfigKey(key)
                .map(SystemConfig::getConfigValue)
                .orElse("[]");
        try {
            Object parsed = objectMapper.readValue(configVal, Object.class);
            return encryptResponse(parsed);
        } catch (Exception e) {
            return encryptResponse(java.util.Collections.emptyList());
        }
    }

    @PostMapping("/chart-config")
    @Transactional
    public ResponseEntity<Map<String, Object>> saveChartConfig(
            @RequestParam(name = "username") String username,
            @RequestBody Object chartConfigs) {
        String key = "evangelism_chart_configs_" + username;
        try {
            String json = objectMapper.writeValueAsString(chartConfigs);
            SystemConfig config = systemConfigRepository.findByConfigKey(key)
                    .orElseGet(() -> SystemConfig.builder()
                            .configKey(key)
                            .description("사용자 " + username + " 전도 그래프 대시보드 설정 (JSON)")
                            .build());
            config.setConfigValue(json);
            systemConfigRepository.save(config);
            return encryptResponse(chartConfigs);
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(500).body(err);
        }
    }

    @PostMapping("/edit-requests/use")
    public ResponseEntity<Map<String, Object>> useRequest(
            @RequestParam(name = "church") String church,
            @RequestParam(name = "year") String year,
            @RequestParam(name = "week") String week) {
        log.info("Marking approved edit requests as USED for church: {}, week: {}", church, week);
        List<EvangelismEditRequest> approved = evangelismEditRequestRepository
                .findByChurchNameAndYearStrAndWeekKeyAndStatus(church, year, week, "APPROVED");
        for (EvangelismEditRequest req : approved) {
            req.setStatus("USED");
            evangelismEditRequestRepository.save(req);
        }
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        return encryptResponse(result);
    }
}
