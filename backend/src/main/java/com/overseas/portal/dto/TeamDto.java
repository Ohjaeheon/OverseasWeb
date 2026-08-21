package com.overseas.portal.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamDto {
    private Long id;
    private Long departmentId;
    private String name;
    private Long leaderUserId;
    private String leaderName;
    private int memberCount;
}
