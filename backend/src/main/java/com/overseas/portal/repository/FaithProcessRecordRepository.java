package com.overseas.portal.repository;

import com.overseas.portal.domain.FaithProcessRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FaithProcessRecordRepository extends JpaRepository<FaithProcessRecord, Long> {

    List<FaithProcessRecord> findByYearMonth(String yearMonth);

    Optional<FaithProcessRecord> findByChurch_ChurchIdAndYearMonth(Long churchId, String yearMonth);

    @Query("SELECT f FROM FaithProcessRecord f JOIN FETCH f.church c WHERE f.yearMonth = :yearMonth")
    List<FaithProcessRecord> findAllWithChurchByYearMonth(@Param("yearMonth") String yearMonth);

    @Query("SELECT f FROM FaithProcessRecord f JOIN FETCH f.church c ORDER BY c.churchId ASC")
    List<FaithProcessRecord> findAllWithChurch();

    @Query("SELECT DISTINCT f.yearMonth FROM FaithProcessRecord f ORDER BY f.yearMonth DESC")
    List<String> findDistinctYearMonths();
}
