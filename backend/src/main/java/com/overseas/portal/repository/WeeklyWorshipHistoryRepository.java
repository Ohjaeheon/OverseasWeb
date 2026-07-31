package com.overseas.portal.repository;

import com.overseas.portal.domain.WeeklyWorshipHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WeeklyWorshipHistoryRepository extends JpaRepository<WeeklyWorshipHistory, Long> {
    List<WeeklyWorshipHistory> findAllByOrderByCreatedAtDesc();
}
