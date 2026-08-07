package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.time.ZonedDateTime;

/**
 * 해외교회 조직도 엔티티
 */
@Entity
@Table(name = "organization_charts", schema = "overseas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("해외교회 조직도 정보")
public class OrganizationChart {

    @Id
    @Column(name = "church_id")
    @Comment("교회 고유 PK")
    private Long churchId;

    @Column(name = "chart_data", columnDefinition = "TEXT")
    @Comment("조직도 트리 및 하이라커 JSON 데이터")
    private String chartData;

    @Column(name = "updated_at")
    @Comment("수정 일시")
    private ZonedDateTime updatedAt;
}
