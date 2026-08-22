package com.overseas.portal.repository;

import com.overseas.portal.domain.ApprovalLine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ApprovalLineRepository extends JpaRepository<ApprovalLine, Long> {
    List<ApprovalLine> findByTargetTypeOrderByIdAsc(String targetType);
}
