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
