package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.time.ZonedDateTime;

/**
 * 결재 인스턴스 단계별 결재자 스냅샷. 신청 시점에 팀장/부서장/특정인원을 실제 user_id로 해석해서
 * 고정해두므로, 이후 팀장이 바뀌어도 이미 진행 중인 결재 건에는 영향을 주지 않는다.
 * decision이 null이면 아직 미결, "APPROVED"/"REJECTED"면 처리 완료.
 */
@Entity
@Table(name = "approval_instance_approver", schema = "overseas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("결재 인스턴스 단계별 결재자 스냅샷 및 결재 처리 결과")
public class ApprovalInstanceApprover {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    @Comment("결재자 슬롯 고유 PK")
    private Long id;

    @Column(name = "instance_step_id", nullable = false)
    @Comment("소속 결재 인스턴스 단계 (approval_instance_step FK)")
    private Long instanceStepId;

    @Column(name = "resolver_type", nullable = false, length = 30)
    @Comment("결재자 해석 방식 스냅샷: TEAM_LEADER, DEPARTMENT_LEADER, SPECIFIC_USER")
    private String resolverType;

    @Column(name = "user_id")
    @Comment("실제 해석된 결재자 user_id (users FK)")
    private Long userId;

    @Column(name = "user_name", length = 100)
    @Comment("결재자 이름 스냅샷 (표시용)")
    private String userName;

    @Column(name = "decision", length = 20)
    @Comment("결재 처리 결과: null(미결), APPROVED, REJECTED")
    private String decision;

    @Column(name = "decided_at")
    @Comment("결재 처리 일시")
    private ZonedDateTime decidedAt;

    @Column(name = "comment", columnDefinition = "TEXT")
    @Comment("결재 의견 또는 반려 사유")
    private String comment;

    @Column(name = "is_self_approved", nullable = false)
    @Comment("신청자 본인이 결재자로 해석되어 자동 승인된 건인지 여부")
    @Builder.Default
    private Boolean isSelfApproved = false;
}
