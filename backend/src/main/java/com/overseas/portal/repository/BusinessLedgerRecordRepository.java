package com.overseas.portal.repository;

import com.overseas.portal.domain.BusinessLedgerRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BusinessLedgerRecordRepository extends JpaRepository<BusinessLedgerRecord, Long> {
    List<BusinessLedgerRecord> findAllByYear(Integer year);
    void deleteAllByYearAndMonth(Integer year, Integer month);
    void deleteAllByYear(Integer year);
}
