package com.overseas.portal.repository;

import com.overseas.portal.domain.EvangelismReportFieldMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EvangelismReportFieldMappingRepository extends JpaRepository<EvangelismReportFieldMapping, Long> {
    List<EvangelismReportFieldMapping> findAllByOrderByMappingIdAsc();
    List<EvangelismReportFieldMapping> findAllByIsEnabledTrue();
}
