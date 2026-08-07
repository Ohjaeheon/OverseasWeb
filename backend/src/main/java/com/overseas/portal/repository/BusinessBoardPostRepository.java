package com.overseas.portal.repository;

import com.overseas.portal.domain.BusinessBoardPost;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BusinessBoardPostRepository extends JpaRepository<BusinessBoardPost, Long> {

    @EntityGraph(attributePaths = {"attachments", "referrers"})
    @Query("SELECT p FROM BusinessBoardPost p WHERE p.category = :category " +
           "ORDER BY CASE p.noticeType WHEN 'MUST_READ' THEN 1 WHEN 'NOTICE' THEN 2 ELSE 3 END ASC, " +
           "p.createdAt DESC")
    List<BusinessBoardPost> findAllByCategoryForAdmin(@Param("category") String category);

    @EntityGraph(attributePaths = {"attachments", "referrers"})
    @Query("SELECT p FROM BusinessBoardPost p WHERE p.category = :category AND (" +
           "p.noticeType IN ('MUST_READ', 'NOTICE') " +
           "OR p.author = :username " +
           "OR EXISTS (SELECT 1 FROM p.referrers r WHERE r = :username)) " +
           "ORDER BY CASE p.noticeType WHEN 'MUST_READ' THEN 1 WHEN 'NOTICE' THEN 2 ELSE 3 END ASC, " +
           "p.createdAt DESC")
    List<BusinessBoardPost> findAllByCategoryForUser(
       @Param("category") String category,
       @Param("username") String username
    );

    @EntityGraph(attributePaths = {"attachments", "referrers"})
    Optional<BusinessBoardPost> findById(Long id);
}
