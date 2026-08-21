package com.overseas.portal.repository;

import com.overseas.portal.domain.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {
    List<Team> findByDepartmentIdOrderByNameAsc(Long departmentId);
}
