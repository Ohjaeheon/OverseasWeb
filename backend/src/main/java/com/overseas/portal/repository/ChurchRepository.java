package com.overseas.portal.repository;

import com.overseas.portal.domain.Church;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChurchRepository extends JpaRepository<Church, Long> {
    List<Church> findByIsActiveTrue();
    List<Church> findByContinentAndIsActiveTrue(String continent);
    Optional<Church> findByName(String name);
}
