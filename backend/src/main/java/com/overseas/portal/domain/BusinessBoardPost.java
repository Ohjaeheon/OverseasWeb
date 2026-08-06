package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.CreationTimestamp;

import java.time.ZonedDateTime;

/**
 * 업무포탈 통합 게시판 엔티티
 */
@Entity
@Table(name = "business_board_posts", schema = "overseas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("업무포탈 통합 게시판 테이블")
public class BusinessBoardPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "post_id")
    @Comment("게시글 고유 ID")
    private Long id;

    @Column(name = "category", nullable = false, length = 100)
    @Comment("카테고리 구분")
    private String category;

    @Column(name = "title", nullable = false, length = 255)
    @Comment("게시글 제목")
    private String title;

    @Column(name = "content", columnDefinition = "TEXT")
    @Comment("메모 및 본문 내용")
    private String content;

    @Column(name = "file_name", length = 255)
    @Comment("첨부파일 원본 명칭")
    private String fileName;

    @Column(name = "file_path", length = 500)
    @Comment("서버 저장 첨부파일 경로")
    private String filePath;

    @Column(name = "file_size")
    @Comment("첨부파일 용량 (Byte)")
    private Long fileSize;

    @Column(name = "author", nullable = false, length = 100)
    @Comment("작성자 아이디 (username)")
    private String author;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    @Comment("작성 일시")
    private ZonedDateTime createdAt;

    @Column(name = "view_count", nullable = false)
    @Builder.Default
    @Comment("조회수")
    private Integer viewCount = 0;

    @Column(name = "is_locked", nullable = false)
    @Builder.Default
    @Comment("수정 잠금 여부")
    private Boolean isLocked = false;

    @Column(name = "notice_type", length = 50)
    @Builder.Default
    @Comment("공지사항 유형 (MUST_READ, NOTICE, GENERAL)")
    private String noticeType = "GENERAL";

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private java.util.List<BusinessBoardAttachment> attachments = new java.util.ArrayList<>();
}
