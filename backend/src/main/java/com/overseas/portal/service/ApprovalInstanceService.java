package com.overseas.portal.service;

import com.overseas.portal.domain.*;
import com.overseas.portal.dto.ApprovalInstanceDto;
import com.overseas.portal.dto.ApprovalLinePreviewDto;
import com.overseas.portal.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * 다단계 결재 엔진 - 신청 시점에 ApprovalLine 템플릿을 해석해 ApprovalInstance(+Step+Approver)로
 * 스냅샷을 고정하고, 승인/반려 처리와 단계 진행을 담당한다. targetType/targetId로 어떤 결재 기능의
 * 어떤 요청 건인지 가리키므로 전도/내무/월간활동 등 여러 결재 플로우가 이 엔진을 공유할 수 있다.
 * 이 서비스는 결재 인스턴스 자체만 다루고, 실제 요청 엔티티(EvangelismEditRequest 등)의
 * status/approverComment 동기화는 각 컨트롤러가 담당한다.
 */
@Service
@RequiredArgsConstructor
public class ApprovalInstanceService {

    private final ApprovalLineService approvalLineService;
    private final ApprovalLineStepRepository approvalLineStepRepository;
    private final ApprovalLineStepApproverRepository approvalLineStepApproverRepository;
    private final ApprovalInstanceRepository approvalInstanceRepository;
    private final ApprovalInstanceStepRepository approvalInstanceStepRepository;
    private final ApprovalInstanceApproverRepository approvalInstanceApproverRepository;

    /**
     * 요청 신청 시점에 호출. 신청자 기준으로 결재라인을 해석해 단계/결재자를 스냅샷으로 고정하고,
     * 신청자 본인으로 해석된 결재자 슬롯은 즉시 자가승인 처리한 뒤 가능한 만큼 단계를 진행시킨다.
     */
    @Transactional
    public ApprovalInstance createInstanceForRequest(String targetType, Long targetId, User requester) {
        ApprovalLine line = approvalLineService.resolveLineForRequester(targetType, requester)
                .orElseThrow(() -> new IllegalStateException("적용 가능한 결재라인이 없습니다. 관리자에게 결재라인 구성을 요청해주세요."));

        List<ApprovalLineStep> templateSteps = approvalLineStepRepository.findByApprovalLineIdOrderByStepOrderAsc(line.getId());
        if (templateSteps.isEmpty()) {
            throw new IllegalStateException("결재라인에 구성된 단계가 없습니다. 관리자에게 문의해주세요.");
        }

        ApprovalInstance instance = approvalInstanceRepository.save(ApprovalInstance.builder()
                .targetType(targetType)
                .targetId(targetId)
                .approvalLineId(line.getId())
                .status("PENDING")
                .currentStepOrder(1)
                .build());

        for (ApprovalLineStep templateStep : templateSteps) {
            ApprovalInstanceStep instanceStep = approvalInstanceStepRepository.save(ApprovalInstanceStep.builder()
                    .instanceId(instance.getId())
                    .stepOrder(templateStep.getStepOrder())
                    .name(templateStep.getName())
                    .status("PENDING")
                    .build());

            List<ApprovalLineStepApprover> templateApprovers =
                    approvalLineStepApproverRepository.findByStepIdOrderByIdAsc(templateStep.getId());
            if (templateApprovers.isEmpty()) {
                throw new IllegalStateException(
                        (templateStep.getName() != null ? templateStep.getName() : templateStep.getStepOrder() + "차") + " 단계에 결재자가 지정되어 있지 않습니다. 관리자에게 문의해주세요.");
            }

            for (ApprovalLineStepApprover templateApprover : templateApprovers) {
                ApprovalLinePreviewDto.PreviewApproverDto resolved =
                        approvalLineService.resolveApprover(templateApprover, requester);
                if (resolved.getError() != null) {
                    throw new IllegalStateException(resolved.getError());
                }
                boolean isSelf = resolved.getResolvedUserId() != null
                        && resolved.getResolvedUserId().equals(requester.getUserId());
                approvalInstanceApproverRepository.save(ApprovalInstanceApprover.builder()
                        .instanceStepId(instanceStep.getId())
                        .resolverType(templateApprover.getResolverType())
                        .userId(resolved.getResolvedUserId())
                        .userName(resolved.getResolvedUserName())
                        .decision(isSelf ? "APPROVED" : null)
                        .decidedAt(isSelf ? ZonedDateTime.now() : null)
                        .comment(isSelf ? "자가승인(본인이 결재자로 지정되어 자동 승인됨)" : null)
                        .isSelfApproved(isSelf)
                        .build());
            }
        }

        advanceIfPossible(instance.getId());
        return approvalInstanceRepository.findById(instance.getId()).orElseThrow();
    }

    /**
     * 결재자 본인의 승인/반려 처리. actingUserId가 현재 활성 단계의 미결 결재자가 아니면 거부한다
     * (기존 승인/반려 API에는 이 검증이 없었다 - 이번에 새로 추가하는 인가 체크).
     */
    @Transactional
    public ApprovalInstance decide(String targetType, Long targetId, Long actingUserId, boolean approve, String comment) {
        ApprovalInstance instance = approvalInstanceRepository.findByTargetTypeAndTargetId(targetType, targetId)
                .orElseThrow(() -> new IllegalArgumentException("결재 인스턴스를 찾을 수 없습니다."));
        if (!"PENDING".equals(instance.getStatus())) {
            throw new IllegalStateException("이미 종료된 결재 건입니다.");
        }
        ApprovalInstanceStep currentStep = approvalInstanceStepRepository.findByInstanceIdOrderByStepOrderAsc(instance.getId()).stream()
                .filter(s -> s.getStepOrder().equals(instance.getCurrentStepOrder()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("진행 중인 결재 단계를 찾을 수 없습니다."));
        ApprovalInstanceApprover approver = approvalInstanceApproverRepository.findByInstanceStepIdOrderByIdAsc(currentStep.getId()).stream()
                .filter(a -> actingUserId.equals(a.getUserId()))
                .findFirst()
                .orElseThrow(() -> new SecurityException("현재 결재 단계의 결재자가 아닙니다."));
        if (approver.getDecision() != null) {
            throw new IllegalStateException("이미 결재 처리된 건입니다.");
        }

        approver.setDecision(approve ? "APPROVED" : "REJECTED");
        approver.setDecidedAt(ZonedDateTime.now());
        approver.setComment(comment);
        approvalInstanceApproverRepository.save(approver);

        advanceIfPossible(instance.getId());
        return approvalInstanceRepository.findById(instance.getId()).orElseThrow();
    }

    /** 현재 활성 단계가 전원 승인 상태면 다음 단계로 진행(연속으로 자가승인된 단계는 연쇄 통과), 반려가 있으면 즉시 전체 반려. */
    @Transactional
    public void advanceIfPossible(Long instanceId) {
        ApprovalInstance instance = approvalInstanceRepository.findById(instanceId).orElseThrow();
        if (!"PENDING".equals(instance.getStatus())) {
            return;
        }

        List<ApprovalInstanceStep> steps = approvalInstanceStepRepository.findByInstanceIdOrderByStepOrderAsc(instanceId);
        boolean keepGoing = true;
        while (keepGoing) {
            keepGoing = false;
            ApprovalInstanceStep currentStep = steps.stream()
                    .filter(s -> s.getStepOrder().equals(instance.getCurrentStepOrder()))
                    .findFirst()
                    .orElse(null);
            if (currentStep == null) {
                return;
            }
            List<ApprovalInstanceApprover> approvers = approvalInstanceApproverRepository.findByInstanceStepIdOrderByIdAsc(currentStep.getId());

            boolean anyRejected = approvers.stream().anyMatch(a -> "REJECTED".equals(a.getDecision()));
            if (anyRejected) {
                currentStep.setStatus("REJECTED");
                approvalInstanceStepRepository.save(currentStep);
                instance.setStatus("REJECTED");
                instance.setCompletedAt(ZonedDateTime.now());
                approvalInstanceRepository.save(instance);
                return;
            }

            boolean allApproved = approvers.stream().allMatch(a -> "APPROVED".equals(a.getDecision()));
            if (!allApproved) {
                return; // 아직 이 단계 결재 대기 중
            }

            currentStep.setStatus("APPROVED");
            approvalInstanceStepRepository.save(currentStep);

            int nextOrder = instance.getCurrentStepOrder() + 1;
            boolean hasNext = steps.stream().anyMatch(s -> s.getStepOrder() == nextOrder);
            if (hasNext) {
                instance.setCurrentStepOrder(nextOrder);
                approvalInstanceRepository.save(instance);
                keepGoing = true; // 다음 단계도 전원 자가승인 상태일 수 있으니 다시 확인
            } else {
                instance.setStatus("APPROVED");
                instance.setCompletedAt(ZonedDateTime.now());
                approvalInstanceRepository.save(instance);
            }
        }
    }

    @Transactional(readOnly = true)
    public Optional<ApprovalInstance> findInstance(String targetType, Long targetId) {
        return approvalInstanceRepository.findByTargetTypeAndTargetId(targetType, targetId);
    }

    /** 현재 활성 단계에서 아직 결재하지 않은 결재자로 지정된 요청들의 targetId 목록 (결재 대기함용). */
    @Transactional(readOnly = true)
    public List<Long> getPendingTargetIdsForApprover(String targetType, Long userId) {
        List<Long> result = new ArrayList<>();
        for (ApprovalInstance instance : approvalInstanceRepository.findByTargetTypeAndStatus(targetType, "PENDING")) {
            ApprovalInstanceStep currentStep = approvalInstanceStepRepository.findByInstanceIdOrderByStepOrderAsc(instance.getId()).stream()
                    .filter(s -> s.getStepOrder().equals(instance.getCurrentStepOrder()))
                    .findFirst().orElse(null);
            if (currentStep == null) continue;
            boolean isPendingApprover = approvalInstanceApproverRepository.findByInstanceStepIdOrderByIdAsc(currentStep.getId()).stream()
                    .anyMatch(a -> userId.equals(a.getUserId()) && a.getDecision() == null);
            if (isPendingApprover) {
                result.add(instance.getTargetId());
            }
        }
        return result;
    }

    /** 지정된 상태들(APPROVED/REJECTED 등)로 종료된 결재 건 중, userId가 결재자로 한 번이라도 참여했던 요청들의 targetId 목록 (결재 완료함용). */
    @Transactional(readOnly = true)
    public List<Long> getParticipatedTargetIds(String targetType, Long userId, List<String> instanceStatuses) {
        List<Long> result = new ArrayList<>();
        for (ApprovalInstance instance : approvalInstanceRepository.findByTargetTypeAndStatusIn(targetType, instanceStatuses)) {
            boolean participated = approvalInstanceStepRepository.findByInstanceIdOrderByStepOrderAsc(instance.getId()).stream()
                    .anyMatch(step -> approvalInstanceApproverRepository.findByInstanceStepIdOrderByIdAsc(step.getId()).stream()
                            .anyMatch(a -> userId.equals(a.getUserId())));
            if (participated) {
                result.add(instance.getTargetId());
            }
        }
        return result;
    }

    /** 현재 대기 중인 결재자 이름(콤마 구분) 또는 종료 상태 설명 - 기존 EvangelismEditRequest.requestedTo 필드 호환용. */
    @Transactional(readOnly = true)
    public String describeCurrentState(ApprovalInstance instance) {
        if ("APPROVED".equals(instance.getStatus())) {
            return "결재 완료";
        }
        if ("REJECTED".equals(instance.getStatus())) {
            return "반려됨";
        }
        ApprovalInstanceStep currentStep = approvalInstanceStepRepository.findByInstanceIdOrderByStepOrderAsc(instance.getId()).stream()
                .filter(s -> s.getStepOrder().equals(instance.getCurrentStepOrder()))
                .findFirst().orElse(null);
        if (currentStep == null) {
            return "";
        }
        String names = approvalInstanceApproverRepository.findByInstanceStepIdOrderByIdAsc(currentStep.getId()).stream()
                .filter(a -> a.getDecision() == null)
                .map(a -> a.getUserName() == null ? "미지정" : a.getUserName())
                .distinct()
                .reduce((a, b) -> a + ", " + b)
                .orElse("");
        return (currentStep.getStepOrder() + "차 " + (currentStep.getName() != null ? currentStep.getName() : "") + " · " + names).trim();
    }

    /** 가장 최근에 결재자가 남긴 의견/반려사유 - 기존 EvangelismEditRequest.approverComment 필드 호환용. */
    @Transactional(readOnly = true)
    public String getLatestComment(Long instanceId) {
        return approvalInstanceStepRepository.findByInstanceIdOrderByStepOrderAsc(instanceId).stream()
                .flatMap(step -> approvalInstanceApproverRepository.findByInstanceStepIdOrderByIdAsc(step.getId()).stream())
                .filter(a -> a.getDecidedAt() != null && !Boolean.TRUE.equals(a.getIsSelfApproved()))
                .max((a, b) -> a.getDecidedAt().compareTo(b.getDecidedAt()))
                .map(ApprovalInstanceApprover::getComment)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public Optional<ApprovalInstanceDto> getInstanceDto(String targetType, Long targetId) {
        return approvalInstanceRepository.findByTargetTypeAndTargetId(targetType, targetId).map(this::toDto);
    }

    private ApprovalInstanceDto toDto(ApprovalInstance instance) {
        List<ApprovalInstanceDto.StepDto> steps = approvalInstanceStepRepository.findByInstanceIdOrderByStepOrderAsc(instance.getId()).stream()
                .map(step -> ApprovalInstanceDto.StepDto.builder()
                        .stepOrder(step.getStepOrder())
                        .name(step.getName())
                        .status(step.getStatus())
                        .approvers(approvalInstanceApproverRepository.findByInstanceStepIdOrderByIdAsc(step.getId()).stream()
                                .map(a -> ApprovalInstanceDto.ApproverDto.builder()
                                        .userId(a.getUserId())
                                        .userName(a.getUserName())
                                        .resolverType(a.getResolverType())
                                        .decision(a.getDecision())
                                        .decidedAt(a.getDecidedAt())
                                        .comment(a.getComment())
                                        .selfApproved(Boolean.TRUE.equals(a.getIsSelfApproved()))
                                        .build())
                                .toList())
                        .build())
                .toList();

        return ApprovalInstanceDto.builder()
                .id(instance.getId())
                .targetType(instance.getTargetType())
                .targetId(instance.getTargetId())
                .status(instance.getStatus())
                .currentStepOrder(instance.getCurrentStepOrder())
                .steps(steps)
                .build();
    }
}
