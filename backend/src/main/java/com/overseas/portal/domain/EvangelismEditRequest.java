package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.CreationTimestamp;

import java.time.ZonedDateTime;

/**
 * 전도 실적 수정 요청 엔티티
 */
@Entity
@Table(name = "evangelism_edit_request", schema = "overseas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("전도 실적 수정 허용 요청 및 결재 내역")
public class EvangelismEditRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "request_id")
    @Comment("요청 PK")
    private Long requestId;

    @Column(name = "church_name", nullable = false, length = 100)
    @Comment("교회명")
    private String churchName;

    @Column(name = "year_str", nullable = false, length = 10)
    @Comment("연도")
    private String yearStr;

    @Column(name = "week_key", nullable = false, length = 20)
    @Comment("주차")
    private String weekKey;

    @Column(name = "reason", nullable = false, columnDefinition = "TEXT")
    @Comment("수정 사유")
    private String reason;

    @Column(name = "requested_by", nullable = false, length = 50)
    @Comment("요청자 username")
    private String requestedBy;

    @Column(name = "requested_to", nullable = false, length = 50)
    @Comment("대상 담당자 name")
    private String requestedTo;

    @Column(name = "status", nullable = false, length = 20)
    @Comment("상태: PENDING, APPROVED, REJECTED, USED")
    private String status;

    @CreationTimestamp
    @Column(name = "requested_at")
    @Comment("요청 일시")
    private ZonedDateTime requestedAt;

    @Column(name = "approved_at")
    @Comment("승인 일시")
    private ZonedDateTime approvedAt;

    @Column(name = "approver_comment", columnDefinition = "TEXT")
    @Comment("결재자 의견 및 반려 사유")
    private String approverComment;
}
