package com.overseas.portal.repository;

import com.overseas.portal.domain.SimulationChartSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SimulationChartSettingsRepository extends JpaRepository<SimulationChartSettings, String> {
}
