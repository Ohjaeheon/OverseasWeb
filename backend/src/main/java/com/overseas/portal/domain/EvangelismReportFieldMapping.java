package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Entity
@Table(name = "evangelism_report_field_mapping", schema = "overseas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("전도 월말 보고서 - 템플릿 열과 데이터 소스 매핑 설정 (고정 7항목)")
public class EvangelismReportFieldMapping {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "mapping_id")
    @Comment("매핑 고유 번호 PK")
    private Long mappingId;

    @Column(name = "field_key", nullable = false, unique = true, length = 50)
    @Comment("필드 식별자 (BASE_REG, MONTHLY_ADMIT, YTD_ADMIT, CURRENT_ATTENDANCE, ACTIVE_TEACHER, CENTER_MONTHLY, CENTER_YTD)")
    private String fieldKey;

    @Column(name = "label", nullable = false, length = 100)
    @Comment("관리자 화면에 표시할 필드 설명")
    private String label;

    @Column(name = "column_letter", nullable = false, length = 2)
    @Comment("템플릿 시트 내 열 문자 (예: D, E, G)")
    private String columnLetter;

    @Builder.Default
    @Column(name = "data_source", nullable = false, length = 50)
    @Comment("데이터 소스 (MEMBERSHIP_PREV_DEC, EVANGELISM_MONTHLY_ADMIT, EVANGELISM_YTD_ADMIT, EVANGELISM_MONTHLY_TEACHER, NONE)")
    private String dataSource = "NONE";

    @Builder.Default
    @Column(name = "is_enabled")
    @Comment("이 필드를 실제로 채울지 여부 (보류 항목은 false)")
    private Boolean isEnabled = false;
}
