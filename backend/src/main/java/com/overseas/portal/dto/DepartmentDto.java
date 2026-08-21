package com.overseas.portal.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentDto {
    private Long id;
    private Long churchId;
    private String churchName;
    private String name;
    private Long leaderUserId;
    private String leaderName;
    private int teamCount;
    private int memberCount;
}
