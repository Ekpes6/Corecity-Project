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

    /**
     * Tracks the repayment payment status independently of the loan lifecycle.
     * PENDING = not yet repaid, SUCCESS = fully repaid via Paystack, FAILED = payment attempt failed.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "repayment_status")
    @Builder.Default
    private RepaymentStatus repaymentStatus = RepaymentStatus.PENDING;

    /** Paystack reference for the repayment transaction (populated when repay is initiated). */
    @Column(name = "repayment_reference")
    private String repaymentReference;

    /** Paystack authorization URL for the repayment (stored so retries can recover it). */
    @Column(name = "repayment_authorization_url", length = 512)
    private String repaymentAuthorizationUrl;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum LoanStatus {
        /**
         * Legacy — loans previously started PENDING waiting for Paystack.
         * New loans are created directly as ACTIVE.
         */
        PENDING,
        /** Loan is active; repayment is due before or on dueDate. */
        ACTIVE,
        /** Loan fully repaid. */
        REPAID,
        /** Loan passed dueDate without full repayment. */
        OVERDUE,
        /** Legacy value — treated as OVERDUE. */
        DEFAULTED
    }

    public enum RepaymentStatus {
        PENDING,
        SUCCESS,
        FAILED
    }

    /** Remaining balance the agent still owes. */
    public BigDecimal getRemainingBalance() {
        return loanAmount.subtract(amountRepaid);
    }
}
