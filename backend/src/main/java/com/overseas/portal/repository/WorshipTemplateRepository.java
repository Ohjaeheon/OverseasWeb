package com.overseas.portal.repository;

import com.overseas.portal.domain.WorshipTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorshipTemplateRepository extends JpaRepository<WorshipTemplate, Long> {
    List<WorshipTemplate> findAllByOrderByUploadedAtDesc();
    Optional<WorshipTemplate> findByIsActiveTrue();
}
