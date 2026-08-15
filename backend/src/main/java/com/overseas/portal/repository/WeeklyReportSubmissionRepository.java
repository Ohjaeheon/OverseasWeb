package com.overseas.portal.repository;

import com.overseas.portal.domain.WeeklyReportSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WeeklyReportSubmissionRepository extends JpaRepository<WeeklyReportSubmission, Long> {

    // open-in-view=false 환경에서 lazy schema 필드가 컨트롤러 직렬화 시점에 세션 밖에서 접근되지 않도록
    // 목록 조회 메서드는 명시적으로 schema를 함께 fetch한다.
    @Query("SELECT s FROM WeeklyReportSubmission s JOIN FETCH s.schema ORDER BY s.submittedAt DESC")
    List<WeeklyReportSubmission> findAllByOrderBySubmittedAtDesc();

    @Query("SELECT s FROM WeeklyReportSubmission s JOIN FETCH s.schema " +
            "WHERE s.reportYear = :year AND s.reportMonth = :month AND s.reportWeekOfMonth = :weekOfMonth " +
            "ORDER BY s.submittedAt DESC")
    List<WeeklyReportSubmission> findByReportYearAndReportMonthAndReportWeekOfMonthOrderBySubmittedAtDesc(
            Integer year, Integer month, Integer weekOfMonth);

    @Query("SELECT s FROM WeeklyReportSubmission s JOIN FETCH s.schema WHERE s.reportYear = :year " +
            "AND s.reportMonth = :month AND s.reportWeekOfMonth = :weekOfMonth AND s.churchId = :churchId")
    Optional<WeeklyReportSubmission> findByReportYearAndReportMonthAndReportWeekOfMonthAndChurchId(
            Integer year, Integer month, Integer weekOfMonth, Long churchId);

    @Query("SELECT s FROM WeeklyReportSubmission s JOIN FETCH s.schema WHERE s.submissionId = :submissionId")
    Optional<WeeklyReportSubmission> findByIdWithSchema(Long submissionId);

    @Query("SELECT s FROM WeeklyReportSubmission s JOIN FETCH s.schema WHERE s.churchId = :churchId " +
            "ORDER BY s.reportYear DESC, s.reportMonth DESC, s.reportWeekOfMonth DESC")
    List<WeeklyReportSubmission> findByChurchIdOrderByReportYearDescReportMonthDescReportWeekOfMonthDesc(Long churchId);

    List<WeeklyReportSubmission> findBySubmittedByOrderBySubmittedAtDesc(String submittedBy);
}
