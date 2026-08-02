package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.CreationTimestamp;

import java.time.ZonedDateTime;

/**
 * 접근 로그 감사 엔티티
 */
@Entity
@Table(name = "access_log", schema = "overseas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("접근 감사 로그")
public class AccessLog {

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

    @Column(name = "page_name", nullable = false, length = 150)
    @Comment("접근 페이지명")
    private String pageName;

    @Column(name = "path", nullable = false, length = 255)
    @Comment("접근 경로")
    private String path;

    @Column(name = "ip_address", length = 50)
    @Comment("접속 IP 주소")
    private String ipAddress;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    @Comment("접근 시각")
    private ZonedDateTime createdAt;
}
