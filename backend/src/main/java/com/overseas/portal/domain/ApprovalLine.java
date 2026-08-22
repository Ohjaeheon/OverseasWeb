package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;

/**
 * 결재라인 템플릿 - 결재 기능(전도/내무/월간활동 등) × 조직 범위(전역/교회/부서)별로 다단계 결재 순서를
 * 정의하는 관리자 설정. church_id/department_id가 모두 null이면 해당 targetType의 전역 기본 라인이고,
 * department_id가 지정되면 그 부서 전용, church_id만 지정(department_id는 null)되면 그 교회 전체 전용이다.
 * 실제 신청/승인 플로우(EvangelismEditRequest 등) 연동은 다음 단계에서 진행하며, 이 엔티티는 아직
 * 관리자가 라인을 미리 구성해두는 템플릿 역할만 한다.
 */
@Entity
@Table(name = "approval_line", schema = "overseas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("결재라인 템플릿 - 결재 기능별/조직 범위별 다단계 결재 순서 정의")
public class ApprovalLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    @Comment("결재라인 고유 PK")
    private Long id;

    @Column(name = "target_type", nullable = false, length = 50)
    @Comment("결재 기능 종류: EVANGELISM, MEMBERSHIP, MONTHLY_ACTIVITY")
    private String targetType;

    @Column(name = "church_id")
    @Comment("적용 범위 - 특정 교회/지역/개척지 전용이면 지정 (churches FK, 전역 기본 라인이면 NULL)")
    private Long churchId;

    @Column(name = "department_id")
    @Comment("적용 범위 - 특정 부서 전용이면 지정 (departments FK)")
    private Long departmentId;

    @Column(name = "name", nullable = false, length = 100)
    @Comment("결재라인 이름 (관리자 식별용)")
    private String name;

    @Column(name = "is_active", nullable = false)
    @Comment("활성화 여부 - 비활성 라인은 결재자 해석 시 후보에서 제외")
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    @Comment("생성 일시")
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    @Comment("수정 일시")
    private ZonedDateTime updatedAt;
}
