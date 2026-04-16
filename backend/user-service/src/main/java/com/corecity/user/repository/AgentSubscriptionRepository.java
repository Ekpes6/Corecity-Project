package com.corecity.user.repository;

import com.corecity.user.entity.AgentSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AgentSubscriptionRepository extends JpaRepository<AgentSubscription, Long> {

    List<AgentSubscription> findByAgentIdOrderByCreatedAtDesc(Long agentId);

    Optional<AgentSubscription> findFirstByAgentIdAndStatusOrderByEndDateDesc(
            Long agentId, AgentSubscription.SubscriptionStatus status);

    /** Find all ACTIVE subscriptions that have passed their end date – for expiry scheduler. */
    @Query("SELECT s FROM AgentSubscription s WHERE s.status = 'ACTIVE' AND s.endDate < :today")
    List<AgentSubscription> findExpiredActive(@Param("today") LocalDate today);

    /** Count how many active subscriptions an agent has (should be 0 or 1). */
    int countByAgentIdAndStatus(Long agentId, AgentSubscription.SubscriptionStatus status);
}
