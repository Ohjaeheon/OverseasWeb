package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;

/**
 * 전도 섹션 "월간보고" 탭 — 교회·부서별 월간 활동자수/교사수 기록 엔티티.
 */
@Entity
@Table(name = "evangelism_monthly_activities", schema = "overseas",
       uniqueConstraints = {@UniqueConstraint(name = "uq_evang_activity_church_year_month_dept", columnNames = {"church_name", "year_str", "month_key", "department"})})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("전도 섹션 월간보고(부서별 활동자수/교사수) 기록 테이블")
public class EvangelismMonthlyActivity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    @Comment("월간보고 기록 고유 PK")
    private Long id;

    @Column(name = "church_name", nullable = false, length = 100)
    @Comment("해외교회/지역/개척지 명칭")
    private String churchName;

    @Column(name = "year_str", nullable = false, length = 10)
    @Comment("연도 (예: 2026년)")
    private String yearStr;

    @Column(name = "month_key", nullable = false, length = 20)
    @Comment("월 키 (예: 7월)")
    private String monthKey;

    @Column(name = "department", nullable = false, length = 30)
    @Comment("부서 (교역자, 자문회, 장년회, 부녀회, 청년회)")
    private String department;

    @Column(name = "active_member_count")
    @Comment("활동자수")
    private Integer activeMemberCount;

    @Column(name = "teacher_count")
    @Comment("교사수")
    private Integer teacherCount;

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
