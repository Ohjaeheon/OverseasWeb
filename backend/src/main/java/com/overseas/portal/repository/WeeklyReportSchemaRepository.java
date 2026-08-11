package com.overseas.portal.repository;

import com.overseas.portal.domain.WeeklyReportSchema;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WeeklyReportSchemaRepository extends JpaRepository<WeeklyReportSchema, Long> {

    List<WeeklyReportSchema> findAllByOrderByCreatedAtDesc();

    Optional<WeeklyReportSchema> findByIsActiveTrue();

    @Modifying
    @Query("UPDATE WeeklyReportSchema s SET s.isActive = false WHERE s.isActive = true")
    void deactivateAll();
}
