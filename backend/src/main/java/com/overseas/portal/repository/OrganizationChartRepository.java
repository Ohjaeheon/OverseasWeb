package com.overseas.portal.repository;

import com.overseas.portal.domain.OrganizationChart;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 해외교회 조직도 JPA 레포지토리
 */
@Repository
public interface OrganizationChartRepository extends JpaRepository<OrganizationChart, Long> {
}
