package com.overseas.portal.controller;

import com.overseas.portal.service.ApprovalLineService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 결재라인 템플릿 관리 API. /api/v1/admin 하위이므로 MenuPermissionInterceptor의
 * 관리자 메뉴 권한 그룹에 포함되어 동작한다.
 */
@RestController
@RequestMapping("/api/v1/admin/approval-lines")
@RequiredArgsConstructor
public class AdminApprovalLineController {

    private final ApprovalLineService service;

    @GetMapping
    public ResponseEntity<?> getLines(@RequestParam String targetType) {
        try {
            return ResponseEntity.ok(service.getLines(targetType));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createLine(@RequestBody CreateLineRequest body) {
        try {
            return ResponseEntity.ok(service.createLine(body.getTargetType(), body.getChurchId(), body.getDepartmentId(), body.getName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateLine(@PathVariable Long id, @RequestBody UpdateLineRequest body) {
        try {
            return ResponseEntity.ok(service.updateLine(id, body.getName(), body.getIsActive()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteLine(@PathVariable Long id) {
        try {
            service.deleteLine(id);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{id}/steps")
    public ResponseEntity<?> addStep(@PathVariable Long id, @RequestBody StepRequest body) {
        try {
            return ResponseEntity.ok(service.addStep(id, body.getName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/steps/{stepId}")
    public ResponseEntity<?> renameStep(@PathVariable Long stepId, @RequestBody StepRequest body) {
        try {
            return ResponseEntity.ok(service.renameStep(stepId, body.getName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}/steps/reorder")
    public ResponseEntity<?> reorderSteps(@PathVariable Long id, @RequestBody ReorderRequest body) {
        try {
            return ResponseEntity.ok(service.reorderSteps(id, body.getOrderedStepIds()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/steps/{stepId}")
    public ResponseEntity<?> deleteStep(@PathVariable Long stepId) {
        try {
            service.deleteStep(stepId);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/steps/{stepId}/approvers")
    public ResponseEntity<?> addStepApprover(@PathVariable Long stepId, @RequestBody ApproverRequest body) {
        try {
            return ResponseEntity.ok(service.addStepApprover(stepId, body.getResolverType(), body.getSpecificUserId()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/approvers/{approverId}")
    public ResponseEntity<?> removeStepApprover(@PathVariable Long approverId) {
        try {
            service.removeStepApprover(approverId);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/preview")
    public ResponseEntity<?> preview(@RequestParam String targetType, @RequestParam Long requesterUserId) {
        try {
            return ResponseEntity.ok(service.previewForRequester(targetType, requesterUserId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @Data
    public static class CreateLineRequest {
        private String targetType;
        private Long churchId;
        private Long departmentId;
        private String name;
    }

    @Data
    public static class UpdateLineRequest {
        private String name;
        private Boolean isActive;
    }

    @Data
    public static class StepRequest {
        private String name;
    }

    @Data
    public static class ReorderRequest {
        private List<Long> orderedStepIds;
    }

    @Data
    public static class ApproverRequest {
        private String resolverType;
        private Long specificUserId;
    }
}
