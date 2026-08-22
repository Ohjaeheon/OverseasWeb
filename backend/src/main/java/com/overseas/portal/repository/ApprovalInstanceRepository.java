package com.overseas.portal.repository;

import com.overseas.portal.domain.ApprovalInstance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ApprovalInstanceRepository extends JpaRepository<ApprovalInstance, Long> {
    Optional<ApprovalInstance> findByTargetTypeAndTargetId(String targetType, Long targetId);
    List<ApprovalInstance> findByTargetTypeAndStatus(String targetType, String status);
    List<ApprovalInstance> findByTargetTypeAndStatusIn(String targetType, List<String> statuses);
}
