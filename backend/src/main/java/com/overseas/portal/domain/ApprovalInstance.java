package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.CreationTimestamp;

import java.time.ZonedDateTime;

/**
 * 실제 결재 요청 1건에 대한 결재 진행 상태. 신청 시점에 ApprovalLine 템플릿을 해석해 단계/결재자를
 * 스냅샷으로 고정해두므로(ApprovalInstanceStep/ApprovalInstanceApprover), 이후 조직 개편(팀장 교체 등)이
 * 있어도 이미 진행 중인 결재 건의 결재선은 바뀌지 않는다. targetType+targetId로 실제 요청 엔티티
 * (EvangelismEditRequest 등)를 가리킨다 - 여러 결재 기능이 이 테이블을 공유한다.
 */
@Entity
@Table(name = "approval_instance", schema = "overseas",
        uniqueConstraints = @UniqueConstraint(name = "uq_approval_instance_target", columnNames = {"target_type", "target_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("결재 요청 1건의 진행 상태 (다단계 결재 인스턴스)")
public class ApprovalInstance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    @Comment("결재 인스턴스 고유 PK")
    private Long id;

    @Column(name = "target_type", nullable = false, length = 50)
    @Comment("결재 기능 종류: EVANGELISM, MEMBERSHIP, MONTHLY_ACTIVITY")
    private String targetType;

    @Column(name = "target_id", nullable = false)
    @Comment("실제 요청 엔티티 PK (예: evangelism_edit_request.request_id)")
    private Long targetId;

    @Column(name = "approval_line_id")
    @Comment("신청 시점에 적용된 결재라인 템플릿 (approval_line FK, 이력 참고용 - 실제 진행은 스냅샷 기준)")
    private Long approvalLineId;

    @Column(name = "status", nullable = false, length = 20)
    @Comment("전체 진행 상태: PENDING, APPROVED, REJECTED")
    private String status;

    @Column(name = "current_step_order")
    @Comment("현재 진행 중인 단계 순번 (완료되면 마지막 단계 번호로 남음)")
    private Integer currentStepOrder;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    @Comment("결재 인스턴스 생성 일시 (신청 일시)")
    private ZonedDateTime createdAt;

    @Column(name = "completed_at")
    @Comment("전체 승인/반려로 종료된 일시")
    private ZonedDateTime completedAt;
}
