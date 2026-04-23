package com.corecity.user.repository;

import com.corecity.user.entity.AgentLoan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AgentLoanRepository extends JpaRepository<AgentLoan, Long> {

    List<AgentLoan> findByAgentIdOrderByCreatedAtDesc(Long agentId);

    Optional<AgentLoan> findBySubscriptionId(Long subscriptionId);

    List<AgentLoan> findByAgentIdAndStatus(Long agentId, AgentLoan.LoanStatus status);

    int countByAgentIdAndStatus(Long agentId, AgentLoan.LoanStatus status);

    Optional<AgentLoan> findByRepaymentReference(String repaymentReference);

    /** Find ACTIVE loans whose due date has passed — for the overdue scheduler. */
    @Query("SELECT l FROM AgentLoan l WHERE l.status = 'ACTIVE' AND l.dueDate < :today")
    List<AgentLoan> findOverdueActiveLoans(@Param("today") LocalDate today);
}
