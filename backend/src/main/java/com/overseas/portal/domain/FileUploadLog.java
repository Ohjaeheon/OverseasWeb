package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.CreationTimestamp;

import java.time.ZonedDateTime;

/**
 * 파일 업로드 감사 로그 엔티티
 */
@Entity
@Table(name = "file_upload_log", schema = "overseas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("파일 업로드 감사 로그")
public class FileUploadLog {

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

    @Column(name = "file_name", nullable = false, length = 255)
    @Comment("업로드된 파일명")
    private String fileName;

    @Column(name = "file_size", nullable = false)
    @Comment("업로드된 파일 용량 (Byte)")
    private Long fileSize;

    @Column(name = "ip_address", length = 50)
    @Comment("접속 IP 주소")
    private String ipAddress;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    @Comment("업로드 시각")
    private ZonedDateTime createdAt;
}
