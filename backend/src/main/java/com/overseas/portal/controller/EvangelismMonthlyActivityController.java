package com.overseas.portal.controller;

import com.overseas.portal.domain.EvangelismMonthlyActivity;
import com.overseas.portal.domain.EvangelismMonthlyActivityEditRequest;
import com.overseas.portal.repository.EvangelismMonthlyActivityRepository;
import com.overseas.portal.repository.EvangelismMonthlyActivityEditRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
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

    private final EvangelismMonthlyActivityRepository activityRepository;
    private final EvangelismMonthlyActivityEditRequestRepository editRequestRepository;
    private final ObjectMapper objectMapper;

    private boolean isAdminRequest() {
        org.springframework.security.core.Authentication auth =
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().contains("ADMIN"));
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
    public ResponseEntity<Map<String, Object>> createEditRequest(@RequestBody EvangelismMonthlyActivityEditRequest request) {
        log.info("Creating monthly-activity edit request for church: {}, month: {}, by: {}", request.getChurchName(), request.getMonthKey(), request.getRequestedBy());
        request.setStatus("PENDING");
        request.setRequestedAt(ZonedDateTime.now());
        EvangelismMonthlyActivityEditRequest saved = editRequestRepository.save(request);
        return encryptResponse(saved);
    }

    @GetMapping("/edit-requests/pending")
    public ResponseEntity<Map<String, Object>> getPendingRequests(@RequestParam(name = "name", required = false) String name) {
        List<EvangelismMonthlyActivityEditRequest> list = isAdminRequest()
                ? editRequestRepository.findByStatus("PENDING")
                : editRequestRepository.findByRequestedToAndStatus(name != null ? name : "", "PENDING");
        return encryptResponse(list);
    }

    @GetMapping("/edit-requests/completed")
    public ResponseEntity<Map<String, Object>> getCompletedRequests(@RequestParam(name = "name", required = false) String name) {
        List<String> completedStatuses = List.of("APPROVED", "REJECTED", "USED");
        List<EvangelismMonthlyActivityEditRequest> list = isAdminRequest()
                ? editRequestRepository.findByStatusIn(completedStatuses)
                : editRequestRepository.findByRequestedToAndStatusIn(name != null ? name : "", completedStatuses);
        return encryptResponse(list);
    }

    @PostMapping("/edit-requests/{id}/approve")
    public ResponseEntity<Map<String, Object>> approveRequest(
            @PathVariable(name = "id") Long id,
            @RequestParam(name = "comment", required = false) String comment) {
        return editRequestRepository.findById(id).map(r -> {
            r.setStatus("APPROVED");
            r.setApprovedAt(ZonedDateTime.now());
            r.setApproverComment(comment);
            editRequestRepository.save(r);
            return encryptResponse(r);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/edit-requests/{id}/reject")
    public ResponseEntity<Map<String, Object>> rejectRequest(
            @PathVariable(name = "id") Long id,
            @RequestParam(name = "comment", required = false) String comment) {
        return editRequestRepository.findById(id).map(r -> {
            r.setStatus("REJECTED");
            r.setApproverComment(comment);
            editRequestRepository.save(r);
            return encryptResponse(r);
        }).orElseGet(() -> ResponseEntity.notFound().build());
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
