package com.overseas.portal.controller;

import com.overseas.portal.domain.EvangelismWeeklyRecord;
import com.overseas.portal.domain.EvangelismEditRequest;
import com.overseas.portal.repository.EvangelismWeeklyRecordRepository;
import com.overseas.portal.repository.EvangelismEditRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
            @RequestParam(name = "week", required = false) String week) {

        if (church != null && week != null) {
            return encryptResponse(evangelismWeeklyRecordRepository.findByChurchNameAndYearStrAndWeekKey(church, year, week));
        }
        if (church != null) {
            return encryptResponse(evangelismWeeklyRecordRepository.findByChurchNameAndYearStr(church, year));
        }
        return encryptResponse(evangelismWeeklyRecordRepository.findAll());
    }

    @PostMapping("/records")
    public ResponseEntity<List<EvangelismWeeklyRecord>> saveRecords(@RequestBody List<EvangelismWeeklyRecord> records) {
        log.info("Batch saving/updating {} evangelism weekly records into PostgreSQL DB...", records.size());
        for (EvangelismWeeklyRecord r : records) {
            List<EvangelismWeeklyRecord> existing = evangelismWeeklyRecordRepository.findByChurchNameAndYearStrAndWeekKey(
                    r.getChurchName(), r.getYearStr(), r.getWeekKey()
            );
            EvangelismWeeklyRecord target = existing.stream()
                    .filter(e -> e.getDepartment().equals(r.getDepartment()))
                    .findFirst()
                    .orElse(r);

            target.setRegCount(r.getRegCount());
            target.setFindCount(r.getFindCount());
            target.setFindDropCount(r.getFindDropCount());
            target.setGospelCount(r.getGospelCount());
            target.setGospelDropCount(r.getGospelDropCount());
            target.setAdmitCount(r.getAdmitCount());
            target.setAdmitDropCount(r.getAdmitDropCount());
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

        return ResponseEntity.ok(records);
    }

    @PostMapping("/edit-requests")
    public ResponseEntity<Map<String, Object>> createEditRequest(@RequestBody EvangelismEditRequest request) {
        log.info("Creating edit request for church: {}, week: {}, by: {}", request.getChurchName(), request.getWeekKey(), request.getRequestedBy());
        request.setStatus("PENDING");
        request.setRequestedAt(ZonedDateTime.now());
        EvangelismEditRequest saved = evangelismEditRequestRepository.save(request);
        return encryptResponse(saved);
    }

    @GetMapping("/edit-requests/pending")
    public ResponseEntity<Map<String, Object>> getPendingRequests(
            @RequestParam(name = "username", required = false) String username,
            @RequestParam(name = "role", required = false) String role,
            @RequestParam(name = "name", required = false) String name) {
        log.info("Fetching pending edit requests for name: {}, role: {}", name, role);
        List<EvangelismEditRequest> list;
        if (role != null && (role.equals("ROLE_ADMIN") || role.equals("ADMIN"))) {
            list = evangelismEditRequestRepository.findByStatus("PENDING");
        } else {
            list = evangelismEditRequestRepository.findByRequestedToAndStatus(name != null ? name : "", "PENDING");
        }
        return encryptResponse(list);
    }

    @GetMapping("/edit-requests/completed")
    public ResponseEntity<Map<String, Object>> getCompletedRequests(
            @RequestParam(name = "username", required = false) String username,
            @RequestParam(name = "role", required = false) String role,
            @RequestParam(name = "name", required = false) String name) {
        log.info("Fetching completed edit requests for name: {}, role: {}", name, role);
        List<EvangelismEditRequest> list;
        List<String> completedStatuses = List.of("APPROVED", "REJECTED", "USED");
        if (role != null && (role.equals("ROLE_ADMIN") || role.equals("ADMIN"))) {
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
