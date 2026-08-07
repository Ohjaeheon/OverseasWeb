package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;

/**
 * 캘린더 일정 관리 정보 엔티티
 */
@Entity
@Table(name = "calendar_events", schema = "overseas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("캘린더 일정 관리 정보")
public class CalendarEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    @Comment("PK")
    private Long id;

    @Column(name = "title", nullable = false, length = 200)
    @Comment("일정 제목")
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    @Comment("일정 상세 설명")
    private String description;

    @Column(name = "start_date", nullable = false)
    @Comment("일정 시작 시간")
    private ZonedDateTime startDate;

    @Column(name = "end_date", nullable = false)
    @Comment("일정 종료 시간")
    private ZonedDateTime endDate;

    @Column(name = "creator_username", nullable = false, length = 50)
    @Comment("작성자 로그인 아이디")
    private String creatorUsername;

    @Column(name = "creator_name", nullable = false, length = 100)
    @Comment("작성자 실명")
    private String creatorName;

    @Column(name = "referenced_usernames", columnDefinition = "TEXT")
    @Comment("참조인 로그인 아이디 목록 (쉼표 구분)")
    private String referencedUsernames;

    @Column(name = "calendars", nullable = false, length = 255)
    @Comment("소속 캘린더 목록 (쉼표 구분, 예: MAIN, BUSINESS)")
    private String calendars;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    @Comment("생성 시각")
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    @Comment("수정 시각")
    private ZonedDateTime updatedAt;
}
