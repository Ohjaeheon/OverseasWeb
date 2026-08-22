package com.overseas.portal.controller;

import com.overseas.portal.domain.EvangelismMonthlyActivity;
import com.overseas.portal.domain.EvangelismMonthlyActivityEditRequest;
import com.overseas.portal.domain.User;
import com.overseas.portal.domain.ApprovalInstance;
import com.overseas.portal.repository.EvangelismMonthlyActivityRepository;
import com.overseas.portal.repository.EvangelismMonthlyActivityEditRequestRepository;
import com.overseas.portal.repository.UserRepository;
import com.overseas.portal.service.ApprovalInstanceService;
import com.overseas.portal.service.ApprovalTelegramService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.ZonedDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/v1/evangelism/monthly-activity")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class EvangelismMonthlyActivityController {

    private static final String APPROVAL_TARGET_TYPE = "MONTHLY_ACTIVITY";

    private final EvangelismMonthlyActivityRepository activityRepository;
    private final EvangelismMonthlyActivityEditRequestRepository editRequestRepository;
    private final UserRepository userRepository;
    private final ApprovalInstanceService approvalInstanceService;
    private final ApprovalTelegramService approvalTelegramService;
    private final ObjectMapper objectMapper;

    private User currentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));
    }

    /** 결재 인스턴스 최신 상태를 EvangelismMonthlyActivityEditRequest의 기존 status/approverComment/requestedTo 필드에 반영 (기존 화면 호환용). */
    private void syncRequestWithInstance(EvangelismMonthlyActivityEditRequest req, ApprovalInstance instance) {
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
        editRequestRepository.save(req);
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

    private Map<String, Object> toMap(EvangelismMonthlyActivity a) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", a.getId());
        map.put("churchName", a.getChurchName());
        map.put("yearStr", a.getYearStr());
        map.put("monthKey", a.getMonthKey());
        map.put("department", a.getDepartment());
        map.put("activeMemberCount", a.getActiveMemberCount());
        map.put("teacherCount", a.getTeacherCount());
        map.put("updatedBy", a.getUpdatedBy());
        map.put("updatedAt", a.getUpdatedAt() != null ? a.getUpdatedAt().toString() : null);
        return map;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getYear(
            @RequestParam("church") String church,
            @RequestParam("year") String year) {
        List<Map<String, Object>> items = activityRepository.findByChurchNameAndYearStr(church, year)
                .stream().map(this::toMap).collect(Collectors.toList());
        return encryptResponse(items);
    }

    @lombok.Data
    public static class ItemPayload {
        private String department;
        private Integer activeMemberCount;
        private Integer teacherCount;
    }

    @lombok.Data
    public static class SaveRequest {
        private String church;
        private String yearStr;
        private String monthKey;
        private List<ItemPayload> items;
        private String updatedBy;
    }

    @PostMapping("/save")
    @Transactional
    public ResponseEntity<Map<String, Object>> save(@RequestBody SaveRequest req) {
        List<EvangelismMonthlyActivity> existing = activityRepository.findByChurchNameAndYearStr(req.getChurch(), req.getYearStr());

        List<ItemPayload> items = req.getItems() != null ? req.getItems() : Collections.emptyList();
        for (ItemPayload p : items) {
            EvangelismMonthlyActivity target = existing.stream()
                    .filter(a -> req.getMonthKey().equals(a.getMonthKey()) && p.getDepartment().equals(a.getDepartment()))
                    .findFirst()
                    .orElseGet(() -> EvangelismMonthlyActivity.builder()
                            .churchName(req.getChurch())
                            .yearStr(req.getYearStr())
                            .monthKey(req.getMonthKey())
                            .department(p.getDepartment())
                            .build());
            target.setActiveMemberCount(p.getActiveMemberCount());
            target.setTeacherCount(p.getTeacherCount());
            target.setUpdatedBy(req.getUpdatedBy() != null ? req.getUpdatedBy() : "system");
            activityRepository.save(target);
        }

        // 이 교회·연도·월에 대해 승인된 수정 요청이 있으면 사용 완료(USED)로 전환
        List<EvangelismMonthlyActivityEditRequest> approved = editRequestRepository
                .findByChurchNameAndYearStrAndMonthKeyAndStatus(req.getChurch(), req.getYearStr(), req.getMonthKey(), "APPROVED");
        for (EvangelismMonthlyActivityEditRequest r : approved) {
            r.setStatus("USED");
            editRequestRepository.save(r);
        }

        List<Map<String, Object>> refreshed = activityRepository.findByChurchNameAndYearStr(req.getChurch(), req.getYearStr())
                .stream().map(this::toMap).collect(Collectors.toList());
        return encryptResponse(refreshed);
    }

    @PostMapping("/edit-requests")
    @Transactional
    public ResponseEntity<Map<String, Object>> createEditRequest(@RequestBody EvangelismMonthlyActivityEditRequest request) {
        log.info("Creating monthly-activity edit request for church: {}, month: {}, by: {}", request.getChurchName(), request.getMonthKey(), request.getRequestedBy());
        request.setStatus("PENDING");
        request.setRequestedAt(ZonedDateTime.now());
        request.setRequestedTo(""); // 결재라인 인스턴스 생성 후 아래에서 실제 대상으로 채워짐
        EvangelismMonthlyActivityEditRequest saved = editRequestRepository.save(request);

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
        return encryptResponse(editRequestRepository.findAllById(targetIds));
    }

    @GetMapping("/edit-requests/completed")
    public ResponseEntity<Map<String, Object>> getCompletedRequests() {
        List<String> completedStatuses = List.of("APPROVED", "REJECTED", "USED");
        User me = currentUser();
        List<Long> targetIds = approvalInstanceService.getParticipatedTargetIds(APPROVAL_TARGET_TYPE, me.getUserId(), List.of("APPROVED", "REJECTED"));
        List<EvangelismMonthlyActivityEditRequest> list = editRequestRepository.findAllById(targetIds).stream()
                .filter(r -> completedStatuses.contains(r.getStatus()))
                .toList();
        return encryptResponse(list);
    }

    /** 결재 상신 내역 - 내가(신청자로서) 올린 요청 전체(진행 상태 무관). */
    @GetMapping("/edit-requests/submitted")
    public ResponseEntity<Map<String, Object>> getSubmittedRequests() {
        return encryptResponse(editRequestRepository.findByRequestedByOrderByRequestedAtDesc(currentUser().getUsername()));
    }

    @PostMapping("/edit-requests/{id}/approve")
    public ResponseEntity<Map<String, Object>> approveRequest(
            @PathVariable(name = "id") Long id,
            @RequestParam(name = "comment", required = false) String comment) {
        return decideRequest(id, true, comment);
    }

    @PostMapping("/edit-requests/{id}/reject")
    public ResponseEntity<Map<String, Object>> rejectRequest(
            @PathVariable(name = "id") Long id,
            @RequestParam(name = "comment", required = false) String comment) {
        return decideRequest(id, false, comment);
    }

    private ResponseEntity<Map<String, Object>> decideRequest(Long id, boolean approve, String comment) {
        EvangelismMonthlyActivityEditRequest req = editRequestRepository.findById(id).orElse(null);
        if (req == null) {
            return ResponseEntity.notFound().build();
        }

        // 이 결재 건에 결재 인스턴스가 없으면(결재라인 연동 이전에 이미 대기 중이던 레거시 요청) 예전 방식(1차 결재로 즉시 종료)으로 처리한다.
        if (approvalInstanceService.findInstance(APPROVAL_TARGET_TYPE, id).isEmpty()) {
            req.setStatus(approve ? "APPROVED" : "REJECTED");
            if (approve) req.setApprovedAt(ZonedDateTime.now());
            req.setApproverComment(comment);
            editRequestRepository.save(req);
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

    @GetMapping("/edit-requests/check")
    public ResponseEntity<Map<String, Object>> checkApprovedRequest(
            @RequestParam(name = "church") String church,
            @RequestParam(name = "year") String year,
            @RequestParam(name = "month") String month) {
        List<EvangelismMonthlyActivityEditRequest> approved = editRequestRepository
                .findByChurchNameAndYearStrAndMonthKeyAndStatus(church, year, month, "APPROVED");
        Map<String, Object> result = new HashMap<>();
        result.put("hasAccess", !approved.isEmpty());
        return encryptResponse(result);
    }
}
