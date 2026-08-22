package com.overseas.portal.repository;

import com.overseas.portal.domain.ApprovalInstanceApprover;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ApprovalInstanceApproverRepository extends JpaRepository<ApprovalInstanceApprover, Long> {
    List<ApprovalInstanceApprover> findByInstanceStepIdOrderByIdAsc(Long instanceStepId);
}
