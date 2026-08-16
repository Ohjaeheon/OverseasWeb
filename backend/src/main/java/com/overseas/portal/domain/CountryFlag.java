package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;

/**
 * 관리자가 직접 등록한 국가별 국기 이미지. 내장 기본 국기(FLAG_IMAGES)보다 우선 사용된다.
 */
@Entity
@Table(name = "country_flags", schema = "overseas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("관리자 등록 국가별 국기 이미지")
public class CountryFlag {

    @Id
    @Column(name = "country", length = 100)
    @Comment("국가명 (한국어)")
    private String country;

    @Column(name = "image_data_url", nullable = false, columnDefinition = "TEXT")
    @Comment("국기 이미지 (data URL, base64)")
    private String imageDataUrl;

    @Column(name = "updated_by", length = 100)
    @Comment("마지막 수정 관리자 username")
    private String updatedBy;

    @UpdateTimestamp
    @Column(name = "updated_at")
    @Comment("수정 일시")
    private ZonedDateTime updatedAt;
}
