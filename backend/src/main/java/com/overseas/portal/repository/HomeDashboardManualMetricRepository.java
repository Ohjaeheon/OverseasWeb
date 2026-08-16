package com.overseas.portal.repository;

import com.overseas.portal.domain.HomeDashboardManualMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HomeDashboardManualMetricRepository extends JpaRepository<HomeDashboardManualMetric, Long> {

    List<HomeDashboardManualMetric> findByYearMonth(String yearMonth);

    Optional<HomeDashboardManualMetric> findByChurch_ChurchIdAndYearMonth(Long churchId, String yearMonth);
}
