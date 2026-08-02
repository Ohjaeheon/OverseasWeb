package com.overseas.portal.repository;

import com.overseas.portal.domain.AccessLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AccessLogRepository extends JpaRepository<AccessLog, Long> {

    @Query("SELECT a FROM AccessLog a WHERE " +
            "(:query IS NULL OR :query = '' OR " +
            "LOWER(a.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(a.username) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(a.pageName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(a.path) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(a.ipAddress) LIKE LOWER(CONCAT('%', :query, '%'))) " +
            "ORDER BY a.createdAt DESC")
    List<AccessLog> findAllByQuery(@Param("query") String query);
}
