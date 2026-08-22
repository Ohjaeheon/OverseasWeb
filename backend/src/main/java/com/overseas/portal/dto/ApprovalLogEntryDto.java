package com.overseas.portal.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;

/** 통합결재 로그(관리자 전용) 한 행 - 전도/내무/월간활동보고 실적 수정 요청을 공통 형태로 합친 것. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApprovalLogEntryDto {
    private String targetType; // EVANGELISM, MEMBERSHIP, MONTHLY_ACTIVITY
    private Long requestId;
    private String churchName;
    private String yearStr;
    private String weekKey;
    private String monthKey;
    private String reason;
    private String requestedBy;
    private String requestedTo;
    private String status;
    private ZonedDateTime requestedAt;
    private ZonedDateTime approvedAt;
    private String approverComment;
}
