package com.overseas.portal.repository;

import com.overseas.portal.domain.SimulationMonthlyData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SimulationMonthlyDataRepository extends JpaRepository<SimulationMonthlyData, Long> {
    List<SimulationMonthlyData> findBySimYear(Integer simYear);
    List<SimulationMonthlyData> findBySimYearAndCenterName(Integer simYear, String centerName);
    Optional<SimulationMonthlyData> findBySimYearAndCenterNameAndMonthNum(Integer simYear, String centerName, Integer monthNum);
    void deleteBySimYearAndCenterNameAndMonthNum(Integer simYear, String centerName, Integer monthNum);
}
