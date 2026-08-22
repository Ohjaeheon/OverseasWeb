package com.overseas.portal.repository;

import com.overseas.portal.domain.ApprovalLineStep;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ApprovalLineStepRepository extends JpaRepository<ApprovalLineStep, Long> {
    List<ApprovalLineStep> findByApprovalLineIdOrderByStepOrderAsc(Long approvalLineId);
    void deleteByApprovalLineId(Long approvalLineId);
}
