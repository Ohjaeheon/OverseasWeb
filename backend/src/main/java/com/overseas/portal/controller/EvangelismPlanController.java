package com.overseas.portal.controller;

import com.overseas.portal.domain.EvangelismPlanItem;
import com.overseas.portal.repository.EvangelismPlanItemRepository;
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
@RequestMapping("/api/v1/evangelism/plan")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class EvangelismPlanController {

    private final EvangelismPlanItemRepository planItemRepository;
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

    private Map<String, Object> buildResult(String churchName) {
        List<EvangelismPlanItem> all = planItemRepository.findByChurchNameOrderBySortOrderAscIdAsc(churchName);

        List<Map<String, Object>> visible = all.stream()
                .filter(i -> !Boolean.TRUE.equals(i.getIsDeleted()))
                .map(this::toMap)
                .collect(Collectors.toList());

        ZonedDateTime lastUpdatedAt = null;
        String lastUpdatedBy = null;
        for (EvangelismPlanItem i : all) {
            if (i.getUpdatedAt() != null && (lastUpdatedAt == null || i.getUpdatedAt().isAfter(lastUpdatedAt))) {
                lastUpdatedAt = i.getUpdatedAt();
                lastUpdatedBy = i.getUpdatedBy();
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("items", visible);
        result.put("lastUpdatedAt", lastUpdatedAt != null ? lastUpdatedAt.toString() : null);
        result.put("lastUpdatedBy", lastUpdatedBy);
        return result;
    }

    private Map<String, Object> toMap(EvangelismPlanItem i) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", i.getId());
        map.put("title", i.getTitle());
        map.put("content", i.getContent());
        map.put("sortOrder", i.getSortOrder());
        map.put("updatedBy", i.getUpdatedBy());
        map.put("updatedAt", i.getUpdatedAt() != null ? i.getUpdatedAt().toString() : null);
        return map;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getPlan(@RequestParam("church") String church) {
        return encryptResponse(buildResult(church));
    }

    @lombok.Data
    public static class ItemPayload {
        private Long id;
        private String title;
        private String content;
    }

    @lombok.Data
    public static class SaveRequest {
        private String church;
        private List<ItemPayload> items;
        private String updatedBy;
    }

    @PostMapping("/save")
    @Transactional
    public ResponseEntity<Map<String, Object>> savePlan(@RequestBody SaveRequest req) {
        List<EvangelismPlanItem> existing = planItemRepository.findByChurchNameOrderBySortOrderAscIdAsc(req.getChurch());
        int maxSortOrder = existing.stream().mapToInt(i -> i.getSortOrder() != null ? i.getSortOrder() : 0).max().orElse(0);

        List<ItemPayload> items = req.getItems() != null ? req.getItems() : Collections.emptyList();
        for (ItemPayload p : items) {
            if (p.getId() != null) {
                EvangelismPlanItem target = existing.stream()
                        .filter(i -> i.getId().equals(p.getId()))
                        .findFirst().orElse(null);
                if (target != null) {
                    target.setTitle(p.getTitle());
                    target.setContent(p.getContent());
                    target.setUpdatedBy(req.getUpdatedBy() != null ? req.getUpdatedBy() : "system");
                    planItemRepository.save(target);
                }
            } else {
                maxSortOrder++;
                EvangelismPlanItem created = EvangelismPlanItem.builder()
                        .churchName(req.getChurch())
                        .title(p.getTitle())
                        .content(p.getContent())
                        .sortOrder(maxSortOrder)
                        .isDeleted(false)
                        .updatedBy(req.getUpdatedBy() != null ? req.getUpdatedBy() : "system")
                        .build();
                planItemRepository.save(created);
            }
        }

        return encryptResponse(buildResult(req.getChurch()));
    }

    @lombok.Data
    public static class DeleteRequest {
        private String church;
        private List<Long> ids;
        private String updatedBy;
    }

    @PostMapping("/delete")
    @Transactional
    public ResponseEntity<Map<String, Object>> deletePlanItems(@RequestBody DeleteRequest req) {
        List<Long> ids = req.getIds() != null ? req.getIds() : Collections.emptyList();
        for (Long id : ids) {
            planItemRepository.findById(id).ifPresent(item -> {
                item.setIsDeleted(true);
                item.setUpdatedBy(req.getUpdatedBy() != null ? req.getUpdatedBy() : "system");
                planItemRepository.save(item);
            });
        }
        return encryptResponse(buildResult(req.getChurch()));
    }
}
