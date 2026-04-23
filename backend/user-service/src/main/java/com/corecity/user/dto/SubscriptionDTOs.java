package com.corecity.user.dto;

import com.corecity.user.entity.AgentSubscription;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class SubscriptionDTOs {

    // ── Subscription ──────────────────────────────────────────────────────────

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class SubscribeRequest {
        @NotNull
        private AgentSubscription.SubscriptionPlan plan;

        /**
         * Only relevant for Executive Agents using the flexible-contribution feature.
         * Must be ≥ ₦10,000. For non-Executive agents, the standard plan fee applies.
         */
        private BigDecimal customAmount;

        /** If true, the subscription is funded via the interest-free loan feature. */
        @Builder.Default
        private boolean useLoan = false;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class SubscriptionInitResponse {
        private Long subscriptionId;
        private String plan;
        private BigDecimal amountDue;
        private String paymentReference;
        private String authorizationUrl;
        private boolean isLoan;
        private String status;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class SubscriptionResponse {
        private Long id;
        private String plan;
        private BigDecimal amountPaid;
        private LocalDate startDate;
        private LocalDate endDate;
        private String status;
        private boolean isLoan;
        private int maxListings;
        private LocalDateTime createdAt;
        /** Only populated for PENDING_PAYMENT status — lets the frontend resume payment. */
        private String authorizationUrl;
    }

    // ── Plan info (public catalogue) ─────────────────────────────────────────

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PlanInfo {
        private String name;
        private BigDecimal monthlyFee;
        private int maxListings;
        /** Commission rates are fixed across all plans. */
        @Builder.Default
        private String coreCityCommission = "3%";
        @Builder.Default
        private String agentCommission = "7%";
        private boolean loanEligible;
    }

    // ── Loan ─────────────────────────────────────────────────────────────────

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class LoanResponse {
        private Long id;
        private Long agentId;
        private Long subscriptionId;
        private String plan;
        private BigDecimal loanAmount;
        private BigDecimal amountRepaid;
        private BigDecimal remainingBalance;
        private LocalDate dueDate;
        private String status;
        private String repaymentStatus;
        /** Populated when a repay Paystack transaction has been initialized. */
        private String repaymentAuthorizationUrl;
        private Integer trialNumber;
        private LocalDateTime createdAt;
    }

    /** Returned by POST /subscriptions/loans/{id}/repay — contains the Paystack URL. */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class LoanRepayInitResponse {
        private Long loanId;
        private String repaymentReference;
        private String authorizationUrl;
        private BigDecimal amount;
    }

    // ── Loan Program (13-cycle progression) ──────────────────────────────────

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class LoanProgramResponse {
        private Long id;
        private String currentLevel;           // BASIC | STANDARD | PREMIUM | COMPLETED
        private int basicTrialsCompleted;
        private int standardTrialsCompleted;
        private int premiumTrialsCompleted;
        private int totalTrialsCompleted;
        private int trialsRemainingInLevel;
        private String programStatus;          // ACTIVE | COMPLETED
        private String eligiblePlan;           // plan name for next loan
    }

    // ── Active product check (used by property-service) ─────────────────────

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ActiveProductResponse {
        private boolean hasActiveProduct;
        /** "SUBSCRIPTION", "LOAN", or null */
        private String productType;
        /**
         * Access level for the current user:
         * FULL     — active subscription, loan fully repaid
         * LIMITED  — loan is ACTIVE (not yet repaid); properties hidden from public
         * RESTRICTED — loan OVERDUE; properties hidden, further access blocked
         * NONE     — no active product
         */
        private String accessLevel;
    }

    // ── Reputation ───────────────────────────────────────────────────────────

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class SubmitFeedbackRequest {
        /** The agent being rated. */
        @NotNull
        private Long agentId;

        @Min(1) @Max(5)
        private int rating;

        @Size(max = 500)
        private String comment;

        /** Optional reference to the property/transaction the feedback is about. */
        private Long referenceId;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class AgentReputationResponse {
        private Long agentId;
        private int reputationScore;
        private boolean executiveAgent;
        private boolean hasNegativeReviews;
        private List<ReputationEventDTO> recentEvents;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ReputationEventDTO {
        private Long id;
        private String source;
        private int points;
        private boolean negative;
        private String comment;
        private LocalDateTime createdAt;
    }
}
