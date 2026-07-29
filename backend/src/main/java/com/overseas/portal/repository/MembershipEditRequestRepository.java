package com.overseas.portal.repository;

import com.overseas.portal.domain.MembershipEditRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MembershipEditRequestRepository extends JpaRepository<MembershipEditRequest, Long> {

    List<MembershipEditRequest> findByStatus(String status);

    List<MembershipEditRequest> findByStatusIn(List<String> statuses);

    List<MembershipEditRequest> findByRequestedToAndStatus(String requestedTo, String status);

    List<MembershipEditRequest> findByRequestedToAndStatusIn(String requestedTo, List<String> statuses);

    List<MembershipEditRequest> findByChurchNameAndYearStrAndMonthKeyAndStatus(
            String churchName, String yearStr, String monthKey, String status);
}
