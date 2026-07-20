package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.CreationTimestamp;

import java.time.ZonedDateTime;

/**
 * 감사 및 활동 로그 엔티티
 */
@Entity
@Table(name = "audit_log", schema = "overseas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("사용자 및 관리자 활동 감사 로그")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id")
    @Comment("감사 로그 PK")
    private Long logId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @Comment("사용자 FK")
    private User user;

    @Column(name = "username", length = 50)
    @Comment("사용자 아이디")
    private String username;

    @Column(name = "action", nullable = false, length = 100)
    @Comment("수행된 작업 (LOGIN_SUCCESS, DATA_UPDATE 등)")
    private String action;

    @Column(name = "ip_address", length = 50)
    @Comment("접속 IP 주소")
    private String ipAddress;

    @Column(name = "details", columnDefinition = "TEXT")
    @Comment("상세 세부내용")
    private String details;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    @Comment("발생 일시")
    private ZonedDateTime createdAt;
}
