package com.overseas.portal.repository;

import com.overseas.portal.domain.GraphConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GraphConfigRepository extends JpaRepository<GraphConfig, Long> {

    Optional<GraphConfig> findByCategoryKey(String categoryKey);
}
