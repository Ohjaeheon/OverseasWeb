package com.overseas.portal.repository;

import com.overseas.portal.domain.EvangelismMonthlyActivity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EvangelismMonthlyActivityRepository extends JpaRepository<EvangelismMonthlyActivity, Long> {
    List<EvangelismMonthlyActivity> findByChurchNameAndYearStr(String churchName, String yearStr);
}
