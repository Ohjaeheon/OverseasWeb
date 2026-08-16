package com.overseas.portal.repository;

import com.overseas.portal.domain.MetricColumnConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MetricColumnConfigRepository extends JpaRepository<MetricColumnConfig, Long> {

    Optional<MetricColumnConfig> findByCategoryKey(String categoryKey);
}
