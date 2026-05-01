package com.corecity.property.repository;

import com.corecity.property.entity.PropertyLifecycle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PropertyLifecycleRepository extends JpaRepository<PropertyLifecycle, Long> {

    /** Most recent ACTIVE lifecycle for a property — used to display countdown to the buyer. */
    Optional<PropertyLifecycle> findTopByPropertyIdAndStatusOrderByCreatedAtDesc(
            Long propertyId, String status);

    /** Most recent lifecycle for a specific buyer+property (any status) — used in enriched response. */
    Optional<PropertyLifecycle> findTopByPropertyIdAndUserIdOrderByCreatedAtDesc(
            Long propertyId, Long userId);

    /** All ACTIVE lifecycles whose end_time has passed — used by the expiry scheduler. */
    @Query("SELECT l FROM PropertyLifecycle l WHERE l.status = 'ACTIVE' AND l.endTime IS NOT NULL AND l.endTime < :now")
    List<PropertyLifecycle> findExpiredActive(@Param("now") LocalDateTime now);
}
