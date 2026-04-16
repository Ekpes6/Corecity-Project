package com.corecity.transaction.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Tracks the commission split for a completed PURCHASE or RENT transaction.
 *
 * CoreCity Commission = 3% × property value
 * Agent Commission    = 7% × property value
 * Total Commission    = 10% × property value
 * Overall Cost        = property value + total commission
 */
@Entity
@Table(name = "commissions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Commission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transaction_id", nullable = false, unique = true)
    private Long transactionId;

    @Column(name = "property_id", nullable = false)
    private Long propertyId;

    @Column(name = "agent_id")
    private Long agentId;

    /** Net property value (before commission). */
    @Column(name = "property_value", nullable = false, precision = 15, scale = 2)
    private BigDecimal propertyValue;

    /** 3% of propertyValue – disbursed to CoreCity. */
    @Column(name = "corecity_commission", nullable = false, precision = 15, scale = 2)
    private BigDecimal corecityCommission;

    /** 7% of propertyValue – disbursed to the agent. */
    @Column(name = "agent_commission", nullable = false, precision = 15, scale = 2)
    private BigDecimal agentCommission;

    /** corecityCommission + agentCommission = 10% of propertyValue. */
    @Column(name = "total_commission", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalCommission;

    /** propertyValue + totalCommission. */
    @Column(name = "overall_cost", nullable = false, precision = 15, scale = 2)
    private BigDecimal overallCost;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private CommissionStatus status = CommissionStatus.PENDING;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum CommissionStatus {
        /** Commission calculated, awaiting disbursement. */
        PENDING,
        /** Funds disbursed to CoreCity and agent accounts. */
        DISBURSED
    }
}
