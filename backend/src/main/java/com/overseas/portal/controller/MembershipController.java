package com.overseas.portal.controller;

import com.overseas.portal.domain.MembershipMonthlyRecord;
import com.overseas.portal.domain.MembershipEditRequest;
import com.overseas.portal.domain.EvangelismWeeklyRecord;
import com.overseas.portal.domain.User;
import com.overseas.portal.domain.ApprovalInstance;
import com.overseas.portal.repository.MembershipMonthlyRecordRepository;
import com.overseas.portal.repository.MembershipEditRequestRepository;
import com.overseas.portal.repository.EvangelismWeeklyRecordRepository;
import com.overseas.portal.repository.UserRepository;
import com.overseas.portal.service.ApprovalInstanceService;
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
import java.util.Optional;
import com.fasterxml.jackson.databind.ObjectMapper;

@Slf4j
@RestController
@RequestMapping("/api/v1/membership")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class MembershipController {

    private static final String APPROVAL_TARGET_TYPE = "MEMBERSHIP";

    private final MembershipMonthlyRecordRepository membershipMonthlyRecordRepository;
    private final MembershipEditRequestRepository membershipEditRequestRepository;
    private final EvangelismWeeklyRecordRepository evangelismWeeklyRecordRepository;
    private final UserRepository userRepository;
    private final ApprovalInstanceService approvalInstanceService;
    private final ApprovalTelegramService approvalTelegramService;
    private final ObjectMapper objectMapper;

    private User currentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));
    }

    /** 결재 인스턴스 최신 상태를 MembershipEditRequest의 기존 status/approverComment/requestedTo 필드에 반영 (기존 화면 호환용). */
    private void syncRequestWithInstance(MembershipEditRequest req, ApprovalInstance instance) {
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
        membershipEditRequestRepository.save(req);
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
            @RequestParam(name = "month", required = false) String month) {

        if (church != null) {
            recalculateSubsequentMonths(church, year != null ? year : "2026년", "0월");
        }

        if (church != null && year != null && month != null) {
            return encryptResponse(membershipMonthlyRecordRepository.findByChurchNameAndYearStrAndMonthKey(church, year, month));
        }
        if (church != null && year != null) {
            return encryptResponse(membershipMonthlyRecordRepository.findByChurchNameAndYearStr(church, year));
        }
        if (year != null && month != null) {
            return encryptResponse(membershipMonthlyRecordRepository.findByYearStrAndMonthKey(year, month));
        }
        if (year != null) {
            return encryptResponse(membershipMonthlyRecordRepository.findByYearStr(year));
        }
        return encryptResponse(membershipMonthlyRecordRepository.findAll());
    }

    @DeleteMapping("/records/clear-all-danger-zone")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<Map<String, String>> clearAllRecords() {
        log.warn("DANGER ZONE: Deleting all membership records and edit requests!");
        membershipMonthlyRecordRepository.deleteAll();
        membershipEditRequestRepository.deleteAll();
        Map<String, String> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "All monthly records and edit requests have been deleted from DB.");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/records")
    @Transactional
    public ResponseEntity<Map<String, Object>> saveRecords(@RequestBody List<MembershipMonthlyRecord> records) {
        log.info("Batch saving/updating {} membership monthly records into PostgreSQL DB...", records.size());
        if (records.isEmpty()) {
            return encryptResponse(records);
        }

        String churchName = records.get(0).getChurchName();
        String yearStr = records.get(0).getYearStr();
        String monthKey = records.get(0).getMonthKey();

        for (MembershipMonthlyRecord r : records) {
            List<MembershipMonthlyRecord> existing = membershipMonthlyRecordRepository.findByChurchNameAndYearStrAndMonthKey(
                    r.getChurchName(), r.getYearStr(), r.getMonthKey()
            );
            MembershipMonthlyRecord target = existing.stream()
                    .filter(e -> e.getDepartment().equals(r.getDepartment()))
                    .findFirst()
                    .orElse(r);

            target.setAssemblyAdmit(r.getAssemblyAdmit());
            target.setAssemblyAccident(r.getAssemblyAccident());
            target.setEvangIncrease(r.getEvangIncrease());
            target.setEvangDecrease(r.getEvangDecrease());
            target.setAttendIncrease(r.getAttendIncrease());
            target.setAttendDecrease(r.getAttendDecrease());
            target.setUpdatedBy(r.getUpdatedBy() != null ? r.getUpdatedBy() : "system");

            // Calculate current month's cumulative registries (Assembly/Current, Evangelism, Attendance)
            Map<String, Integer> prevRegs = getPreviousMonthRegs(r.getChurchName(), r.getYearStr(), r.getMonthKey(), r.getDepartment());
            int prevAssembly = prevRegs.getOrDefault("assembly", 0);
            int prevEvang = prevRegs.getOrDefault("evang", 0);
            int prevAttend = prevRegs.getOrDefault("attend", 0);

            int newAssemblyReg = Math.max(0, prevAssembly + (r.getAssemblyAdmit() != null ? r.getAssemblyAdmit() : 0) - (r.getAssemblyAccident() != null ? r.getAssemblyAccident() : 0));
            int newEvangReg = Math.max(0, prevEvang + (r.getEvangIncrease() != null ? r.getEvangIncrease() : 0) - (r.getEvangDecrease() != null ? r.getEvangDecrease() : 0));
            int newAttendReg = Math.max(0, prevAttend + (r.getAttendIncrease() != null ? r.getAttendIncrease() : 0) - (r.getAttendDecrease() != null ? r.getAttendDecrease() : 0));

            target.setCalculatedAssemblyReg(newAssemblyReg);
            target.setCalculatedEvangReg(newEvangReg);
            target.setCalculatedAttendReg(newAttendReg);

            membershipMonthlyRecordRepository.save(target);

            // Synchronize with weekly evangelism records of this month (e.g. 7월 -> 7월1주차, 7월2주차 get 6월's prevEvang)
            syncWithWeeklyEvangelismRecords(r.getChurchName(), r.getYearStr(), r.getMonthKey(), r.getDepartment(), prevEvang);
        }

        // Cascade recalculate subsequent months for this church
        recalculateSubsequentMonths(churchName, yearStr, monthKey);

        // Mark any approved request for this church, year, and month as USED
        List<MembershipEditRequest> approved = membershipEditRequestRepository
                .findByChurchNameAndYearStrAndMonthKeyAndStatus(churchName, yearStr, monthKey, "APPROVED");
        for (MembershipEditRequest req : approved) {
            req.setStatus("USED");
            membershipEditRequestRepository.save(req);
        }

        return encryptResponse(records);
    }

    private Map<String, Integer> getPreviousMonthRegs(String churchName, String yearStr, String monthKey, String department) {
        Map<String, Integer> res = new HashMap<>();
        try {
            int currentMonth = Integer.parseInt(monthKey.replace("월", ""));
            String prevMonthKey;
            String prevYearStr = yearStr;
            if (currentMonth == 1) {
                prevMonthKey = "12월";
                int currentYear = Integer.parseInt(yearStr.replace("년", ""));
                prevYearStr = (currentYear - 1) + "년";
            } else {
                prevMonthKey = (currentMonth - 1) + "월";
            }

            List<MembershipMonthlyRecord> prevRecords = membershipMonthlyRecordRepository
                    .findByChurchNameAndYearStrAndMonthKey(churchName, prevYearStr, prevMonthKey);
            Optional<MembershipMonthlyRecord> match = prevRecords.stream()
                    .filter(r -> r.getDepartment().equals(department))
                    .findFirst();

            if (match.isPresent()) {
                MembershipMonthlyRecord pm = match.get();
                res.put("assembly", pm.getCalculatedAssemblyReg() != null ? pm.getCalculatedAssemblyReg() : 0);
                res.put("evang", pm.getCalculatedEvangReg() != null ? pm.getCalculatedEvangReg() : 0);
                res.put("attend", pm.getCalculatedAttendReg() != null ? pm.getCalculatedAttendReg() : 0);
            } else {
                res.put("assembly", 0);
                res.put("evang", 0);
                res.put("attend", 0);
            }
        } catch (Exception e) {
            res.put("assembly", 0);
            res.put("evang", 0);
            res.put("attend", 0);
        }
        return res;
    }

    private void recalculateSubsequentMonths(String churchName, String yearStr, String startMonthKey) {
        try {
            int startMonth = Integer.parseInt(startMonthKey.replace("월", ""));
            // Recalculate remaining months of current year
            for (int m = startMonth + 1; m <= 12; m++) {
                String mKey = m + "월";
                List<MembershipMonthlyRecord> mRecords = membershipMonthlyRecordRepository
                        .findByChurchNameAndYearStrAndMonthKey(churchName, yearStr, mKey);
                if (mRecords.isEmpty()) continue;

                for (MembershipMonthlyRecord r : mRecords) {
                    Map<String, Integer> prevRegs = getPreviousMonthRegs(churchName, yearStr, mKey, r.getDepartment());
                    int prevAssembly = prevRegs.getOrDefault("assembly", 0);
                    int prevEvang = prevRegs.getOrDefault("evang", 0);
                    int prevAttend = prevRegs.getOrDefault("attend", 0);

                    int newAssembly = Math.max(0, prevAssembly + (r.getAssemblyAdmit() != null ? r.getAssemblyAdmit() : 0) - (r.getAssemblyAccident() != null ? r.getAssemblyAccident() : 0));
                    int newEvang = Math.max(0, prevEvang + (r.getEvangIncrease() != null ? r.getEvangIncrease() : 0) - (r.getEvangDecrease() != null ? r.getEvangDecrease() : 0));
                    int newAttend = Math.max(0, prevAttend + (r.getAttendIncrease() != null ? r.getAttendIncrease() : 0) - (r.getAttendDecrease() != null ? r.getAttendDecrease() : 0));

                    r.setCalculatedAssemblyReg(newAssembly);
                    r.setCalculatedEvangReg(newEvang);
                    r.setCalculatedAttendReg(newAttend);
                    membershipMonthlyRecordRepository.save(r);

                    syncWithWeeklyEvangelismRecords(churchName, yearStr, mKey, r.getDepartment(), prevEvang);
                }
            }

            // Also check next year's 1월 if yearStr December was updated
            if (startMonth == 12) {
                int currentYear = Integer.parseInt(yearStr.replace("년", ""));
                String nextYearStr = (currentYear + 1) + "년";
                List<MembershipMonthlyRecord> nextJanRecords = membershipMonthlyRecordRepository
                        .findByChurchNameAndYearStrAndMonthKey(churchName, nextYearStr, "1월");
                if (!nextJanRecords.isEmpty()) {
                    recalculateSubsequentMonths(churchName, nextYearStr, "1월");
                }
            }
        } catch (Exception e) {
            log.error("Failed to recalculate subsequent months for church: {}", churchName, e);
        }
    }

    private void syncWithWeeklyEvangelismRecords(String churchName, String yearStr, String monthKey, String department, int newEvangReg) {
        try {
            List<EvangelismWeeklyRecord> weeklyRecs = evangelismWeeklyRecordRepository.findByChurchNameAndYearStr(churchName, yearStr);
            for (EvangelismWeeklyRecord w : weeklyRecs) {
                // E.g. monthKey = "7월", w.getWeekKey() = "7월3주차"
                if (w.getDepartment().equals(department) && w.getWeekKey().startsWith(monthKey)) {
                    w.setRegCount(newEvangReg);
                    evangelismWeeklyRecordRepository.save(w);
                    log.info("Synchronized evangelism weekly record [{} {} {}] regCount -> {}", churchName, w.getWeekKey(), department, newEvangReg);
                }
            }
        } catch (Exception e) {
            log.error("Failed to synchronize with weekly evangelism records", e);
        }
    }

    @PostMapping("/edit-requests")
    @Transactional
    public ResponseEntity<Map<String, Object>> createEditRequest(@RequestBody MembershipEditRequest request) {
        log.info("Creating membership edit request for church: {}, month: {}, by: {}", request.getChurchName(), request.getMonthKey(), request.getRequestedBy());
        request.setStatus("PENDING");
        request.setRequestedAt(ZonedDateTime.now());
        request.setRequestedTo(""); // 결재라인 인스턴스 생성 후 아래에서 실제 대상으로 채워짐
        MembershipEditRequest saved = membershipEditRequestRepository.save(request);

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
        return encryptResponse(membershipEditRequestRepository.findAllById(targetIds));
    }

    @GetMapping("/edit-requests/completed")
    public ResponseEntity<Map<String, Object>> getCompletedRequests() {
        List<String> completedStatuses = List.of("APPROVED", "REJECTED", "USED");
        User me = currentUser();
        List<Long> targetIds = approvalInstanceService.getParticipatedTargetIds(APPROVAL_TARGET_TYPE, me.getUserId(), List.of("APPROVED", "REJECTED"));
        List<MembershipEditRequest> list = membershipEditRequestRepository.findAllById(targetIds).stream()
                .filter(r -> completedStatuses.contains(r.getStatus()))
                .toList();
        return encryptResponse(list);
    }

    /** 결재 상신 내역 - 내가(신청자로서) 올린 요청 전체(진행 상태 무관). */
    @GetMapping("/edit-requests/submitted")
    public ResponseEntity<Map<String, Object>> getSubmittedRequests() {
        return encryptResponse(membershipEditRequestRepository.findByRequestedByOrderByRequestedAtDesc(currentUser().getUsername()));
    }

    @PostMapping("/edit-requests/{id}/approve")
    public ResponseEntity<Map<String, Object>> approveRequest(
            @PathVariable(name = "id") Long id,
            @RequestParam(name = "comment", required = false) String comment) {
        log.info("Approving membership edit request ID: {}, comment: {}", id, comment);
        return decideRequest(id, true, comment);
    }

    @PostMapping("/edit-requests/{id}/reject")
    public ResponseEntity<Map<String, Object>> rejectRequest(
            @PathVariable(name = "id") Long id,
            @RequestParam(name = "comment", required = false) String comment) {
        log.info("Rejecting membership edit request ID: {}, comment: {}", id, comment);
        return decideRequest(id, false, comment);
    }

    private ResponseEntity<Map<String, Object>> decideRequest(Long id, boolean approve, String comment) {
        MembershipEditRequest req = membershipEditRequestRepository.findById(id).orElse(null);
        if (req == null) {
            return ResponseEntity.notFound().build();
        }

        // 이 결재 건에 결재 인스턴스가 없으면(결재라인 연동 이전에 이미 대기 중이던 레거시 요청) 예전 방식(1차 결재로 즉시 종료)으로 처리한다.
        if (approvalInstanceService.findInstance(APPROVAL_TARGET_TYPE, id).isEmpty()) {
            req.setStatus(approve ? "APPROVED" : "REJECTED");
            if (approve) req.setApprovedAt(ZonedDateTime.now());
            req.setApproverComment(comment);
            membershipEditRequestRepository.save(req);
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
        List<MembershipEditRequest> approved = membershipEditRequestRepository
                .findByChurchNameAndYearStrAndMonthKeyAndStatus(church, year, month, "APPROVED");
        boolean hasAccess = !approved.isEmpty();
        Map<String, Object> result = new HashMap<>();
        result.put("hasAccess", hasAccess);
        return encryptResponse(result);
    }
}
