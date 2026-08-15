package com.overseas.portal.repository;

import com.overseas.portal.domain.WeeklyReportSchema;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WeeklyReportSchemaRepository extends JpaRepository<WeeklyReportSchema, Long> {

    List<WeeklyReportSchema> findAllByOrderByStartYearDescStartMonthDescStartWeekOfMonthDesc();

    List<WeeklyReportSchema> findAllByIsEnabledTrue();
}
