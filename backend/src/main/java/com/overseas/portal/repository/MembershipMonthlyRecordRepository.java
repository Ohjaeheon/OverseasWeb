package com.overseas.portal.repository;

import com.overseas.portal.domain.MembershipMonthlyRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MembershipMonthlyRecordRepository extends JpaRepository<MembershipMonthlyRecord, Long> {

    List<MembershipMonthlyRecord> findByChurchNameAndYearStrAndMonthKey(String churchName, String yearStr, String monthKey);

    List<MembershipMonthlyRecord> findByChurchNameAndYearStr(String churchName, String yearStr);

    List<MembershipMonthlyRecord> findByYearStr(String yearStr);

    List<MembershipMonthlyRecord> findByYearStrAndMonthKey(String yearStr, String monthKey);

    List<MembershipMonthlyRecord> findByChurchName(String churchName);
}
