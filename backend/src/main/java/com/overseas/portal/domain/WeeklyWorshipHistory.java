package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.CreationTimestamp;

import java.time.ZonedDateTime;

@Entity
@Table(name = "weekly_worship_history", schema = "overseas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("주간예배출결 자동 취합 실행 이력")
public class WeeklyWorshipHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "history_id")
    @Comment("이력 고유 번호 PK")
    private Long historyId;

    @Column(name = "file_name", nullable = false, length = 255)
    @Comment("최초 업로드한 ZIP 파일명")
    private String fileName;

    @Column(name = "week_info", length = 100)
    @Comment("폴더명에서 추출된 주차 정보 (예: 6월4주)")
    private String weekInfo;

    @Column(name = "status", nullable = false, length = 20)
    @Comment("실행 상태 (SUCCESS, FAILED)")
    private String status;

    @Column(name = "logs", columnDefinition = "TEXT")
    @Comment("실행시 기록된 표준 출력 로그")
    private String logs;

    @Column(name = "uploaded_by", length = 50)
    @Comment("업로드 및 실행을 요청한 관리자 아이디")
    private String uploadedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    @Comment("실행 완료 일시")
    private ZonedDateTime createdAt;

    @Column(name = "original_zip_path", length = 500)
    @Comment("보관된 원본 ZIP 파일 상대 경로")
    private String originalZipPath;

    @Column(name = "merged_sunday_path", length = 500)
    @Comment("보관된 주일 취합 엑셀 상대 경로")
    private String mergedSundayPath;

    @Column(name = "merged_wednesday_path", length = 500)
    @Comment("보관된 수요 취합 엑셀 상대 경로")
    private String mergedWednesdayPath;

    @Column(name = "merged_zip_path", length = 500)
    @Comment("보관된 전체 결과물 통합 ZIP 상대 경로")
    private String mergedZipPath;
}
