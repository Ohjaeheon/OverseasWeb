package com.overseas.portal.repository;

import com.overseas.portal.domain.FileDownloadLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FileDownloadLogRepository extends JpaRepository<FileDownloadLog, Long> {

    @Query("SELECT f FROM FileDownloadLog f WHERE " +
            "(:query IS NULL OR :query = '' OR " +
            "LOWER(f.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(f.username) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(f.fileName) LIKE LOWER(CONCAT('%', :query, '%'))) " +
            "ORDER BY f.createdAt DESC")
    List<FileDownloadLog> findAllByQuery(@Param("query") String query);
}
