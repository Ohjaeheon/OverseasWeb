package com.overseas.portal.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.List;

/** 특정 요청 1건의 결재 진행 현황 (프론트 결재함 상세 화면에서 단계별 진행 상황 표시용). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApprovalInstanceDto {
    private Long id;
    private String targetType;
    private Long targetId;
    private String status;
    private Integer currentStepOrder;
    private List<StepDto> steps;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StepDto {
        private Integer stepOrder;
        private String name;
        private String status;
        private List<ApproverDto> approvers;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApproverDto {
        private Long userId;
        private String userName;
        private String resolverType;
        private String decision;
        private ZonedDateTime decidedAt;
        private String comment;
        private boolean selfApproved;
    }
}
