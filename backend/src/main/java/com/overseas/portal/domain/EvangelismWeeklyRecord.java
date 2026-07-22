package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;

/**
 * 주차별/부서별 전도 · 가개강 실적 기록 엔티티 (PostgreSQL DB 연동)
 */
@Entity
@Table(name = "evangelism_weekly_records", schema = "overseas",
       uniqueConstraints = {@UniqueConstraint(name = "uq_church_year_week_dept", columnNames = {"church_name", "year_str", "week_key", "department"})})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("주차별 부서 전도/복음방/가개강 실적 및 탈락 기록 테이블")
public class EvangelismWeeklyRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "record_id")
    @Comment("주차 실적 기록 고유 PK")
    private Long recordId;

    @Column(name = "church_name", nullable = false, length = 100)
    @Comment("해외교회/지역/개척지 명칭")
    private String churchName;

    @Column(name = "year_str", nullable = false, length = 10)
    @Comment("연도 (예: 2026년)")
    private String yearStr;

    @Column(name = "week_key", nullable = false, length = 20)
    @Comment("주차 키 (예: 7월3주차)")
    private String weekKey;

    @Column(name = "department", nullable = false, length = 30)
    @Comment("부서 (교역자, 자문회, 장년회, 부녀회, 청년회)")
    private String department;

    @Column(name = "reg_count")
    @Comment("전도재적 수")
    private Integer regCount;

    @Column(name = "find_count")
    @Comment("찾기(전도접촉) 성공 수")
    private Integer findCount;

    @Column(name = "find_drop_count")
    @Comment("찾기 탈락 수")
    private Integer findDropCount;

    @Column(name = "gospel_count")
    @Comment("복음방 수강 성공 수")
    private Integer gospelCount;

    @Column(name = "gospel_drop_count")
    @Comment("복음방 탈락 수")
    private Integer gospelDropCount;

    @Column(name = "admit_count")
    @Comment("가개강 등록 성공 수")
    private Integer admitCount;

    @Column(name = "admit_drop_count")
    @Comment("가개강 탈락 수")
    private Integer admitDropCount;

    @Column(name = "updated_by", length = 50)
    @Comment("최종 수정자 아이디/이름")
    private String updatedBy;

    @UpdateTimestamp
    @Column(name = "updated_at")
    @Comment("최종 수정 일시")
    private ZonedDateTime updatedAt;
}
