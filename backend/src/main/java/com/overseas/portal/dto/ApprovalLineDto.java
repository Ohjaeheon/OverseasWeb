package com.overseas.portal.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApprovalLineDto {
    private Long id;
    private String targetType;
    private Long churchId;
    private String churchName;
    private Long departmentId;
    private String departmentName;
    private String name;
    private Boolean isActive;
    private List<ApprovalLineStepDto> steps;
}
