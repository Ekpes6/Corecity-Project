package com.corecity.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Records an interest-free loan granted to an agent for a subscription plan.
 *
 * Rules:
 *  - Available for BASIC, STANDARD, and PREMIUM plans only (not EXECUTIVE).
 *  - Interest-free; agent repays exactly the subscription amount.
 *  - Repayment must complete within the agreed access period (max 6 months).
 *  - Agents with a good repayment history may qualify for extended durations.
 */
@Entity
@Table(name = "agent_loans")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AgentLoan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "agent_id", nullable = false)
    private Long agentId;

    /** The subscription this loan is funding. */
    @Column(name = "subscription_id", nullable = false)
    private Long subscriptionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AgentSubscription.SubscriptionPlan plan;

    @Column(name = "loan_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal loanAmount;

    @Column(name = "amount_repaid", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal amountRepaid = BigDecimal.ZERO;

    /** Due date calculated at loan creation (max 6 months from startDate). */
    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private LoanStatus status = LoanStatus.ACTIVE;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum LoanStatus {
        ACTIVE, REPAID, DEFAULTED
    }

    /** Remaining balance the agent still owes. */
    public BigDecimal getRemainingBalance() {
        return loanAmount.subtract(amountRepaid);
    }
}
