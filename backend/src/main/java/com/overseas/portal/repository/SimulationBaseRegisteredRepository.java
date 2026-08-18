package com.overseas.portal.repository;

import com.overseas.portal.domain.SimulationBaseRegistered;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SimulationBaseRegisteredRepository
        extends JpaRepository<SimulationBaseRegistered, SimulationBaseRegistered.SimulationBaseId> {
    List<SimulationBaseRegistered> findBySimYear(Integer simYear);
    Optional<SimulationBaseRegistered> findBySimYearAndCenterName(Integer simYear, String centerName);
}
