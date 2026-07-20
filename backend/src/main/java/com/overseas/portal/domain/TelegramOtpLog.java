package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.CreationTimestamp;

import java.time.ZonedDateTime;

/**
 * 텔레그램 OTP 2차 인증 로그 엔티티
 */
@Entity
@Table(name = "telegram_otp_log", schema = "overseas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("텔레그램 2차 인증 OTP 로그")
public class TelegramOtpLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "otp_id")
    @Comment("OTP 로그 PK")
    private Long otpId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @Comment("사용자 FK")
    private User user;

    @Column(name = "otp_code", nullable = false, length = 6)
    @Comment("6자리 난수 인증번호")
    private String otpCode;

    @Column(name = "expires_at", nullable = false)
    @Comment("OTP 인증 만료 시간")
    private ZonedDateTime expiresAt;

    @Column(name = "is_verified")
    @Comment("인증 완료 여부")
    @Builder.Default
    private Boolean isVerified = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    @Comment("생성 일시")
    private ZonedDateTime createdAt;
}
