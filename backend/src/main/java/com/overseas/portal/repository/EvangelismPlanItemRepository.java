package com.overseas.portal.repository;

import com.overseas.portal.domain.EvangelismPlanItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EvangelismPlanItemRepository extends JpaRepository<EvangelismPlanItem, Long> {
    List<EvangelismPlanItem> findByChurchNameOrderBySortOrderAscIdAsc(String churchName);
}
