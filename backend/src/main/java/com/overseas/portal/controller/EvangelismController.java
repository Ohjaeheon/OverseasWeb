package com.overseas.portal.controller;

import com.overseas.portal.domain.EvangelismWeeklyRecord;
import com.overseas.portal.repository.EvangelismWeeklyRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/evangelism")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class EvangelismController {

    private final EvangelismWeeklyRecordRepository evangelismWeeklyRecordRepository;

    @GetMapping("/records")
    public ResponseEntity<List<EvangelismWeeklyRecord>> getRecords(
            @RequestParam(name = "church", required = false) String church,
            @RequestParam(name = "year", required = false, defaultValue = "2026년") String year,
            @RequestParam(name = "week", required = false) String week) {

        if (church != null && week != null) {
            return ResponseEntity.ok(evangelismWeeklyRecordRepository.findByChurchNameAndYearStrAndWeekKey(church, year, week));
        }
        if (church != null) {
            return ResponseEntity.ok(evangelismWeeklyRecordRepository.findByChurchNameAndYearStr(church, year));
        }
        return ResponseEntity.ok(evangelismWeeklyRecordRepository.findAll());
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
        return ResponseEntity.ok(records);
    }
}
