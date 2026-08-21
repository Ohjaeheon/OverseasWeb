package com.overseas.portal.controller;

import com.overseas.portal.dto.DepartmentDto;
import com.overseas.portal.dto.OrgMemberDto;
import com.overseas.portal.dto.TeamDto;
import com.overseas.portal.service.OrgStructureService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 조직 계층(국가 > 부서 > 팀 > 회원) 관리 API. /api/v1/admin 하위이므로
 * MenuPermissionInterceptor의 관리자 메뉴 권한 그룹에 포함되어 동작한다.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/org-structure")
@RequiredArgsConstructor
public class OrgStructureController {

    private final OrgStructureService service;

    /** 회원 관리 등 다른 화면에서 회원의 소속 부서/팀명을 표시하기 위한 전체 목록 조회. */
    @GetMapping("/directory")
    public ResponseEntity<?> getDirectory() {
        return ResponseEntity.ok(Map.of(
                "departments", service.getAllDepartments(),
                "teams", service.getAllTeams()
        ));
    }

    @GetMapping("/departments")
    public ResponseEntity<?> getDepartments(@RequestParam Long churchId) {
        return ResponseEntity.ok(service.getDepartments(churchId));
    }

    @PostMapping("/departments")
    public ResponseEntity<?> createDepartment(@RequestBody DepartmentRequest body) {
        try {
            return ResponseEntity.ok(service.createDepartment(body.getChurchId(), body.getName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/departments/{id}")
    public ResponseEntity<?> renameDepartment(@PathVariable Long id, @RequestBody DepartmentRequest body) {
        try {
            return ResponseEntity.ok(service.renameDepartment(id, body.getName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/departments/{id}")
    public ResponseEntity<?> deleteDepartment(@PathVariable Long id) {
        try {
            service.deleteDepartment(id);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/departments/{id}/leader")
    public ResponseEntity<?> setDepartmentLeader(@PathVariable Long id, @RequestBody LeaderRequest body) {
        try {
            return ResponseEntity.ok(service.setDepartmentLeader(id, body.getUserId()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/departments/{id}/teams")
    public ResponseEntity<List<TeamDto>> getTeams(@PathVariable Long id) {
        return ResponseEntity.ok(service.getTeams(id));
    }

    @PostMapping("/departments/{id}/teams")
    public ResponseEntity<?> createTeam(@PathVariable Long id, @RequestBody TeamRequest body) {
        try {
            return ResponseEntity.ok(service.createTeam(id, body.getName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/teams/{id}")
    public ResponseEntity<?> renameTeam(@PathVariable Long id, @RequestBody TeamRequest body) {
        try {
            return ResponseEntity.ok(service.renameTeam(id, body.getName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/teams/{id}")
    public ResponseEntity<?> deleteTeam(@PathVariable Long id) {
        try {
            service.deleteTeam(id);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/teams/{id}/leader")
    public ResponseEntity<?> setTeamLeader(@PathVariable Long id, @RequestBody LeaderRequest body) {
        try {
            return ResponseEntity.ok(service.setTeamLeader(id, body.getUserId()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/departments/{id}/members")
    public ResponseEntity<List<OrgMemberDto>> getDepartmentMembers(@PathVariable Long id) {
        return ResponseEntity.ok(service.getDepartmentMembers(id));
    }

    @PutMapping("/users/{userId}/assignment")
    public ResponseEntity<?> assignUser(@PathVariable Long userId, @RequestBody AssignmentRequest body) {
        try {
            return ResponseEntity.ok(service.assignUser(userId, body.getDepartmentId(), body.getTeamId()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @Data
    public static class DepartmentRequest {
        private Long churchId;
        private String name;
    }

    @Data
    public static class TeamRequest {
        private String name;
    }

    @Data
    public static class LeaderRequest {
        private Long userId;
    }

    @Data
    public static class AssignmentRequest {
        private Long departmentId;
        private Long teamId;
    }
}
