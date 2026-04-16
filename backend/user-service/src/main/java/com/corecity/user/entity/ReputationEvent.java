package com.corecity.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Individual reputation events awarded to an agent.
 *
 * Sources:
 *   CUSTOMER_FEEDBACK  – awarded when a customer rates the agent positively
 *   SYSTEM_VALIDATION  – awarded by CoreCity when a transaction is successfully
 *                        completed and commission properly disbursed
 */
@Entity
@Table(name = "reputation_events")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReputationEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The agent receiving the reputation points. */
    @Column(name = "agent_id", nullable = false)
    private Long agentId;

    /** The customer or system actor that triggered this event. */
    @Column(name = "source_user_id")
    private Long sourceUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReputationSource source;

    @Column(nullable = false)
    @Builder.Default
    private Integer points = 1;

    /** Optional link to the property/transaction that triggered this event. */
    @Column(name = "reference_id")
    private Long referenceId;

    @Column(length = 500)
    private String comment;

    /**
     * True when this event represents a negative review.
     * An agent with any negative review cannot qualify for Executive Agent status.
     */
    @Column(name = "is_negative")
    @Builder.Default
    private boolean negative = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum ReputationSource {
        CUSTOMER_FEEDBACK,
        SYSTEM_VALIDATION
    }
}
