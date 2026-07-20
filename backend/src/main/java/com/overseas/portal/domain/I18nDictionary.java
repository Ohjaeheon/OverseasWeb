package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;

/**
 * 다국어 딕셔너리 엔티티
 */
@Entity
@Table(name = "i18n_dictionary", schema = "overseas",
       uniqueConstraints = {@UniqueConstraint(name = "uq_key_lang", columnNames = {"message_key", "lang_code"})})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("다국어 리소스 딕셔너리")
public class I18nDictionary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "dict_id")
    @Comment("사전 항목 PK")
    private Long dictId;

    @Column(name = "message_key", nullable = false, length = 150)
    @Comment("다국어 메시지 키")
    private String messageKey;

    @Column(name = "lang_code", nullable = false, length = 10)
    @Comment("언어 코드 (ko, en, th, zh, ja)")
    private String langCode;

    @Column(name = "message_value", nullable = false, columnDefinition = "TEXT")
    @Comment("번역 텍스트 값")
    private String messageValue;

    @Column(name = "category", length = 50)
    @Comment("카테고리 (UI, DIAGNOSIS, ADMIN)")
    @Builder.Default
    private String category = "GENERAL";

    @UpdateTimestamp
    @Column(name = "updated_at")
    @Comment("수정 일시")
    private ZonedDateTime updatedAt;
}
