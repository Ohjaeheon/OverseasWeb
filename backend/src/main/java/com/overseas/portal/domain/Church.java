package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.ZonedDateTime;

/**
 * 해외 교회, 지역, 개척지 마스터 엔티티
 */
@Entity
@Table(name = "churches", schema = "overseas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("해외교회, 지역, 개척지 마스터 정보")
public class Church {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "church_id")
    @Comment("교회 고유 PK")
    private Long churchId;

    @Column(name = "continent", nullable = false, length = 50)
    @Comment("대륙 구분 (아시아, 유럽, 아프리카, 북미, 남미, 오세아니아)")
    private String continent;

    @Column(name = "country", nullable = false, length = 100)
    @Comment("국가명 (한국어)")
    private String country;

    @Column(name = "jipa", nullable = false, length = 50)
    @Comment("소속 지파명 (맛디아, 서울, 무등, 베드로, 요한 등)")
    private String jipa;

    @Column(name = "gubun", nullable = false, length = 50)
    @Comment("구분 (교회, 지역, 개척지)")
    private String gubun;

    @Column(name = "name", nullable = false, length = 150)
    @Comment("교회/지역/개척지명")
    private String name;

    @Column(name = "leader_name", length = 100)
    @Comment("담임/담당자 이름")
    private String leaderName;

    @Column(name = "flight_time", length = 50)
    @Comment("한국(인천) 기준 직항 소요시간 (예: 6.3시간)")
    private String flightTime;

    @Column(name = "distance_km")
    @Comment("대권거리 (km)")
    private Integer distanceKm;

    @Column(name = "time_diff", length = 100)
    @Comment("현지 시각 / 시차 (예: 한국보다 4시간 느림)")
    private String timeDiff;

    @Column(name = "language", length = 100)
    @Comment("현지 언어 (예: 우르두어·영어)")
    private String language;

    @Column(name = "religion", length = 100)
    @Comment("주된 종교 (예: 이슬람교, 기독교)")
    private String religion;

    @Column(name = "lat", precision = 10, scale = 7)
    @Comment("위도 (Latitude)")
    private BigDecimal lat;

    @Column(name = "lon", precision = 10, scale = 7)
    @Comment("경도 (Longitude)")
    private BigDecimal lon;

    @Column(name = "is_active")
    @Comment("활성화 여부")
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    @Comment("생성 일시")
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    @Comment("수정 일시")
    private ZonedDateTime updatedAt;
}
