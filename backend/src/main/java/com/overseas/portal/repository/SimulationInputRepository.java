package com.overseas.portal.repository;

import com.overseas.portal.domain.SimulationInput;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SimulationInputRepository extends JpaRepository<SimulationInput, Long> {
    List<SimulationInput> findBySimYear(Integer simYear);
    List<SimulationInput> findBySimYearAndCenterName(Integer simYear, String centerName);
    Optional<SimulationInput> findBySimYearAndCenterNameAndMonthNum(Integer simYear, String centerName, Integer monthNum);
}
