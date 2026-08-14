package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.time.ZonedDateTime;

@Entity
@Table(name = "worship_template", schema = "overseas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("주간예배출결 취합 - 관리자가 업로드한 양식(템플릿) 파일 이력")
public class WorshipTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "template_id")
    @Comment("템플릿 고유 번호 PK")
    private Long templateId;

    @Column(name = "original_filename", nullable = false, length = 255)
    @Comment("업로드 당시 원본 파일명")
    private String originalFilename;

    @Column(name = "stored_path", nullable = false, length = 500)
    @Comment("서버에 보관된 상대 경로")
    private String storedPath;

    @Column(name = "region_count")
    @Comment("업로드 시점에 감지된 지역(시트) 개수 (참고용)")
    private Integer regionCount;

    @Builder.Default
    @Column(name = "is_active")
    @Comment("현재 취합에 사용 중인 활성 템플릿 여부")
    private Boolean isActive = false;

    @Column(name = "uploaded_by", length = 50)
    @Comment("업로드한 관리자 아이디")
    private String uploadedBy;

    @org.hibernate.annotations.CreationTimestamp
    @Column(name = "uploaded_at", updatable = false)
    private ZonedDateTime uploadedAt;
}
