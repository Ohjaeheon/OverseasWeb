package com.overseas.portal.repository;

import com.overseas.portal.domain.WorshipRegionMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorshipRegionMappingRepository extends JpaRepository<WorshipRegionMapping, Long> {
    List<WorshipRegionMapping> findAllByOrderByRegionNoAsc();
    List<WorshipRegionMapping> findAllByIsActiveTrueOrderByRegionNoAsc();
    Optional<WorshipRegionMapping> findByRegionNo(Integer regionNo);
    boolean existsByRegionNo(Integer regionNo);
}
