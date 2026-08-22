package com.overseas.portal.controller;

import com.overseas.portal.domain.EvangelismEditRequest;
import com.overseas.portal.domain.EvangelismMonthlyActivityEditRequest;
import com.overseas.portal.domain.MembershipEditRequest;
import com.overseas.portal.dto.ApprovalLogEntryDto;
import com.overseas.portal.repository.EvangelismEditRequestRepository;
import com.overseas.portal.repository.EvangelismMonthlyActivityEditRequestRepository;
import com.overseas.portal.repository.MembershipEditRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

/**
 * 통합결재 로그 - 전도/내무/월간활동보고 실적 수정 결재 내역을 신청자/결재자 구분 없이 모든 사용자
 * 기준으로 한 화면에서 조회한다. /api/v1/admin 하위이므로 MenuPermissionInterceptor의 관리자
 * 메뉴 권한 그룹에 포함되어 동작한다. 단계별 결재 진행 상세는 각 모듈의 기존
 * "/edit-requests/{id}/approval-progress" 엔드포인트를 그대로 재사용한다(ROLE_ADMIN은 해당
 * 엔드포인트의 메뉴 권한 검사를 항상 통과하므로 별도 API가 필요 없다).
 */
@RestController
@RequestMapping("/api/v1/admin/approval-logs")
@RequiredArgsConstructor
public class AdminApprovalLogController {

    private final EvangelismEditRequestRepository evangelismEditRequestRepository;
    private final MembershipEditRequestRepository membershipEditRequestRepository;
    private final EvangelismMonthlyActivityEditRequestRepository monthlyActivityEditRequestRepository;

    @GetMapping
    public ResponseEntity<List<ApprovalLogEntryDto>> getAll() {
        List<ApprovalLogEntryDto> combined = Stream.of(
                        evangelismEditRequestRepository.findAll().stream().map(AdminApprovalLogController::fromEvangelism),
                        membershipEditRequestRepository.findAll().stream().map(AdminApprovalLogController::fromMembership),
                        monthlyActivityEditRequestRepository.findAll().stream().map(AdminApprovalLogController::fromMonthlyActivity))
                .flatMap(s -> s)
                .sorted(Comparator.comparing(ApprovalLogEntryDto::getRequestedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
        return ResponseEntity.ok(combined);
    }

    private static ApprovalLogEntryDto fromEvangelism(EvangelismEditRequest r) {
        return ApprovalLogEntryDto.builder()
                .targetType("EVANGELISM")
                .requestId(r.getRequestId())
                .churchName(r.getChurchName())
                .yearStr(r.getYearStr())
                .weekKey(r.getWeekKey())
                .reason(r.getReason())
                .requestedBy(r.getRequestedBy())
                .requestedTo(r.getRequestedTo())
                .status(r.getStatus())
                .requestedAt(r.getRequestedAt())
                .approvedAt(r.getApprovedAt())
                .approverComment(r.getApproverComment())
                .build();
    }

    private static ApprovalLogEntryDto fromMembership(MembershipEditRequest r) {
        return ApprovalLogEntryDto.builder()
                .targetType("MEMBERSHIP")
                .requestId(r.getRequestId())
                .churchName(r.getChurchName())
                .yearStr(r.getYearStr())
                .monthKey(r.getMonthKey())
                .reason(r.getReason())
                .requestedBy(r.getRequestedBy())
                .requestedTo(r.getRequestedTo())
                .status(r.getStatus())
                .requestedAt(r.getRequestedAt())
                .approvedAt(r.getApprovedAt())
                .approverComment(r.getApproverComment())
                .build();
    }

    private static ApprovalLogEntryDto fromMonthlyActivity(EvangelismMonthlyActivityEditRequest r) {
        return ApprovalLogEntryDto.builder()
                .targetType("MONTHLY_ACTIVITY")
                .requestId(r.getRequestId())
                .churchName(r.getChurchName())
                .yearStr(r.getYearStr())
                .monthKey(r.getMonthKey())
                .reason(r.getReason())
                .requestedBy(r.getRequestedBy())
                .requestedTo(r.getRequestedTo())
                .status(r.getStatus())
                .requestedAt(r.getRequestedAt())
                .approvedAt(r.getApprovedAt())
                .approverComment(r.getApproverComment())
                .build();
    }
}
