package com.overseas.portal.repository;

import com.overseas.portal.domain.ApprovalInstanceStep;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ApprovalInstanceStepRepository extends JpaRepository<ApprovalInstanceStep, Long> {
    List<ApprovalInstanceStep> findByInstanceIdOrderByStepOrderAsc(Long instanceId);
}
