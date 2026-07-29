package com.overseas.portal.controller;

import com.overseas.portal.domain.MembershipMonthlyRecord;
import com.overseas.portal.domain.MembershipEditRequest;
import com.overseas.portal.domain.EvangelismWeeklyRecord;
import com.overseas.portal.repository.MembershipMonthlyRecordRepository;
import com.overseas.portal.repository.MembershipEditRequestRepository;
import com.overseas.portal.repository.EvangelismWeeklyRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

    private final MembershipMonthlyRecordRepository membershipMonthlyRecordRepository;
    private final MembershipEditRequestRepository membershipEditRequestRepository;
    private final EvangelismWeeklyRecordRepository evangelismWeeklyRecordRepository;
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
            @RequestParam(name = "year", required = false, defaultValue = "2026년") String year,
            @RequestParam(name = "month", required = false) String month) {

        if (church != null && month != null) {
            return encryptResponse(membershipMonthlyRecordRepository.findByChurchNameAndYearStrAndMonthKey(church, year, month));
        }
        if (church != null) {
            return encryptResponse(membershipMonthlyRecordRepository.findByChurchNameAndYearStr(church, year));
        }
        return encryptResponse(membershipMonthlyRecordRepository.findAll());
    }

    @DeleteMapping("/records/clear-all-danger-zone")
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
    public ResponseEntity<List<MembershipMonthlyRecord>> saveRecords(@RequestBody List<MembershipMonthlyRecord> records) {
        log.info("Batch saving/updating {} membership monthly records into PostgreSQL DB...", records.size());
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

            // Calculate the current month's evangReg count based on last month + increase - decrease
            int prevEvangReg = getPreviousMonthEvangReg(r.getChurchName(), r.getYearStr(), r.getMonthKey(), r.getDepartment());
            int newEvangReg = Math.max(0, prevEvangReg + (r.getEvangIncrease() != null ? r.getEvangIncrease() : 0) - (r.getEvangDecrease() != null ? r.getEvangDecrease() : 0));
            target.setCalculatedEvangReg(newEvangReg);

            membershipMonthlyRecordRepository.save(target);

            // Synchronize with weekly evangelism records of this month (e.g. 7월 -> 7월1주차, 7월2주차)
            syncWithWeeklyEvangelismRecords(r.getChurchName(), r.getYearStr(), r.getMonthKey(), r.getDepartment(), newEvangReg);
        }

        // Mark any approved request for this church, year, and month as USED
        if (!records.isEmpty()) {
            MembershipMonthlyRecord first = records.get(0);
            List<MembershipEditRequest> approved = membershipEditRequestRepository
                    .findByChurchNameAndYearStrAndMonthKeyAndStatus(first.getChurchName(), first.getYearStr(), first.getMonthKey(), "APPROVED");
            for (MembershipEditRequest req : approved) {
                req.setStatus("USED");
                membershipEditRequestRepository.save(req);
            }
        }

        return ResponseEntity.ok(records);
    }

    private int getPreviousMonthEvangReg(String churchName, String yearStr, String monthKey, String department) {
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
            return prevRecords.stream()
                    .filter(r -> r.getDepartment().equals(department))
                    .findFirst()
                    .map(r -> r.getCalculatedEvangReg() != null ? r.getCalculatedEvangReg() : 20)
                    .orElse(20);
        } catch (Exception e) {
            return 20;
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
    public ResponseEntity<Map<String, Object>> createEditRequest(@RequestBody MembershipEditRequest request) {
        log.info("Creating membership edit request for church: {}, month: {}, by: {}", request.getChurchName(), request.getMonthKey(), request.getRequestedBy());
        request.setStatus("PENDING");
        request.setRequestedAt(ZonedDateTime.now());
        MembershipEditRequest saved = membershipEditRequestRepository.save(request);
        return encryptResponse(saved);
    }

    @GetMapping("/edit-requests/pending")
    public ResponseEntity<Map<String, Object>> getPendingRequests(
            @RequestParam(name = "username", required = false) String username,
            @RequestParam(name = "role", required = false) String role,
            @RequestParam(name = "name", required = false) String name) {
        log.info("Fetching pending membership edit requests for name: {}, role: {}", name, role);
        List<MembershipEditRequest> list;
        if (role != null && (role.equals("ROLE_ADMIN") || role.equals("ADMIN"))) {
            list = membershipEditRequestRepository.findByStatus("PENDING");
        } else {
            list = membershipEditRequestRepository.findByRequestedToAndStatus(name != null ? name : "", "PENDING");
        }
        return encryptResponse(list);
    }

    @GetMapping("/edit-requests/completed")
    public ResponseEntity<Map<String, Object>> getCompletedRequests(
            @RequestParam(name = "username", required = false) String username,
            @RequestParam(name = "role", required = false) String role,
            @RequestParam(name = "name", required = false) String name) {
        log.info("Fetching completed membership edit requests for name: {}, role: {}", name, role);
        List<MembershipEditRequest> list;
        List<String> completedStatuses = List.of("APPROVED", "REJECTED", "USED");
        if (role != null && (role.equals("ROLE_ADMIN") || role.equals("ADMIN"))) {
            list = membershipEditRequestRepository.findByStatusIn(completedStatuses);
        } else {
            list = membershipEditRequestRepository.findByRequestedToAndStatusIn(name != null ? name : "", completedStatuses);
        }
        return encryptResponse(list);
    }

    @PostMapping("/edit-requests/{id}/approve")
    public ResponseEntity<Map<String, Object>> approveRequest(
            @PathVariable(name = "id") Long id,
            @RequestParam(name = "comment", required = false) String comment) {
        log.info("Approving membership edit request ID: {}, comment: {}", id, comment);
        return membershipEditRequestRepository.findById(id).map(req -> {
            req.setStatus("APPROVED");
            req.setApprovedAt(ZonedDateTime.now());
            req.setApproverComment(comment);
            membershipEditRequestRepository.save(req);
            return encryptResponse(req);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/edit-requests/{id}/reject")
    public ResponseEntity<Map<String, Object>> rejectRequest(
            @PathVariable(name = "id") Long id,
            @RequestParam(name = "comment", required = false) String comment) {
        log.info("Rejecting membership edit request ID: {}, comment: {}", id, comment);
        return membershipEditRequestRepository.findById(id).map(req -> {
            req.setStatus("REJECTED");
            req.setApproverComment(comment);
            membershipEditRequestRepository.save(req);
            return encryptResponse(req);
        }).orElseGet(() -> ResponseEntity.notFound().build());
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
