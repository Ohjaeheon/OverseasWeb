package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;

/**
 * 진단 상세표 카테고리(①전도/②센터/④예배 등)별 컬럼(지표) 구성 설정.
 * 관리자가 컬럼 추가/순서/라벨/노출여부와 커스텀 수식 컬럼을 정의하며,
 * 값은 JSON 배열 문자열 그대로 저장하고 프론트에서 해석/렌더링한다.
 */
@Entity
@Table(name = "metric_column_configs", schema = "overseas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("진단 상세표 카테고리별 컬럼(지표)/수식 구성 설정 (JSON)")
public class MetricColumnConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "config_id")
    @Comment("설정 고유 PK")
    private Long configId;

    @Column(name = "category_key", nullable = false, unique = true, length = 50)
    @Comment("대상 카테고리 키 (diagnosisMetrics.ts의 CATS 키, 예: ①전도, ②센터)")
    private String categoryKey;

    @Column(name = "columns_json", nullable = false, columnDefinition = "TEXT")
    @Comment("컬럼 구성 JSON 배열 (system/custom 컬럼 정의, 순서/라벨/수식 포함)")
    private String columnsJson;

    @Column(name = "updated_by", length = 100)
    @Comment("마지막 수정 관리자 username")
    private String updatedBy;

    @UpdateTimestamp
    @Column(name = "updated_at")
    @Comment("수정 일시")
    private ZonedDateTime updatedAt;
}
