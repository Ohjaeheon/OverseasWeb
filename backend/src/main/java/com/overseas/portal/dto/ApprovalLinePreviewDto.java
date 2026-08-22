package com.overseas.portal.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 관리자 화면에서 "이 사람이 신청하면 실제 결재자가 누구로 해석되는지" 미리보기 위한 응답.
 * errorMessage가 채워지면 라인 자체를 찾지 못한 것이고, 각 approver의 error는 라인은 찾았지만
 * (예: 팀장 미지정처럼) 그 슬롯 하나를 해석하지 못한 경우다.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApprovalLinePreviewDto {
    private Long lineId;
    private String lineName;
    private String scopeDescription;
    private List<PreviewStepDto> steps;
    private String errorMessage;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PreviewStepDto {
        private Integer stepOrder;
        private String name;
        private List<PreviewApproverDto> approvers;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PreviewApproverDto {
        private String resolverType;
        private Long resolvedUserId;
        private String resolvedUserName;
        private String error;
    }
}
