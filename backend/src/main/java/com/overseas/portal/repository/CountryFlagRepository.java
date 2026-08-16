package com.overseas.portal.repository;

import com.overseas.portal.domain.CountryFlag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CountryFlagRepository extends JpaRepository<CountryFlag, String> {
}
