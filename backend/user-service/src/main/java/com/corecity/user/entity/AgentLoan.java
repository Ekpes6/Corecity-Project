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
 *  - Available to AGENT role only (not SELLER or BUYER).
 *  - Available for BASIC, STANDARD, and PREMIUM plan levels (not EXECUTIVE).
 *  - Interest-free; agent repays exactly the subscription amount.
 *  - Each loan cycle lasts exactly 1 month.
 *  - Loan is PENDING until Paystack payment is confirmed; becomes ACTIVE after webhook.
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

    /** Due date = startDate + 30 days (1 month per cycle). */
    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    /** Which trial number within the loan program (1-indexed). */
    @Column(name = "trial_number")
    private Integer trialNumber;

    /** Reference to the LoanProgram tracking this agent's progression. */
    @Column(name = "loan_program_id")
    private Long loanProgramId;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private LoanStatus status = LoanStatus.PENDING;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum LoanStatus {
        /** Created; waiting for Paystack payment confirmation. */
        PENDING,
        /** Payment confirmed; loan is active and repayment is due. */
        ACTIVE,
        REPAID,
        DEFAULTED
    }

    /** Remaining balance the agent still owes. */
    public BigDecimal getRemainingBalance() {
        return loanAmount.subtract(amountRepaid);
    }
}
