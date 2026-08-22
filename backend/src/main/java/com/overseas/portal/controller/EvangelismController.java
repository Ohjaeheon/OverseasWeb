package com.overseas.portal.controller;

import com.overseas.portal.domain.EvangelismWeeklyRecord;
import com.overseas.portal.domain.EvangelismEditRequest;
import com.overseas.portal.domain.SystemConfig;
import com.overseas.portal.domain.User;
import com.overseas.portal.domain.ApprovalInstance;
import com.overseas.portal.dto.ApprovalInstanceDto;
import com.overseas.portal.repository.EvangelismWeeklyRecordRepository;
import com.overseas.portal.repository.EvangelismEditRequestRepository;
import com.overseas.portal.repository.SystemConfigRepository;
import com.overseas.portal.repository.UserRepository;
import com.overseas.portal.service.ApprovalInstanceService;
import com.overseas.portal.service.ApprovalLineService;
import com.overseas.portal.service.ApprovalTelegramService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
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

    private static final String APPROVAL_TARGET_TYPE = "EVANGELISM";

    private final EvangelismWeeklyRecordRepository evangelismWeeklyRecordRepository;
    private final EvangelismEditRequestRepository evangelismEditRequestRepository;
    private final SystemConfigRepository systemConfigRepository;
    private final UserRepository userRepository;
    private final ApprovalInstanceService approvalInstanceService;
    private final ApprovalLineService approvalLineService;
    private final ApprovalTelegramService approvalTelegramService;
    private final ObjectMapper objectMapper;

    private User currentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));
    }

    /** 결재 인스턴스 최신 상태를 EvangelismEditRequest의 기존 status/approverComment/requestedTo 필드에 반영 (기존 화면 호환용). */
    private void syncRequestWithInstance(EvangelismEditRequest req, ApprovalInstance instance) {
        if ("APPROVED".equals(instance.getStatus())) {
            req.setStatus("APPROVED");
            req.setApprovedAt(instance.getCompletedAt());
        } else if ("REJECTED".equals(instance.getStatus())) {
            req.setStatus("REJECTED");
        }
        String latestComment = approvalInstanceService.getLatestComment(instance.getId());
        if (latestComment != null) {
            req.setApproverComment(latestComment);
        }
        req.setRequestedTo(approvalInstanceService.describeCurrentState(instance));
        evangelismEditRequestRepository.save(req);
    }

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

    /** 전도재적(고정값) 계산 기준 시점 — 기본값: 전년도(offsetYears=-1) 12월(month=12).
     * 관리자가 시스템 설정에서 변경할 수 있으며(PUT /api/v1/admin/configs), 이 엔드포인트는
     * 진단서 화면을 보는 모든 사용자가 읽을 수 있어야 하므로 admin 경로가 아닌 여기 둔다. */
    @GetMapping("/config/reg-baseline")
    public ResponseEntity<Map<String, Object>> getRegBaseline() {
        int offsetYears = systemConfigRepository.findByConfigKey("evang_reg_baseline_offset_years")
                .map(c -> parseIntOr(c.getConfigValue(), -1)).orElse(-1);
        int month = systemConfigRepository.findByConfigKey("evang_reg_baseline_month")
                .map(c -> parseIntOr(c.getConfigValue(), 12)).orElse(12);
        Map<String, Object> result = new HashMap<>();
        result.put("offsetYears", offsetYears);
        result.put("month", Math.min(12, Math.max(1, month)));
        return encryptResponse(result);
    }

    private int parseIntOr(String value, int fallback) {
        try {
            return Integer.parseInt(value.trim());
        } catch (Exception e) {
            return fallback;
        }
    }

    /** 전도 커스텀 그래프 대시보드에 사용자가 추가할 수 있는 최대 그래프 개수 — 기본값 10.
     * 관리자가 시스템 설정(/adminsetting/settings)에서 변경할 수 있으며, 이 엔드포인트는
     * 전도 화면을 보는 모든 사용자가 읽을 수 있어야 하므로 admin 경로가 아닌 여기 둔다. */
    @GetMapping("/config/chart-max-count")
    public ResponseEntity<Map<String, Object>> getChartMaxCount() {
        int maxCount = systemConfigRepository.findByConfigKey("evangelism_chart_max_count")
                .map(c -> parseIntOr(c.getConfigValue(), 10)).orElse(10);
        Map<String, Object> result = new HashMap<>();
        result.put("maxCount", Math.max(1, maxCount));
        return encryptResponse(result);
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
    @Transactional
    public ResponseEntity<Map<String, Object>> createEditRequest(@RequestBody EvangelismEditRequest request) {
        log.info("Creating edit request for church: {}, week: {}, by: {}", request.getChurchName(), request.getWeekKey(), request.getRequestedBy());
        request.setStatus("PENDING");
        request.setRequestedAt(ZonedDateTime.now());
        request.setRequestedTo(""); // 결재라인 인스턴스 생성 후 아래에서 실제 대상으로 채워짐
        EvangelismEditRequest saved = evangelismEditRequestRepository.save(request);

        try {
            ApprovalInstance instance = approvalInstanceService.createInstanceForRequest(APPROVAL_TARGET_TYPE, saved.getRequestId(), currentUser());
            syncRequestWithInstance(saved, instance);
            approvalTelegramService.notifyAfterStateChange(APPROVAL_TARGET_TYPE, saved.getRequestId());
        } catch (IllegalStateException e) {
            // 결재라인 미구성 등으로 결재 인스턴스를 만들 수 없으면 신청 자체를 취소한다 (방금 저장한 요청 행도 함께 롤백)
            org.springframework.transaction.interceptor.TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }

        return encryptResponse(saved);
    }

    @GetMapping("/edit-requests/pending")
    public ResponseEntity<Map<String, Object>> getPendingRequests() {
        User me = currentUser();
        List<Long> targetIds = approvalInstanceService.getPendingTargetIdsForApprover(APPROVAL_TARGET_TYPE, me.getUserId());
        return encryptResponse(evangelismEditRequestRepository.findAllById(targetIds));
    }

    @GetMapping("/edit-requests/completed")
    public ResponseEntity<Map<String, Object>> getCompletedRequests() {
        List<String> completedStatuses = List.of("APPROVED", "REJECTED", "USED");
        User me = currentUser();
        List<Long> targetIds = approvalInstanceService.getParticipatedTargetIds(APPROVAL_TARGET_TYPE, me.getUserId(), List.of("APPROVED", "REJECTED"));
        List<EvangelismEditRequest> list = evangelismEditRequestRepository.findAllById(targetIds).stream()
                .filter(r -> completedStatuses.contains(r.getStatus()))
                .toList();
        return encryptResponse(list);
    }

    /** 결재 상신 내역 - 내가(신청자로서) 올린 요청 전체(진행 상태 무관). */
    @GetMapping("/edit-requests/submitted")
    public ResponseEntity<Map<String, Object>> getSubmittedRequests() {
        return encryptResponse(evangelismEditRequestRepository.findByRequestedByOrderByRequestedAtDesc(currentUser().getUsername()));
    }

    @PostMapping("/edit-requests/{id}/approve")
    public ResponseEntity<Map<String, Object>> approveRequest(
            @PathVariable(name = "id") Long id,
            @RequestParam(name = "comment", required = false) String comment) {
        log.info("Approving edit request ID: {}, comment: {}", id, comment);
        return decideRequest(id, true, comment);
    }

    @PostMapping("/edit-requests/{id}/reject")
    public ResponseEntity<Map<String, Object>> rejectRequest(
            @PathVariable(name = "id") Long id,
            @RequestParam(name = "comment", required = false) String comment) {
        log.info("Rejecting edit request ID: {}, comment: {}", id, comment);
        return decideRequest(id, false, comment);
    }

    private ResponseEntity<Map<String, Object>> decideRequest(Long id, boolean approve, String comment) {
        EvangelismEditRequest req = evangelismEditRequestRepository.findById(id).orElse(null);
        if (req == null) {
            return ResponseEntity.notFound().build();
        }

        // 이 결재 건에 결재 인스턴스가 없으면(결재라인 연동 이전에 이미 대기 중이던 레거시 요청) 예전 방식(1차 결재로 즉시 종료)으로 처리한다.
        if (approvalInstanceService.findInstance(APPROVAL_TARGET_TYPE, id).isEmpty()) {
            req.setStatus(approve ? "APPROVED" : "REJECTED");
            if (approve) req.setApprovedAt(ZonedDateTime.now());
            req.setApproverComment(comment);
            evangelismEditRequestRepository.save(req);
            return encryptResponse(req);
        }

        try {
            ApprovalInstance instance = approvalInstanceService.decide(APPROVAL_TARGET_TYPE, id, currentUser().getUserId(), approve, comment);
            syncRequestWithInstance(req, instance);
            approvalTelegramService.notifyAfterStateChange(APPROVAL_TARGET_TYPE, id);
            return encryptResponse(req);
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/edit-requests/{id}/approval-progress")
    public ResponseEntity<Map<String, Object>> getApprovalProgress(@PathVariable(name = "id") Long id) {
        return approvalInstanceService.getInstanceDto(APPROVAL_TARGET_TYPE, id)
                .map(this::encryptResponse)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** 신청 전 미리보기 - 현재 로그인한 사용자 기준으로 실제 적용될 결재라인/결재자를 신청 없이 확인 (수정 요청 모달용). */
    @GetMapping("/edit-requests/approval-preview")
    public ResponseEntity<Map<String, Object>> getApprovalPreview() {
        try {
            return encryptResponse(approvalLineService.previewForRequester(APPROVAL_TARGET_TYPE, currentUser().getUserId()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
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
