package com.corecity.user.repository;

import com.corecity.user.entity.AgentLoan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AgentLoanRepository extends JpaRepository<AgentLoan, Long> {

    List<AgentLoan> findByAgentIdOrderByCreatedAtDesc(Long agentId);

    Optional<AgentLoan> findBySubscriptionId(Long subscriptionId);

    List<AgentLoan> findByAgentIdAndStatus(Long agentId, AgentLoan.LoanStatus status);

    int countByAgentIdAndStatus(Long agentId, AgentLoan.LoanStatus status);
}
