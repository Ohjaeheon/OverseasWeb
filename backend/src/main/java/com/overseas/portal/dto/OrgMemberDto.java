package com.overseas.portal.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrgMemberDto {
    private Long userId;
    private String username;
    private String name;
    private String role;
    private Long departmentId;
    private Long teamId;
    private String teamName;
}
