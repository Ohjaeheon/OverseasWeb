package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;

/**
 * 주간보고 주차별 양식 스키마 엔티티
 */
@Entity
@Table(name = "weekly_report_schemas", schema = "overseas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("주간보고 주차별 동적 양식 스키마 (JSON)")
public class WeeklyReportSchema {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "schema_id")
    @Comment("스키마 고유 PK")
    private Long schemaId;

    @Column(name = "week_label", nullable = false, length = 100)
    @Comment("표시 주차명 (예: 2026년 8월 2주차)")
    private String weekLabel;

    @Column(name = "year", nullable = false)
    @Comment("해당 연도")
    private Integer year;

    @Column(name = "week_number", nullable = false)
    @Comment("연도 내 주차 번호")
    private Integer weekNumber;

    @Column(name = "form_schema_json", nullable = false, columnDefinition = "TEXT")
    @Comment("양식 구조 JSON (Page별 섹션/필드 정의)")
    private String formSchemaJson;

    @Column(name = "is_active")
    @Comment("현재 활성 양식 여부")
    @Builder.Default
    private Boolean isActive = false;

    @Column(name = "created_by", length = 100)
    @Comment("양식 생성 관리자 username")
    private String createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    @Comment("생성 일시")
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    @Comment("수정 일시")
    private ZonedDateTime updatedAt;
}
