package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;

/**
 * 홈 화면 등 대시보드 카테고리(예: 해외선교부 현황판)별 그래프 구성 설정.
 * 관리자가 그래프 카드(제목/종류/집계기준/표시 지표)를 정의하며,
 * 값은 JSON 배열 문자열 그대로 저장하고 프론트에서 해석/렌더링한다.
 */
@Entity
@Table(name = "graph_configs", schema = "overseas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("대시보드 카테고리별 그래프 구성 설정 (JSON)")
public class GraphConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "graph_config_id")
    @Comment("설정 고유 PK")
    private Long graphConfigId;

    @Column(name = "category_key", nullable = false, unique = true, length = 50)
    @Comment("대상 카테고리 키 (예: overseas_board_home)")
    private String categoryKey;

    @Column(name = "graphs_json", nullable = false, columnDefinition = "TEXT")
    @Comment("그래프 카드 구성 JSON 배열 (제목/종류/집계기준/지표 포함)")
    private String graphsJson;

    @Column(name = "updated_by", length = 100)
    @Comment("마지막 수정 관리자 username")
    private String updatedBy;

    @UpdateTimestamp
    @Column(name = "updated_at")
    @Comment("수정 일시")
    private ZonedDateTime updatedAt;
}
