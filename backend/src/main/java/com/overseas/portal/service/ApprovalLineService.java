package com.overseas.portal.service;

import com.overseas.portal.domain.*;
import com.overseas.portal.dto.ApprovalLineDto;
import com.overseas.portal.dto.ApprovalLinePreviewDto;
import com.overseas.portal.dto.ApprovalLineStepApproverDto;
import com.overseas.portal.dto.ApprovalLineStepDto;
import com.overseas.portal.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * 결재라인 템플릿(ApprovalLine) CRUD 및 결재자 해석 로직. 이 단계에서는 관리자가 라인을 미리
 * 구성해두는 것과, 특정 신청자 기준으로 실제 결재자가 누구로 해석되는지 미리보기(previewForRequester)만
 * 제공한다 - 실제 결재 신청/승인 플로우(EvangelismEditRequest 등) 연동은 다음 단계에서 진행한다.
 */
@Service
@RequiredArgsConstructor
public class ApprovalLineService {

    private static final List<String> VALID_TARGET_TYPES = List.of("EVANGELISM", "MEMBERSHIP", "MONTHLY_ACTIVITY");
    private static final List<String> VALID_RESOLVER_TYPES = List.of("TEAM_LEADER", "DEPARTMENT_LEADER", "SPECIFIC_USER");

    private final ApprovalLineRepository approvalLineRepository;
    private final ApprovalLineStepRepository approvalLineStepRepository;
    private final ApprovalLineStepApproverRepository approvalLineStepApproverRepository;
    private final ChurchRepository churchRepository;
    private final DepartmentRepository departmentRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<ApprovalLineDto> getLines(String targetType) {
        validateTargetType(targetType);
        return approvalLineRepository.findByTargetTypeOrderByIdAsc(targetType).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public ApprovalLineDto createLine(String targetType, Long churchId, Long departmentId, String name) {
        validateTargetType(targetType);
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("결재라인 이름을 입력해주세요.");
        }

        Long resolvedChurchId = churchId;
        if (departmentId != null) {
            Department department = departmentRepository.findById(departmentId)
                    .orElseThrow(() -> new IllegalArgumentException("부서를 찾을 수 없습니다."));
            resolvedChurchId = department.getChurchId();
        } else if (churchId != null && !churchRepository.existsById(churchId)) {
            throw new IllegalArgumentException("교회/지역/개척지를 찾을 수 없습니다.");
        }

        Long finalChurchId = resolvedChurchId;
        boolean duplicate = approvalLineRepository.findByTargetTypeOrderByIdAsc(targetType).stream()
                .anyMatch(l -> Boolean.TRUE.equals(l.getIsActive())
                        && Objects.equals(l.getChurchId(), finalChurchId)
                        && Objects.equals(l.getDepartmentId(), departmentId));
        if (duplicate) {
            throw new IllegalArgumentException("이미 동일한 범위에 활성화된 결재라인이 있습니다. 기존 라인을 수정하거나 비활성화한 뒤 다시 시도해주세요.");
        }

        ApprovalLine line = ApprovalLine.builder()
                .targetType(targetType)
                .churchId(resolvedChurchId)
                .departmentId(departmentId)
                .name(name.trim())
                .isActive(true)
                .build();
        return toDto(approvalLineRepository.save(line));
    }

    @Transactional
    public ApprovalLineDto updateLine(Long id, String name, Boolean isActive) {
        ApprovalLine line = approvalLineRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("결재라인을 찾을 수 없습니다."));
        if (name != null && !name.isBlank()) {
            line.setName(name.trim());
        }
        if (isActive != null) {
            line.setIsActive(isActive);
        }
        return toDto(approvalLineRepository.save(line));
    }

    @Transactional
    public void deleteLine(Long id) {
        if (!approvalLineRepository.existsById(id)) {
            throw new IllegalArgumentException("결재라인을 찾을 수 없습니다.");
        }
        List<ApprovalLineStep> steps = approvalLineStepRepository.findByApprovalLineIdOrderByStepOrderAsc(id);
        for (ApprovalLineStep step : steps) {
            approvalLineStepApproverRepository.deleteByStepId(step.getId());
        }
        approvalLineStepRepository.deleteByApprovalLineId(id);
        approvalLineRepository.deleteById(id);
    }

    @Transactional
    public ApprovalLineDto addStep(Long approvalLineId, String name) {
        ApprovalLine line = approvalLineRepository.findById(approvalLineId)
                .orElseThrow(() -> new IllegalArgumentException("결재라인을 찾을 수 없습니다."));
        int nextOrder = approvalLineStepRepository.findByApprovalLineIdOrderByStepOrderAsc(approvalLineId).stream()
                .mapToInt(ApprovalLineStep::getStepOrder).max().orElse(0) + 1;
        ApprovalLineStep step = ApprovalLineStep.builder()
                .approvalLineId(approvalLineId)
                .stepOrder(nextOrder)
                .name(name == null || name.isBlank() ? (nextOrder + "차 결재") : name.trim())
                .build();
        approvalLineStepRepository.save(step);
        return toDto(line);
    }

    @Transactional
    public ApprovalLineDto renameStep(Long stepId, String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("결재구분을 입력해주세요.");
        }
        ApprovalLineStep step = approvalLineStepRepository.findById(stepId)
                .orElseThrow(() -> new IllegalArgumentException("결재 단계를 찾을 수 없습니다."));
        step.setName(name.trim());
        approvalLineStepRepository.save(step);
        ApprovalLine line = approvalLineRepository.findById(step.getApprovalLineId())
                .orElseThrow(() -> new IllegalArgumentException("결재라인을 찾을 수 없습니다."));
        return toDto(line);
    }

    @Transactional
    public ApprovalLineDto reorderSteps(Long approvalLineId, List<Long> orderedStepIds) {
        ApprovalLine line = approvalLineRepository.findById(approvalLineId)
                .orElseThrow(() -> new IllegalArgumentException("결재라인을 찾을 수 없습니다."));
        List<ApprovalLineStep> steps = approvalLineStepRepository.findByApprovalLineIdOrderByStepOrderAsc(approvalLineId);
        Map<Long, ApprovalLineStep> byId = steps.stream().collect(Collectors.toMap(ApprovalLineStep::getId, s -> s));
        if (orderedStepIds == null || orderedStepIds.size() != steps.size() || !byId.keySet().containsAll(orderedStepIds)) {
            throw new IllegalArgumentException("단계 목록이 일치하지 않습니다.");
        }
        for (int i = 0; i < orderedStepIds.size(); i++) {
            ApprovalLineStep step = byId.get(orderedStepIds.get(i));
            step.setStepOrder(i + 1);
            approvalLineStepRepository.save(step);
        }
        return toDto(line);
    }

    @Transactional
    public void deleteStep(Long stepId) {
        ApprovalLineStep step = approvalLineStepRepository.findById(stepId)
                .orElseThrow(() -> new IllegalArgumentException("결재 단계를 찾을 수 없습니다."));
        Long approvalLineId = step.getApprovalLineId();
        approvalLineStepApproverRepository.deleteByStepId(stepId);
        approvalLineStepRepository.deleteById(stepId);

        // 남은 단계 순서를 1..N으로 재정렬
        List<ApprovalLineStep> remaining = approvalLineStepRepository.findByApprovalLineIdOrderByStepOrderAsc(approvalLineId);
        for (int i = 0; i < remaining.size(); i++) {
            ApprovalLineStep s = remaining.get(i);
            if (!Objects.equals(s.getStepOrder(), i + 1)) {
                s.setStepOrder(i + 1);
                approvalLineStepRepository.save(s);
            }
        }
    }

    @Transactional
    public ApprovalLineStepApproverDto addStepApprover(Long stepId, String resolverType, Long specificUserId) {
        if (!VALID_RESOLVER_TYPES.contains(resolverType)) {
            throw new IllegalArgumentException("알 수 없는 결재자 유형입니다: " + resolverType);
        }
        if (!approvalLineStepRepository.existsById(stepId)) {
            throw new IllegalArgumentException("결재 단계를 찾을 수 없습니다.");
        }
        Long resolvedSpecificUserId = null;
        if ("SPECIFIC_USER".equals(resolverType)) {
            if (specificUserId == null) {
                throw new IllegalArgumentException("특정인원 결재자는 회원을 지정해야 합니다.");
            }
            if (!userRepository.existsById(specificUserId)) {
                throw new IllegalArgumentException("회원을 찾을 수 없습니다.");
            }
            resolvedSpecificUserId = specificUserId;
        }
        ApprovalLineStepApprover approver = ApprovalLineStepApprover.builder()
                .stepId(stepId)
                .resolverType(resolverType)
                .specificUserId(resolvedSpecificUserId)
                .build();
        return toApproverDto(approvalLineStepApproverRepository.save(approver));
    }

    @Transactional
    public void removeStepApprover(Long approverId) {
        if (!approvalLineStepApproverRepository.existsById(approverId)) {
            throw new IllegalArgumentException("결재자를 찾을 수 없습니다.");
        }
        approvalLineStepApproverRepository.deleteById(approverId);
    }

    /**
     * 관리자 미리보기 전용: targetType + 신청자 기준으로 부서 우선 → 교회 우선 → 전역 기본 순으로
     * 라인을 찾고, 각 단계 결재자 슬롯을 실제 사용자로 해석해서 보여준다.
     */
    @Transactional(readOnly = true)
    public ApprovalLinePreviewDto previewForRequester(String targetType, Long requesterUserId) {
        validateTargetType(targetType);
        User requester = userRepository.findById(requesterUserId)
                .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다."));

        Optional<ApprovalLine> resolved = resolveLineForRequester(targetType, requester);
        if (resolved.isEmpty()) {
            return ApprovalLinePreviewDto.builder()
                    .errorMessage("해당 기능에 적용 가능한 결재라인이 없습니다. 관리자가 결재라인을 먼저 구성해야 합니다.")
                    .build();
        }

        ApprovalLine line = resolved.get();
        List<ApprovalLineStep> steps = approvalLineStepRepository.findByApprovalLineIdOrderByStepOrderAsc(line.getId());
        List<ApprovalLinePreviewDto.PreviewStepDto> stepDtos = steps.stream().map(step -> {
            List<ApprovalLinePreviewDto.PreviewApproverDto> approverDtos =
                    approvalLineStepApproverRepository.findByStepIdOrderByIdAsc(step.getId()).stream()
                            .map(a -> resolveApprover(a, requester))
                            .toList();
            return ApprovalLinePreviewDto.PreviewStepDto.builder()
                    .stepOrder(step.getStepOrder())
                    .name(step.getName())
                    .approvers(approverDtos)
                    .build();
        }).toList();

        return ApprovalLinePreviewDto.builder()
                .lineId(line.getId())
                .lineName(line.getName())
                .scopeDescription(describeScope(line))
                .steps(stepDtos)
                .build();
    }

    /** ApprovalInstanceService(결재 엔진)에서도 재사용하는 공개 API - department 우선 → church 우선 → 전역 기본 순. */
    public Optional<ApprovalLine> resolveLineForRequester(String targetType, User requester) {
        List<ApprovalLine> candidates = approvalLineRepository.findByTargetTypeOrderByIdAsc(targetType).stream()
                .filter(l -> Boolean.TRUE.equals(l.getIsActive()))
                .toList();

        if (requester.getDepartmentId() != null) {
            Optional<ApprovalLine> deptMatch = candidates.stream()
                    .filter(l -> requester.getDepartmentId().equals(l.getDepartmentId()))
                    .findFirst();
            if (deptMatch.isPresent()) return deptMatch;

            Long churchId = departmentRepository.findById(requester.getDepartmentId())
                    .map(Department::getChurchId).orElse(null);
            if (churchId != null) {
                Optional<ApprovalLine> churchMatch = candidates.stream()
                        .filter(l -> l.getDepartmentId() == null && churchId.equals(l.getChurchId()))
                        .findFirst();
                if (churchMatch.isPresent()) return churchMatch;
            }
        }

        return candidates.stream()
                .filter(l -> l.getChurchId() == null && l.getDepartmentId() == null)
                .findFirst();
    }

    /** ApprovalInstanceService(결재 엔진)에서도 재사용하는 공개 API - 결재자 슬롯 1개를 실제 사용자로 해석. */
    public ApprovalLinePreviewDto.PreviewApproverDto resolveApprover(ApprovalLineStepApprover approver, User requester) {
        return switch (approver.getResolverType()) {
            case "TEAM_LEADER" -> {
                if (requester.getTeamId() == null) {
                    // 신청자에게 소속 팀 자체가 없으면(예: 관리자) 결재를 막지 않고 본인 자가결재로 대체한다.
                    yield ApprovalLinePreviewDto.PreviewApproverDto.builder().resolverType("TEAM_LEADER")
                            .resolvedUserId(requester.getUserId()).resolvedUserName(requester.getName()).build();
                }
                Long leaderId = teamRepository.findById(requester.getTeamId()).map(Team::getLeaderUserId).orElse(null);
                if (leaderId == null) {
                    yield ApprovalLinePreviewDto.PreviewApproverDto.builder().resolverType("TEAM_LEADER")
                            .error("소속 팀에 팀장이 지정되어 있지 않습니다.").build();
                }
                String name = userRepository.findById(leaderId).map(User::getName).orElse(null);
                yield ApprovalLinePreviewDto.PreviewApproverDto.builder().resolverType("TEAM_LEADER")
                        .resolvedUserId(leaderId).resolvedUserName(name).build();
            }
            case "DEPARTMENT_LEADER" -> {
                if (requester.getDepartmentId() == null) {
                    yield ApprovalLinePreviewDto.PreviewApproverDto.builder().resolverType("DEPARTMENT_LEADER")
                            .error("신청자에게 소속 부서가 없습니다.").build();
                }
                Long leaderId = departmentRepository.findById(requester.getDepartmentId()).map(Department::getLeaderUserId).orElse(null);
                if (leaderId == null) {
                    yield ApprovalLinePreviewDto.PreviewApproverDto.builder().resolverType("DEPARTMENT_LEADER")
                            .error("소속 부서에 부서장이 지정되어 있지 않습니다.").build();
                }
                String name = userRepository.findById(leaderId).map(User::getName).orElse(null);
                yield ApprovalLinePreviewDto.PreviewApproverDto.builder().resolverType("DEPARTMENT_LEADER")
                        .resolvedUserId(leaderId).resolvedUserName(name).build();
            }
            case "SPECIFIC_USER" -> {
                String name = userRepository.findById(approver.getSpecificUserId()).map(User::getName).orElse(null);
                yield ApprovalLinePreviewDto.PreviewApproverDto.builder().resolverType("SPECIFIC_USER")
                        .resolvedUserId(approver.getSpecificUserId()).resolvedUserName(name).build();
            }
            default -> throw new IllegalStateException("알 수 없는 결재자 유형: " + approver.getResolverType());
        };
    }

    private String describeScope(ApprovalLine line) {
        if (line.getDepartmentId() != null) {
            return departmentRepository.findById(line.getDepartmentId())
                    .map(d -> d.getName() + " 부서 전용").orElse("부서 전용");
        }
        if (line.getChurchId() != null) {
            return churchRepository.findById(line.getChurchId())
                    .map(c -> c.getName() + " 전용").orElse("교회 전용");
        }
        return "전역 기본";
    }

    private void validateTargetType(String targetType) {
        if (!VALID_TARGET_TYPES.contains(targetType)) {
            throw new IllegalArgumentException("알 수 없는 결재 기능 유형입니다: " + targetType);
        }
    }

    private ApprovalLineDto toDto(ApprovalLine line) {
        String churchName = line.getChurchId() == null ? null
                : churchRepository.findById(line.getChurchId()).map(Church::getName).orElse(null);
        String departmentName = line.getDepartmentId() == null ? null
                : departmentRepository.findById(line.getDepartmentId()).map(Department::getName).orElse(null);
        List<ApprovalLineStepDto> steps = approvalLineStepRepository.findByApprovalLineIdOrderByStepOrderAsc(line.getId()).stream()
                .map(this::toStepDto)
                .toList();
        return ApprovalLineDto.builder()
                .id(line.getId())
                .targetType(line.getTargetType())
                .churchId(line.getChurchId())
                .churchName(churchName)
                .departmentId(line.getDepartmentId())
                .departmentName(departmentName)
                .name(line.getName())
                .isActive(line.getIsActive())
                .steps(steps)
                .build();
    }

    private ApprovalLineStepDto toStepDto(ApprovalLineStep step) {
        List<ApprovalLineStepApproverDto> approvers = approvalLineStepApproverRepository.findByStepIdOrderByIdAsc(step.getId()).stream()
                .map(this::toApproverDto)
                .toList();
        return ApprovalLineStepDto.builder()
                .id(step.getId())
                .stepOrder(step.getStepOrder())
                .name(step.getName())
                .approvers(approvers)
                .build();
    }

    private ApprovalLineStepApproverDto toApproverDto(ApprovalLineStepApprover approver) {
        String specificUserName = approver.getSpecificUserId() == null ? null
                : userRepository.findById(approver.getSpecificUserId()).map(User::getName).orElse(null);
        return ApprovalLineStepApproverDto.builder()
                .id(approver.getId())
                .resolverType(approver.getResolverType())
                .specificUserId(approver.getSpecificUserId())
                .specificUserName(specificUserName)
                .build();
    }
}
