package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

/**
 * 결재 인스턴스의 단계 스냅샷. ApprovalLineStep의 그 시점 내용(순서/결재구분 라벨)을 그대로 복사해둔다.
 */
@Entity
@Table(name = "approval_instance_step", schema = "overseas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("결재 인스턴스 내 단계 스냅샷")
public class ApprovalInstanceStep {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    @Comment("단계 고유 PK")
    private Long id;

    @Column(name = "instance_id", nullable = false)
    @Comment("소속 결재 인스턴스 (approval_instance FK)")
    private Long instanceId;

    @Column(name = "step_order", nullable = false)
    @Comment("결재 순서 (1차, 2차, ...)")
    private Integer stepOrder;

    @Column(name = "name", length = 100)
    @Comment("결재구분 라벨 스냅샷 (예: 검토, 승인)")
    private String name;

    @Column(name = "status", nullable = false, length = 20)
    @Comment("단계 진행 상태: PENDING, APPROVED, REJECTED")
    private String status;
}
