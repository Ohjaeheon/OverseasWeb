package com.overseas.portal.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApprovalLineStepApproverDto {
    private Long id;
    private String resolverType;
    private Long specificUserId;
    private String specificUserName;
}
