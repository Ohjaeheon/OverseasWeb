package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.ZonedDateTime;

/**
 * 홈 화면 "해외선교부 현황판"의 등록/종강 관련 지표 중 아직 자동 연동이 없는 항목을
 * 관리자가 월별로 직접 입력해 두는 임시 테이블 (등록, 가개강대비등록률, 종강수, 등록대비종강률).
 */
@Entity
@Table(name = "home_dashboard_manual_metrics", schema = "overseas",
       uniqueConstraints = {@UniqueConstraint(name = "uq_home_dashboard_manual_church_month", columnNames = {"church_id", "year_month"})})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("해외선교부 현황판 - 등록/종강 수기입력 지표 (월별)")
public class HomeDashboardManualMetric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    @Comment("고유 PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "church_id", nullable = false)
    @Comment("해당 교회 FK")
    private Church church;

    @Column(name = "year_month", nullable = false, length = 7)
    @Comment("대상 연월 (형식: YYYY-MM)")
    private String yearMonth;

    @Column(name = "registration_count")
    @Comment("등록 (가개강 이후 정식 등록 인원)")
    private Integer registrationCount;

    @Column(name = "registration_rate", precision = 5, scale = 2)
    @Comment("가개강대비 등록률 (%, 수기입력)")
    private BigDecimal registrationRate;

    @Column(name = "graduation_count")
    @Comment("종강수")
    private Integer graduationCount;

    @Column(name = "graduation_rate", precision = 5, scale = 2)
    @Comment("등록대비 종강률 (%, 수기입력)")
    private BigDecimal graduationRate;

    @Column(name = "student_pre_open")
    @Comment("수강생현황 - 가개강 인원 (수기입력)")
    private Integer studentPreOpen;

    @Column(name = "student_elementary")
    @Comment("수강생현황 - 초등 인원 (수기입력)")
    private Integer studentElementary;

    @Column(name = "student_middle")
    @Comment("수강생현황 - 중등 인원 (수기입력)")
    private Integer studentMiddle;

    @Column(name = "student_high")
    @Comment("수강생현황 - 고등 인원 (수기입력)")
    private Integer studentHigh;

    @Column(name = "updated_by", length = 100)
    @Comment("마지막 수정 관리자 username")
    private String updatedBy;

    @UpdateTimestamp
    @Column(name = "updated_at")
    @Comment("수정 일시")
    private ZonedDateTime updatedAt;
}
