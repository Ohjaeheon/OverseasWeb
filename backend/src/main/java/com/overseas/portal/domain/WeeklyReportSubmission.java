package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;

/**
 * 주간보고 사용자 제출 데이터 엔티티.
 * 대상 주차(reportYear/reportMonth/reportWeekOfMonth)는 제출건 자체에 저장한다 —
 * 양식(schema)은 여러 주차에 걸쳐 재사용될 수 있으므로 유니크 제약의 기준이 될 수 없다.
 */
@Entity
@Table(name = "weekly_report_submissions", schema = "overseas",
        uniqueConstraints = @UniqueConstraint(name = "uq_report_week_church",
                columnNames = {"report_year", "report_month", "report_week_of_month", "church_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("주간보고 사용자 제출 데이터")
public class WeeklyReportSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "submission_id")
    @Comment("제출 고유 PK")
    private Long submissionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "schema_id", nullable = false)
    @Comment("제출 당시 적용된 양식 스키마 FK (이력 보존)")
    private WeeklyReportSchema schema;

    @Column(name = "report_year", nullable = false)
    @Comment("보고 대상 연도")
    private Integer reportYear;

    @Column(name = "report_month", nullable = false)
    @Comment("보고 대상 월 (1-12)")
    private Integer reportMonth;

    @Column(name = "report_week_of_month", nullable = false)
    @Comment("보고 대상 월내 주차 (1-5)")
    private Integer reportWeekOfMonth;

    @Column(name = "church_id")
    @Comment("교회 FK (삭제 시 null 유지)")
    private Long churchId;

    @Column(name = "church_name", nullable = false, length = 150)
    @Comment("교회명 (이력 보존용)")
    private String churchName;

    @Column(name = "submitted_by", length = 100)
    @Comment("제출자 username")
    private String submittedBy;

    @Column(name = "submit_data_json", nullable = false, columnDefinition = "TEXT")
    @Comment("실제 입력 데이터 JSON")
    private String submitDataJson;

    @Column(name = "photo_paths", columnDefinition = "TEXT")
    @Comment("첨부 이미지 경로 목록 (JSON 배열)")
    private String photoPaths;

    @Column(name = "status", length = 20)
    @Comment("제출 상태 (SUBMITTED, REVISED)")
    @Builder.Default
    private String status = "SUBMITTED";

    @CreationTimestamp
    @Column(name = "submitted_at", updatable = false)
    @Comment("최초 제출 일시")
    private ZonedDateTime submittedAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    @Comment("수정 일시")
    private ZonedDateTime updatedAt;
}
