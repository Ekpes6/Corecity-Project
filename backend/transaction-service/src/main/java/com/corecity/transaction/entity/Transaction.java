package com.corecity.transaction.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "transactions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String reference;           // Paystack reference e.g. HLK-1234567890

    @Column(name = "property_id", nullable = false)
    private Long propertyId;

    @Column(name = "buyer_id", nullable = false)
    private Long buyerId;

    @Column(name = "seller_id", nullable = false)
    private Long sellerId;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;          // NGN amount

    @Builder.Default
    @Column(name = "service_fee", precision = 15, scale = 2)
    private BigDecimal serviceFee = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransactionType type;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    private TransactionStatus status = TransactionStatus.INITIATED;

    @Column(name = "payment_channel")
    private String paymentChannel;     // card, bank_transfer, ussd, qr

    @Column(name = "authorization_url")
    private String authorizationUrl;   // Paystack checkout URL

    @Column(name = "paystack_data", columnDefinition = "JSON")
    private String paystackData;       // Raw Paystack response

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum TransactionType {
        RENT, PURCHASE, INSPECTION_FEE, AGENT_FEE, RESERVATION_FEE, SUBSCRIPTION, LOAN_REPAYMENT
    }

    public enum TransactionStatus {
        INITIATED, PENDING, SUCCESS, FAILED, REFUNDED
    }
}
