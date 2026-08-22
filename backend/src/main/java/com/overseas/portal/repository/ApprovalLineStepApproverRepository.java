package com.overseas.portal.repository;

import com.overseas.portal.domain.ApprovalLineStepApprover;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ApprovalLineStepApproverRepository extends JpaRepository<ApprovalLineStepApprover, Long> {
    List<ApprovalLineStepApprover> findByStepIdOrderByIdAsc(Long stepId);
    void deleteByStepId(Long stepId);
}
