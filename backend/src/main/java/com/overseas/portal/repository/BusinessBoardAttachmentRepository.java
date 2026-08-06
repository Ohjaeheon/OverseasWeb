package com.overseas.portal.repository;

import com.overseas.portal.domain.BusinessBoardAttachment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * 게시글 첨부파일 Repository
 */
@Repository
public interface BusinessBoardAttachmentRepository extends JpaRepository<BusinessBoardAttachment, Long> {

    @EntityGraph(attributePaths = {"post"})
    Optional<BusinessBoardAttachment> findById(Long id);
}
