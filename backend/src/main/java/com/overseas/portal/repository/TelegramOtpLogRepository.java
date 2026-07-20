package com.overseas.portal.repository;

import com.overseas.portal.domain.TelegramOtpLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TelegramOtpLogRepository extends JpaRepository<TelegramOtpLog, Long> {
    Optional<TelegramOtpLog> findTopByUser_UserIdAndIsVerifiedFalseOrderByCreatedAtDesc(Long userId);
}
