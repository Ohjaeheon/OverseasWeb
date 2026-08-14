package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;

@Entity
@Table(name = "worship_region_mapping", schema = "overseas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("주간예배출결 취합 - 지역 번호 ↔ 표시명 매핑")
public class WorshipRegionMapping {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "mapping_id")
    @Comment("매핑 고유 번호 PK")
    private Long mappingId;

    @Column(name = "region_no", nullable = false, unique = true)
    @Comment("지역 파일/템플릿 시트 번호 접두사")
    private Integer regionNo;

    @Column(name = "display_name", nullable = false, length = 100)
    @Comment("관리자 화면에 표시할 지역명")
    private String displayName;

    @Builder.Default
    @Column(name = "is_active")
    @Comment("현재 사용 중인 지역 여부")
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;
}
