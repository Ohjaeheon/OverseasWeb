package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.ZonedDateTime;

/**
 * 등수예상 시뮬레이션 입력값 엔티티
 */
@Entity
@Table(name = "simulation_inputs", schema = "overseas",
       uniqueConstraints = {@UniqueConstraint(name = "uq_simulation_center_month", columnNames = {"sim_year", "center_name", "month_num"})})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("등수예상 시뮬레이션 하반기 입력값 저장")
public class SimulationInput {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "sim_year", nullable = false)
    @Comment("시뮬레이션 대상 연도")
    private Integer simYear;

    @Column(name = "center_name", nullable = false, length = 100)
    @Comment("센터명 (지파명)")
    private String centerName;

    @Column(name = "month_num", nullable = false)
    @Comment("월 (7~12)")
    private Integer monthNum;

    @Column(name = "growth_rate", precision = 6, scale = 2)
    @Comment("성장율 입력값 (%)")
    private BigDecimal growthRate;

    @Column(name = "reg_rate", precision = 6, scale = 2)
    @Comment("등록율 입력값 (%)")
    private BigDecimal regRate;

    @Column(name = "grad_rate", precision = 6, scale = 2)
    @Comment("종강율 입력값 (%)")
    private BigDecimal gradRate;

    @Column(name = "note", columnDefinition = "TEXT")
    @Comment("비고")
    private String note;

    @Column(name = "updated_by", length = 100)
    @Comment("수정자")
    private String updatedBy;

    @UpdateTimestamp
    @Column(name = "updated_at")
    @Comment("수정 일시")
    private ZonedDateTime updatedAt;
}
