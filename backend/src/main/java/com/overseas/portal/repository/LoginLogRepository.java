package com.overseas.portal.repository;

import com.overseas.portal.domain.LoginLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LoginLogRepository extends JpaRepository<LoginLog, Long> {

    @Query("SELECT l FROM LoginLog l WHERE " +
            "(:query IS NULL OR :query = '' OR " +
            "LOWER(l.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(l.username) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(l.ipAddress) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(l.details) LIKE LOWER(CONCAT('%', :query, '%'))) " +
            "AND (:status = 'ALL' OR l.status = :status) " +
            "ORDER BY l.createdAt DESC")
    List<LoginLog> findAllByQueryAndStatus(@Param("query") String query, @Param("status") String status);
}
