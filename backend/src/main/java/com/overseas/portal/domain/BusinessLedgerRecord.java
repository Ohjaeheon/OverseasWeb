package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;

/**
 * 업무 원장헌금 실적 데이터 엔티티
 */
@Entity
@Table(name = "business_ledger_record", schema = "overseas",
        uniqueConstraints = @UniqueConstraint(columnNames = {"year", "month", "church_name"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("업무 원장헌금 실적 데이터")
public class BusinessLedgerRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    @Comment("PK")
    private Long id;

    @Column(name = "year", nullable = false)
    @Comment("연도")
    private Integer year;

    @Column(name = "month", nullable = false)
    @Comment("월")
    private Integer month;

    @Column(name = "church_name", nullable = false, length = 150)
    @Comment("해외교회/지역명")
    private String churchName;

    @Column(name = "amount", nullable = false)
    @Comment("헌금 금액")
    private Long amount;

    @Column(name = "report_date", length = 100)
    @Comment("기안일자")
    private String reportDate;

    @Column(name = "draft_user", length = 50)
    @Comment("기안자")
    private String draftUser;

    @Column(name = "expense_date", length = 100)
    @Comment("지출일자")
    private String expenseDate;

    @Column(name = "meeting_date", length = 150)
    @Comment("회의일시")
    private String meetingDate;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    @Comment("생성 시각")
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    @Comment("수정 시각")
    private ZonedDateTime updatedAt;
}
