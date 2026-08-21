package com.overseas.portal.repository;

import com.overseas.portal.domain.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, Long> {
    List<Department> findByChurchIdOrderByNameAsc(Long churchId);
}
