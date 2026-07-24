package com.overseas.portal.repository;

import com.overseas.portal.domain.EvangelismEditRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EvangelismEditRequestRepository extends JpaRepository<EvangelismEditRequest, Long> {

    List<EvangelismEditRequest> findByStatus(String status);

    List<EvangelismEditRequest> findByRequestedToAndStatus(String requestedTo, String status);

    List<EvangelismEditRequest> findByChurchNameAndYearStrAndWeekKeyAndStatus(
            String churchName, String yearStr, String weekKey, String status);
}
