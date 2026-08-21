package com.overseas.portal.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;

/**
 * 조직 계층 - 해외교회/지역/개척지(Church, /adminsetting/faith-records에서 관리하는 목록) 하위 부서.
 * 결재선 자동화 등 향후 조직 기반 기능의 토대이며, 기존 권한 그룹(roleService.ts)이나
 * User.assignedCountry(데이터 접근 범위)와는 무관하다.
 */
@Entity
@Table(name = "departments", schema = "overseas",
        uniqueConstraints = @UniqueConstraint(name = "uq_department_church_name", columnNames = {"church_id", "name"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Comment("조직 계층 - 해외교회/지역/개척지 하위 부서")
public class Department {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    @Comment("부서 고유 PK")
    private Long id;

    @Column(name = "church_id", nullable = false)
    @Comment("소속 해외교회/지역/개척지 church_id (churches FK, /adminsetting/faith-records 목록과 동일)")
    private Long churchId;

    @Column(name = "name", nullable = false, length = 100)
    @Comment("부서명")
    private String name;

    @Column(name = "leader_user_id")
    @Comment("부서장 user_id (users FK, 값은 서비스 계층에서 검증)")
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
