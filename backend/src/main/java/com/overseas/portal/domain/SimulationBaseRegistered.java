package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;

@Entity
@Table(name = "simulation_base_registered", schema = "overseas")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@IdClass(SimulationBaseRegistered.SimulationBaseId.class)
@Comment("등수예상 시뮬레이션 연도별 기준 재적수")
public class SimulationBaseRegistered {

    @Id
    @Column(name = "sim_year", nullable = false)
    private Integer simYear;

    @Id
    @Column(name = "center_name", nullable = false, length = 100)
    private String centerName;

    @Column(name = "base_registered", nullable = false)
    @Comment("기준 재적수")
    private Integer baseRegistered;

    @Column(name = "use_prev_auto")
    @Comment("TRUE: 전년말 재적 자동 계산, FALSE: 직접 입력")
    private Boolean usePrevAuto;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;

    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class SimulationBaseId implements java.io.Serializable {
        private Integer simYear;
        private String centerName;
    }
}
