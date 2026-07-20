package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;

/**
 * 시스템 설정 엔티티
 */
@Entity
@Table(name = "system_config", schema = "overseas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("시스템 설정 값 (텔레그램 봇 토큰 등)")
public class SystemConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "config_id")
    @Comment("설정 PK")
    private Long configId;

    @Column(name = "config_key", nullable = false, unique = true, length = 100)
    @Comment("설정 키")
    private String configKey;

    @Column(name = "config_value", nullable = false, columnDefinition = "TEXT")
    @Comment("설정 값")
    private String configValue;

    @Column(name = "description", length = 255)
    @Comment("설명")
    private String description;

    @UpdateTimestamp
    @Column(name = "updated_at")
    @Comment("수정 일시")
    private ZonedDateTime updatedAt;
}
