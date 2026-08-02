package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.CreationTimestamp;

import java.time.ZonedDateTime;

/**
 * 로그인 로그 감사 엔티티
 */
@Entity
@Table(name = "login_log", schema = "overseas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("로그인 감사 로그")
public class LoginLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    @Comment("PK")
    private Long id;

    @Column(name = "name", nullable = false, length = 100)
    @Comment("계정명 (사용자 실명)")
    private String name;

    @Column(name = "username", nullable = false, length = 50)
    @Comment("계정아이디 (로그인 아이디)")
    private String username;

    @Column(name = "ip_address", length = 50)
    @Comment("접속 IP 주소")
    private String ipAddress;

    @Column(name = "status", nullable = false, length = 20)
    @Comment("로그인 상태 (SUCCESS, FAILED)")
    private String status;

    @Column(name = "details", columnDefinition = "TEXT")
    @Comment("실패 사유 또는 로그인 정보")
    private String details;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    @Comment("로그인 시간")
    private ZonedDateTime createdAt;
}
