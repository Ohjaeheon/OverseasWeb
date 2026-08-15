package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;

/**
 * 주간보고 주차별 양식 스키마 엔티티.
 * 특정 "적용 시작 주차"(startYear/startMonth/startWeekOfMonth)부터 다음 스키마의
 * 시작 주차 전까지 자동으로 적용되는 구간형 양식.
 */
@Entity
@Table(name = "weekly_report_schemas", schema = "overseas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("주간보고 주차구간별 동적 양식 스키마 (JSON)")
public class WeeklyReportSchema {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "schema_id")
    @Comment("스키마 고유 PK")
    private Long schemaId;

    @Column(name = "week_label", nullable = false, length = 100)
    @Comment("표시용 라벨 (예: 2026년 8월 2주차부터)")
    private String weekLabel;

    @Column(name = "start_year", nullable = false)
    @Comment("이 양식이 적용되기 시작하는 연도")
    private Integer startYear;

    @Column(name = "start_month", nullable = false)
    @Comment("이 양식이 적용되기 시작하는 월 (1-12)")
    private Integer startMonth;

    @Column(name = "start_week_of_month", nullable = false)
    @Comment("이 양식이 적용되기 시작하는 월내 주차 (1-5)")
    private Integer startWeekOfMonth;

    @Column(name = "form_schema_json", nullable = false, columnDefinition = "TEXT")
    @Comment("양식 구조 JSON (Page별 섹션/필드 정의)")
    private String formSchemaJson;

    @Column(name = "is_enabled")
    @Comment("사용 여부 (여러 개 동시에 켜둘 수 있으며, 대상 주차에 가장 가까운 시작주차의 양식이 자동 적용됨)")
    @Builder.Default
    private Boolean isEnabled = true;

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

    @Transient
    public int sortKey() {
        return startYear * 1000 + startMonth * 100 + startWeekOfMonth;
    }
}
