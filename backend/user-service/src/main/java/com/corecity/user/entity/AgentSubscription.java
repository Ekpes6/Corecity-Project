package com.corecity.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Tracks an agent's active or historical subscription to a CoreCity plan.
 *
 * Plans and their limits:
 *   BASIC     – ₦10,000/month  – up to  30 listings
 *   STANDARD  – ₦30,000/month  – up to  60 listings
 *   PREMIUM   – ₦100,000/month – up to 150 listings
 *   EXECUTIVE – ₦2,000,000/month – up to 500 listings
 *
 * Executive Agents (reputation > 1,000, zero negative reviews) may subscribe
 * with any amount ≥ ₦10,000 and still access Executive-plan features.
 */
@Entity
@Table(name = "agent_subscriptions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AgentSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "agent_id", nullable = false)
    private Long agentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SubscriptionPlan plan;

    @Column(name = "amount_paid", nullable = false, precision = 15, scale = 2)
    private BigDecimal amountPaid;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private SubscriptionStatus status = SubscriptionStatus.ACTIVE;

    /** True when this subscription was funded via the interest-free loan feature. */
    @Column(name = "is_loan")
    @Builder.Default
    private boolean loan = false;

    /** Paystack payment reference for the subscription fee. */
    @Column(name = "payment_reference")
    private String paymentReference;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // ── Nested enums ─────────────────────────────────────────────────────────

    public enum SubscriptionPlan {
        BASIC(new java.math.BigDecimal("10000"), 30),
        STANDARD(new java.math.BigDecimal("30000"), 60),
        PREMIUM(new java.math.BigDecimal("100000"), 150),
        EXECUTIVE(new java.math.BigDecimal("2000000"), 500);

        public final BigDecimal monthlyFee;
        public final int maxListings;

        SubscriptionPlan(BigDecimal monthlyFee, int maxListings) {
            this.monthlyFee = monthlyFee;
            this.maxListings = maxListings;
        }
    }

    public enum SubscriptionStatus {
        /** Paystack link generated; awaiting payment. */
        PENDING_PAYMENT,
        /** Payment confirmed via webhook; access granted. */
        ACTIVE,
        EXPIRED,
        CANCELLED,
        /** Paystack payment failed or was abandoned. */
        FAILED
    }
}
