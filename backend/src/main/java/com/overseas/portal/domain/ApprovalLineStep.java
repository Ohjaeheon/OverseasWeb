package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.CreationTimestamp;

import java.time.ZonedDateTime;

/**
 * 결재라인 내 결재 단계. step_order 순서대로 순차 진행되며(1차 전원 승인 → 2차 진행 ...),
 * 한 단계 안의 결재자(ApprovalLineStepApprover)는 전원이 승인해야 다음 단계로 넘어간다.
 */
@Entity
@Table(name = "approval_line_step", schema = "overseas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("결재라인 내 결재 단계 (순차 진행)")
public class ApprovalLineStep {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    @Comment("결재 단계 고유 PK")
    private Long id;

    @Column(name = "approval_line_id", nullable = false)
    @Comment("소속 결재라인 (approval_line FK)")
    private Long approvalLineId;

    @Column(name = "step_order", nullable = false)
    @Comment("결재 순서 (1차, 2차, ...)")
    private Integer stepOrder;

    @Column(name = "name", length = 100)
    @Comment("단계 이름 (예: 팀장 결재, 최종 승인)")
    private String name;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    @Comment("생성 일시")
    private ZonedDateTime createdAt;
}
