package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;

/**
 * 조직 계층 - 부서 하위 팀. 팀 없이 부서에만 소속되는 회원도 존재할 수 있다.
 */
@Entity
@Table(name = "teams", schema = "overseas",
        uniqueConstraints = @UniqueConstraint(name = "uq_team_department_name", columnNames = {"department_id", "name"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("조직 계층 - 부서 하위 팀")
public class Team {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    @Comment("팀 고유 PK")
    private Long id;

    @Column(name = "department_id", nullable = false)
    @Comment("소속 부서 department_id (departments FK)")
    private Long departmentId;

    @Column(name = "name", nullable = false, length = 100)
    @Comment("팀명")
    private String name;

    @Column(name = "leader_user_id")
    @Comment("팀장 user_id (users FK, 값은 서비스 계층에서 검증)")
    private Long leaderUserId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    @Comment("생성 일시")
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    @Comment("수정 일시")
    private ZonedDateTime updatedAt;
}
