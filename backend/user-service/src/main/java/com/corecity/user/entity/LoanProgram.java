package com.corecity.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Tracks an agent's progression through the interest-free 13-trial loan program.
 *
 * Progression:
 *   BASIC    – 3 successful repayments unlock STANDARD
 *   STANDARD – 4 successful repayments unlock PREMIUM
 *   PREMIUM  – 6 successful repayments complete the program (total = 13)
 *
 * Each trial = one loan-funded subscription repaid in full.
 * Agents must start from BASIC and cannot skip levels.
 */
@Entity
@Table(name = "loan_programs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoanProgram {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "agent_id", nullable = false, unique = true)
    private Long agentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "current_level", nullable = false)
    @Builder.Default
    private LoanLevel currentLevel = LoanLevel.BASIC;

    @Column(name = "basic_trials_completed", nullable = false)
    @Builder.Default
    private int basicTrialsCompleted = 0;

    @Column(name = "standard_trials_completed", nullable = false)
    @Builder.Default
    private int standardTrialsCompleted = 0;

    @Column(name = "premium_trials_completed", nullable = false)
    @Builder.Default
    private int premiumTrialsCompleted = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "program_status", nullable = false)
    @Builder.Default
    private ProgramStatus programStatus = ProgramStatus.ACTIVE;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // ── Constants ────────────────────────────────────────────────────────────

    public static final int BASIC_TRIALS_REQUIRED    = 3;
    public static final int STANDARD_TRIALS_REQUIRED = 4;
    public static final int PREMIUM_TRIALS_REQUIRED  = 6;

    // ── Enums ─────────────────────────────────────────────────────────────────

    public enum LoanLevel    { BASIC, STANDARD, PREMIUM, COMPLETED }
    public enum ProgramStatus { ACTIVE, COMPLETED }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public int getTotalTrialsCompleted() {
        return basicTrialsCompleted + standardTrialsCompleted + premiumTrialsCompleted;
    }

    public int getTrialsRemainingInCurrentLevel() {
        return switch (currentLevel) {
            case BASIC     -> BASIC_TRIALS_REQUIRED    - basicTrialsCompleted;
            case STANDARD  -> STANDARD_TRIALS_REQUIRED - standardTrialsCompleted;
            case PREMIUM   -> PREMIUM_TRIALS_REQUIRED  - premiumTrialsCompleted;
            case COMPLETED -> 0;
        };
    }

    /** The subscription plan that matches the current loan level. */
    public AgentSubscription.SubscriptionPlan eligiblePlan() {
        return switch (currentLevel) {
            case BASIC     -> AgentSubscription.SubscriptionPlan.BASIC;
            case STANDARD  -> AgentSubscription.SubscriptionPlan.STANDARD;
            case PREMIUM   -> AgentSubscription.SubscriptionPlan.PREMIUM;
            case COMPLETED -> null;
        };
    }

    /**
     * Record a successful repayment and advance the level if the threshold is met.
     * @return true if the user advanced to a new level or completed the program.
     */
    public boolean recordSuccessfulRepayment() {
        switch (currentLevel) {
            case BASIC -> {
                basicTrialsCompleted++;
                if (basicTrialsCompleted >= BASIC_TRIALS_REQUIRED) {
                    currentLevel = LoanLevel.STANDARD;
                    return true;
                }
            }
            case STANDARD -> {
                standardTrialsCompleted++;
                if (standardTrialsCompleted >= STANDARD_TRIALS_REQUIRED) {
                    currentLevel = LoanLevel.PREMIUM;
                    return true;
                }
            }
            case PREMIUM -> {
                premiumTrialsCompleted++;
                if (premiumTrialsCompleted >= PREMIUM_TRIALS_REQUIRED) {
                    currentLevel = LoanLevel.COMPLETED;
                    programStatus = ProgramStatus.COMPLETED;
                    return true;
                }
            }
            case COMPLETED -> { /* nothing to record */ }
        }
        return false;
    }
}
