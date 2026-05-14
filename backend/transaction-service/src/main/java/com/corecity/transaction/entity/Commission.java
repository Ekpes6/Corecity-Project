package com.corecity.transaction.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Tracks the commission split for a completed PURCHASE or RENT transaction.
 *
 * CoreCity Commission = 5% × property value  (credited to admin wallet automatically)
 * Seller Bonus        = 5% × property value  (included in manual bank-transfer payout)
 * Total Commission    = 10% × property value
 * Overall Cost        = property value + total commission
 * Seller bank-transfer payout = property value + seller bonus = property value × 1.05
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

    /** CoreCity's share: 3% (AGENT transactions) or 5% (SELLER transactions) — credited to admin wallet. */
    @Column(name = "corecity_commission", nullable = false, precision = 15, scale = 2)
    private BigDecimal corecityCommission;

    /**
     * AGENT transactions: 7% of propertyValue — credited to agent wallet automatically.
     * SELLER transactions: 5% of propertyValue — seller bonus, added to the bank-transfer payout (NOT a wallet credit).
     */
    @Column(name = "agent_commission", nullable = false, precision = 15, scale = 2)
    private BigDecimal agentCommission;

    /**
     * 'AGENT' → 7% agent + 3% CoreCity split (wallet credits for both).
     * 'SELLER' → 5% seller bonus (bank transfer) + 5% CoreCity (wallet credit only for admin).
     */
    @Column(name = "seller_role", length = 20)
    @Builder.Default
    private String sellerRole = "AGENT";

    /** corecityCommission + agentCommission = 10% of propertyValue. */
    @Column(name = "total_commission", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalCommission;

    /** propertyValue + totalCommission. */
    @Column(name = "overall_cost", nullable = false, precision = 15, scale = 2)
    private BigDecimal overallCost;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private CommissionStatus status = CommissionStatus.PENDING;

    /**
     * True once admin has confirmed the bank transfer of the property value
     * (90% of the buyer's payment) to the seller's bank account.
     */
    @Builder.Default
    @Column(name = "seller_paid")
    private boolean sellerPaid = false;

    /** Timestamp when admin marked the seller payment as sent. */
    @Column(name = "seller_paid_at")
    private LocalDateTime sellerPaidAt;

    /** Optional admin note, e.g. the bank transfer reference. */
    @Column(name = "seller_note", length = 500)
    private String sellerNote;

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
