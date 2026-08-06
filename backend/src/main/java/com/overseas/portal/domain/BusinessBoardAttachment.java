package com.overseas.portal.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

/**
 * 게시글 첨부파일 엔티티
 */
@Entity
@Table(name = "business_board_attachments", schema = "overseas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("통합 게시판 첨부파일 테이블")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class BusinessBoardAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "attachment_id")
    @Comment("첨부파일 고유 ID")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id")
    @org.hibernate.annotations.OnDelete(action = org.hibernate.annotations.OnDeleteAction.CASCADE)
    @JsonIgnore
    private BusinessBoardPost post;

    @Column(name = "doc_type", nullable = false, length = 50)
    @Comment("문서 유형 (PROPOSAL, MINUTES, ETC)")
    private String docType;

    @Column(name = "file_name", nullable = false, length = 255)
    @Comment("첨부파일 원본 명칭")
    private String fileName;

    @Column(name = "file_path", nullable = false, length = 500)
    @Comment("서버 저장 첨부파일 경로")
    private String filePath;

    @Column(name = "file_size", nullable = false)
    @Comment("첨부파일 용량 (Byte)")
    private Long fileSize;
}
