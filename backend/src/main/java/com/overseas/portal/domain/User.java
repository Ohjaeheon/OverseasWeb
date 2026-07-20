package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;

/**
 * 시스템 사용자 엔티티
 */
@Entity
@Table(name = "users", schema = "overseas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("시스템 사용자 및 텔레그램 연동 정보")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    @Comment("사용자 고유 PK")
    private Long userId;

    @Column(name = "username", nullable = false, unique = true, length = 50)
    @Comment("로그인 아이디")
    private String username;

    @Column(name = "password_hash", nullable = false, length = 255)
    @Comment("BCrypt 암호화된 비밀번호")
    private String passwordHash;

    @Column(name = "name", nullable = false, length = 100)
    @Comment("사용자 실명")
    private String name;

    @Column(name = "role", nullable = false, length = 50)
    @Comment("권한 (ROLE_ADMIN, ROLE_USER 등)")
    @Builder.Default
    private String role = "ROLE_USER";

    @Column(name = "assigned_country", length = 100)
    @Comment("담당 국가 데이터 접근 권한 (전체, 일본, 파키스탄 등)")
    @Builder.Default
    private String assignedCountry = "전체";

    @Column(name = "must_change_password")
    @Comment("초기비밀번호(gotjsqn) 사용 시 비밀번호 변경 필요 여부")
    @Builder.Default
    private Boolean mustChangePassword = false;

    @Column(name = "telegram_id", length = 100)
    @Comment("텔레그램 사용자 아이디 (@username)")
    private String telegramId;

    @Column(name = "telegram_chat_id", length = 100)
    @Comment("텔레그램 Chat ID (OTP 발송용)")
    private String telegramChatId;

    @Column(name = "is_active")
    @Comment("계정 활성화 상태")
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    @Comment("생성 일시")
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    @Comment("수정 일시")
    private ZonedDateTime updatedAt;
}
