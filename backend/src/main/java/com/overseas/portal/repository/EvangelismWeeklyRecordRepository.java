package com.overseas.portal.repository;

import com.overseas.portal.domain.EvangelismWeeklyRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EvangelismWeeklyRecordRepository extends JpaRepository<EvangelismWeeklyRecord, Long> {

    List<EvangelismWeeklyRecord> findByChurchNameAndYearStrAndWeekKey(String churchName, String yearStr, String weekKey);

    List<EvangelismWeeklyRecord> findByChurchNameAndYearStr(String churchName, String yearStr);

    List<EvangelismWeeklyRecord> findByChurchName(String churchName);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT r.yearStr, r.weekKey FROM EvangelismWeeklyRecord r")
    List<Object[]> findDistinctYearAndWeeks();
}
