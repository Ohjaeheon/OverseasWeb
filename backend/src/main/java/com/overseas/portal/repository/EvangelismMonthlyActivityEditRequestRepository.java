package com.overseas.portal.repository;

import com.overseas.portal.domain.EvangelismMonthlyActivityEditRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EvangelismMonthlyActivityEditRequestRepository extends JpaRepository<EvangelismMonthlyActivityEditRequest, Long> {

    List<EvangelismMonthlyActivityEditRequest> findByChurchNameAndYearStrAndMonthKeyAndStatus(
            String churchName, String yearStr, String monthKey, String status);

    List<EvangelismMonthlyActivityEditRequest> findByRequestedByOrderByRequestedAtDesc(String requestedBy);
}
