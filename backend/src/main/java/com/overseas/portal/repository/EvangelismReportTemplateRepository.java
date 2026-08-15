package com.overseas.portal.repository;

import com.overseas.portal.domain.EvangelismReportTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EvangelismReportTemplateRepository extends JpaRepository<EvangelismReportTemplate, Long> {
    List<EvangelismReportTemplate> findAllByOrderByUploadedAtDesc();
    Optional<EvangelismReportTemplate> findByIsActiveTrue();
}
