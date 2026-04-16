package com.corecity.user.repository;

import com.corecity.user.entity.ReputationEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ReputationEventRepository extends JpaRepository<ReputationEvent, Long> {

    List<ReputationEvent> findByAgentIdOrderByCreatedAtDesc(Long agentId);

    @Query("SELECT COALESCE(SUM(e.points), 0) FROM ReputationEvent e WHERE e.agentId = :agentId AND e.negative = false")
    int sumPositivePoints(@Param("agentId") Long agentId);

    boolean existsByAgentIdAndNegativeTrue(Long agentId);
}
