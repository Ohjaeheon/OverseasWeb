package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;

/**
 * 월별/부서별 내무(재적/입교/출결) 실적 기록 엔티티 (PostgreSQL DB 연동)
 */
@Entity
@Table(name = "membership_monthly_records", schema = "overseas",
       uniqueConstraints = {@UniqueConstraint(name = "uq_church_year_month_dept", columnNames = {"church_name", "year_str", "month_key", "department"})})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("월별 부서 내무(회별/전도/출결 재적) 실적 기록 테이블")
public class MembershipMonthlyRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "record_id")
    @Comment("내무 실적 기록 고유 PK")
    private Long recordId;

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

    // (1) 회별 재적수
    @Column(name = "assembly_admit")
    @Comment("회별 재적 - 입교 수")
    private Integer assemblyAdmit;

    @Column(name = "assembly_accident")
    @Comment("회별 재적 - 사고 수")
    private Integer assemblyAccident;

    // (2) 전도 재적수
    @Column(name = "evang_increase")
    @Comment("전도 재적 - 증가 수")
    private Integer evangIncrease;

    @Column(name = "evang_decrease")
    @Comment("전도 재적 - 감소 수")
    private Integer evangDecrease;

    // (3) 출결 재적수
    @Column(name = "attend_increase")
    @Comment("출결 재적 - 증가 수")
    private Integer attendIncrease;

    @Column(name = "attend_decrease")
    @Comment("출결 재적 - 감소 수")
    private Integer attendDecrease;

    // 실시간 계산 및 전도재적 연동용 필드
    @Column(name = "calculated_evang_reg")
    @Comment("계산된 이번달 전도 재적수 (지난달 재적 + 증가 - 감소)")
    private Integer calculatedEvangReg;

    @Column(name = "updated_by", length = 50)
    @Comment("최종 수정자 아이디/이름")
    private String updatedBy;

    @UpdateTimestamp
    @Column(name = "updated_at")
    @Comment("최종 수정 일시")
    private ZonedDateTime updatedAt;
}
