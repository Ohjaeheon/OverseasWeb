package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;

@Entity
@Table(name = "simulation_chart_settings", schema = "overseas")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Comment("등수예상 시뮬레이션 차트/표시 설정 저장")
public class SimulationChartSettings {

    @Id
    @Column(name = "settings_key", length = 100)
    @Comment("설정 키 (예: default, user_id_123)")
    private String settingsKey;

    @Column(name = "settings_value", nullable = false, columnDefinition = "TEXT")
    @Comment("설정 값 (JSON 직렬화)")
    private String settingsValue;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;
}
