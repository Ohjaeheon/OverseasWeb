package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.ZonedDateTime;

@Entity
@Table(name = "simulation_monthly_data", schema = "overseas",
       uniqueConstraints = {@UniqueConstraint(name = "uq_sim_monthly", columnNames = {"sim_year", "center_name", "month_num"})})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Comment("등수예상 시뮬레이션 연도별 월별 실적/예상 데이터")
public class SimulationMonthlyData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "sim_year", nullable = false)
    private Integer simYear;

    @Column(name = "center_name", nullable = false, length = 100)
    private String centerName;

    @Column(name = "month_num", nullable = false)
    @Comment("월 (1~12)")
    private Integer monthNum;

    @Column(name = "registered")
    @Comment("월말 재적수 (실적)")
    private Integer registered;

    @Column(name = "reg_count")
    @Comment("월 등록수 (실적)")
    private Integer regCount;

    @Column(name = "grad_count")
    @Comment("월 종강수 (실적)")
    private Integer gradCount;

    @Column(name = "growth_rate", precision = 6, scale = 2)
    @Comment("성장율 % (예상 입력 또는 역산)")
    private BigDecimal growthRate;

    @Column(name = "reg_rate", precision = 6, scale = 2)
    @Comment("등록율 % (예상 입력)")
    private BigDecimal regRate;

    @Column(name = "grad_rate", precision = 6, scale = 2)
    @Comment("종강율 % (예상 입력)")
    private BigDecimal gradRate;

    @Column(name = "is_forecast")
    @Comment("TRUE: 예상 데이터, FALSE: 실적")
    private Boolean isForecast;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;
}
