package com.corecity.notification.repository;

import com.corecity.notification.entity.AppNotification;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface AppNotificationRepository extends JpaRepository<AppNotification, Long> {

    List<AppNotification> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    long countByUserIdAndReadFalse(Long userId);

    List<AppNotification> findByUserIdAndReadFalse(Long userId);

    @Modifying
    @Query("UPDATE AppNotification n SET n.read = true WHERE n.userId = :userId AND n.read = false")
    int markAllReadForUser(Long userId);
}
