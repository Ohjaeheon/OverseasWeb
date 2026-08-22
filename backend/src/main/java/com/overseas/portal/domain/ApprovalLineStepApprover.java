package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

/**
 * 결재 단계별 결재자 슬롯. resolver_type이 TEAM_LEADER/DEPARTMENT_LEADER면 실제 신청자 기준으로
 * 동적으로 해석되고(팀장/부서장), SPECIFIC_USER면 specific_user_id로 지정된 회원이 고정 결재자다.
 * 한 단계에 슬롯이 여러 개면(예: 팀장 + 특정인원) 전원이 승인해야 그 단계가 통과된다.
 */
@Entity
@Table(name = "approval_line_step_approver", schema = "overseas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("결재 단계별 결재자 슬롯 - 한 단계에 여러 명이면 전원 승인해야 다음 단계로 진행")
public class ApprovalLineStepApprover {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    @Comment("결재자 슬롯 고유 PK")
    private Long id;

    @Column(name = "step_id", nullable = false)
    @Comment("소속 결재 단계 (approval_line_step FK)")
    private Long stepId;

    @Column(name = "resolver_type", nullable = false, length = 30)
    @Comment("결재자 해석 방식: TEAM_LEADER, DEPARTMENT_LEADER, SPECIFIC_USER")
    private String resolverType;

    @Column(name = "specific_user_id")
    @Comment("resolver_type=SPECIFIC_USER일 때 지정 결재자 user_id (users FK)")
    private Long specificUserId;
}
