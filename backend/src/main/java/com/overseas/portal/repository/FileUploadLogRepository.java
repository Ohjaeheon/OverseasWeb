package com.overseas.portal.repository;

import com.overseas.portal.domain.FileUploadLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FileUploadLogRepository extends JpaRepository<FileUploadLog, Long> {

    @Query("SELECT f FROM FileUploadLog f WHERE " +
            "(:query IS NULL OR :query = '' OR " +
            "LOWER(f.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(f.username) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(f.fileName) LIKE LOWER(CONCAT('%', :query, '%'))) " +
            "ORDER BY f.createdAt DESC")
    List<FileUploadLog> findAllByQuery(@Param("query") String query);
}
