package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;

/**
 * 전도 섹션 "계획" 탭 — 교회별 자유 양식(제목/내용) 메모 항목 엔티티.
 */
@Entity
@Table(name = "evangelism_plan_items", schema = "overseas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("전도 섹션 계획(자유 양식 메모) 항목 테이블")
public class EvangelismPlanItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    @Comment("계획 항목 고유 PK")
    private Long id;

    @Column(name = "church_name", nullable = false, length = 100)
    @Comment("해외교회/지역/개척지 명칭")
    private String churchName;

    @Column(name = "title", length = 255)
    @Comment("제목")
    private String title;

    @Column(name = "content", columnDefinition = "TEXT")
    @Comment("내용")
    private String content;

    @Column(name = "sort_order")
    @Comment("표시 순서")
    private Integer sortOrder;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    @Comment("소프트 삭제 여부 (삭제해도 DB row는 유지)")
    private Boolean isDeleted = false;

    @Column(name = "updated_by", length = 50)
    @Comment("최종 수정자 아이디/이름")
    private String updatedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    @Comment("생성 일시")
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    @Comment("최종 수정 일시")
    private ZonedDateTime updatedAt;
}
