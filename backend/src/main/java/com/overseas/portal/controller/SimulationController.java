package com.overseas.portal.controller;

import com.overseas.portal.domain.SimulationBaseRegistered;
import com.overseas.portal.domain.SimulationChartSettings;
import com.overseas.portal.domain.SimulationMonthlyData;
import com.overseas.portal.repository.SimulationBaseRegisteredRepository;
import com.overseas.portal.repository.SimulationChartSettingsRepository;
import com.overseas.portal.repository.SimulationMonthlyDataRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;


@Slf4j
@RestController
@RequestMapping("/api/v1/simulation")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SimulationController {

    private final SimulationBaseRegisteredRepository baseRepo;
    private final SimulationMonthlyDataRepository monthlyRepo;
    private final SimulationChartSettingsRepository chartSettingsRepo;

    // ──────────────────────────────────────────────────────
    // 기준 재적 API
    // ──────────────────────────────────────────────────────

    /** 연도별 기준 재적 조회 */
    @GetMapping("/base")
    public ResponseEntity<List<SimulationBaseRegistered>> getBase(
            @RequestParam(name = "year") Integer year) {
        return ResponseEntity.ok(baseRepo.findBySimYear(year));
    }

    /** 기준 재적 저장 (upsert) */
    @PostMapping("/base")
    @Transactional
    public ResponseEntity<SimulationBaseRegistered> saveBase(@RequestBody BaseRequest req) {
        SimulationBaseRegistered.SimulationBaseId id =
                new SimulationBaseRegistered.SimulationBaseId(req.getSimYear(), req.getCenterName());
        SimulationBaseRegistered entity = baseRepo.findById(id).orElseGet(SimulationBaseRegistered::new);
        entity.setSimYear(req.getSimYear());
        entity.setCenterName(req.getCenterName());
        entity.setBaseRegistered(req.getBaseRegistered());
        entity.setUsePrevAuto(req.getUsePrevAuto() != null ? req.getUsePrevAuto() : false);
        entity.setUpdatedBy(req.getUpdatedBy());
        return ResponseEntity.ok(baseRepo.save(entity));
    }

    /** 기준 재적 배치 저장 */
    @PostMapping("/base/batch")
    @Transactional
    public ResponseEntity<Map<String, Object>> saveBaseBatch(@RequestBody List<BaseRequest> reqs) {
        int saved = 0;
        for (BaseRequest req : reqs) {
            SimulationBaseRegistered.SimulationBaseId id =
                    new SimulationBaseRegistered.SimulationBaseId(req.getSimYear(), req.getCenterName());
            SimulationBaseRegistered entity = baseRepo.findById(id).orElseGet(SimulationBaseRegistered::new);
            entity.setSimYear(req.getSimYear());
            entity.setCenterName(req.getCenterName());
            entity.setBaseRegistered(req.getBaseRegistered());
            entity.setUsePrevAuto(req.getUsePrevAuto() != null ? req.getUsePrevAuto() : false);
            entity.setUpdatedBy(req.getUpdatedBy());
            baseRepo.save(entity);
            saved++;
        }
        Map<String, Object> res = new HashMap<>();
        res.put("saved", saved);
        res.put("message", "기준 재적 저장 완료");
        return ResponseEntity.ok(res);
    }

    // ──────────────────────────────────────────────────────
    // 월별 데이터 API
    // ──────────────────────────────────────────────────────

    /** 연도 전체 월별 데이터 조회 */
    @GetMapping("/monthly")
    public ResponseEntity<List<SimulationMonthlyData>> getMonthly(
            @RequestParam(name = "year") Integer year) {
        return ResponseEntity.ok(monthlyRepo.findBySimYear(year));
    }

    /** 월별 데이터 단건 저장 (upsert) */
    @PostMapping("/monthly")
    @Transactional
    public ResponseEntity<SimulationMonthlyData> saveMonthly(@RequestBody MonthlyRequest req) {
        SimulationMonthlyData entity = monthlyRepo
                .findBySimYearAndCenterNameAndMonthNum(req.getSimYear(), req.getCenterName(), req.getMonthNum())
                .orElseGet(SimulationMonthlyData::new);
        applyMonthly(entity, req);
        return ResponseEntity.ok(monthlyRepo.save(entity));
    }

    /** 월별 데이터 배치 저장 */
    @PostMapping("/monthly/batch")
    @Transactional
    public ResponseEntity<Map<String, Object>> saveMonthlyBatch(@RequestBody List<MonthlyRequest> reqs) {
        int saved = 0;
        for (MonthlyRequest req : reqs) {
            SimulationMonthlyData entity = monthlyRepo
                    .findBySimYearAndCenterNameAndMonthNum(req.getSimYear(), req.getCenterName(), req.getMonthNum())
                    .orElseGet(SimulationMonthlyData::new);
            applyMonthly(entity, req);
            monthlyRepo.save(entity);
            saved++;
        }
        Map<String, Object> res = new HashMap<>();
        res.put("saved", saved);
        res.put("message", "월별 데이터 저장 완료");
        return ResponseEntity.ok(res);
    }

    private void applyMonthly(SimulationMonthlyData entity, MonthlyRequest req) {
        entity.setSimYear(req.getSimYear());
        entity.setCenterName(req.getCenterName());
        entity.setMonthNum(req.getMonthNum());
        if (req.getRegistered() != null) entity.setRegistered(req.getRegistered());
        if (req.getRegCount() != null) entity.setRegCount(req.getRegCount());
        if (req.getGradCount() != null) entity.setGradCount(req.getGradCount());
        if (req.getGrowthRate() != null) entity.setGrowthRate(BigDecimal.valueOf(req.getGrowthRate()));
        if (req.getRegRate() != null) entity.setRegRate(BigDecimal.valueOf(req.getRegRate()));
        if (req.getGradRate() != null) entity.setGradRate(BigDecimal.valueOf(req.getGradRate()));
        entity.setIsForecast(req.getIsForecast() != null ? req.getIsForecast() : false);
        entity.setNote(req.getNote());
        entity.setUpdatedBy(req.getUpdatedBy());
    }

    // ──────────────────────────────────────────────────────
    // DTOs
    // ──────────────────────────────────────────────────────

    @lombok.Data
    public static class BaseRequest {
        private Integer simYear;
        private String centerName;
        private Integer baseRegistered;
        private Boolean usePrevAuto;
        private String updatedBy;
    }

    @lombok.Data
    public static class MonthlyRequest {
        private Integer simYear;
        private String centerName;
        private Integer monthNum;
        private Integer registered;
        private Integer regCount;
        private Integer gradCount;
        private Double growthRate;
        private Double regRate;
        private Double gradRate;
        private Boolean isForecast;
        private String note;
        private String updatedBy;
    }

    // ──────────────────────────────────────────────────────
    // 차트 설정 API
    // ──────────────────────────────────────────────────────

    private static final String CHART_SETTINGS_KEY = "default";

    /** 차트 설정 조회 */
    @GetMapping("/chart-settings")
    public ResponseEntity<Map<String, Object>> getChartSettings(
            @RequestParam(name = "key", defaultValue = "default") String key) {
        Map<String, Object> result = new HashMap<>();
        chartSettingsRepo.findById(key).ifPresentOrElse(
            s -> result.put("settingsValue", s.getSettingsValue()),
            () -> result.put("settingsValue", null)
        );
        return ResponseEntity.ok(result);
    }

    /** 차트 설정 저장 (upsert) */
    @PostMapping("/chart-settings")
    @Transactional
    public ResponseEntity<Map<String, Object>> saveChartSettings(@RequestBody ChartSettingsRequest req) {
        String key = req.getKey() != null ? req.getKey() : CHART_SETTINGS_KEY;
        SimulationChartSettings entity = chartSettingsRepo.findById(key)
                .orElse(SimulationChartSettings.builder().settingsKey(key).build());
        entity.setSettingsValue(req.getSettingsValue());
        entity.setUpdatedBy(req.getUpdatedBy());
        chartSettingsRepo.save(entity);
        Map<String, Object> result = new HashMap<>();
        result.put("message", "차트 설정 저장 완료");
        result.put("key", key);
        return ResponseEntity.ok(result);
    }

    @lombok.Data
    public static class ChartSettingsRequest {
        private String key;
        private String settingsValue;
        private String updatedBy;
    }
}
