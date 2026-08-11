package com.overseas.portal.repository;

import com.overseas.portal.domain.WeeklyReportSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WeeklyReportSubmissionRepository extends JpaRepository<WeeklyReportSubmission, Long> {

    List<WeeklyReportSubmission> findBySchema_SchemaIdOrderBySubmittedAtDesc(Long schemaId);

    List<WeeklyReportSubmission> findAllByOrderBySubmittedAtDesc();

    Optional<WeeklyReportSubmission> findBySchema_SchemaIdAndChurchId(Long schemaId, Long churchId);

    List<WeeklyReportSubmission> findBySubmittedByOrderBySubmittedAtDesc(String submittedBy);
}
