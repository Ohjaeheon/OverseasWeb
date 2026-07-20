package com.overseas.portal.repository;

import com.overseas.portal.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByTelegramId(String telegramId);
    Optional<User> findByTelegramChatId(String telegramChatId);
    boolean existsByUsername(String username);
}
