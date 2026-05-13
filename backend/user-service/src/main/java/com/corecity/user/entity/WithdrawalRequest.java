package com.corecity.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Records a user's request to withdraw funds from their CoreCity wallet to a
 * named bank account.  The wallet is debited immediately; the platform then
 * processes the bank transfer (manually or via Paystack Transfers API).
 */
@Entity
@Table(name = "withdrawal_requests")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WithdrawalRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** Unique reference, e.g. WDR-{userId}-{timestamp}. */
    @Column(nullable = false, unique = true, length = 100)
    private String reference;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    /** Snapshot of the destination bank name at request time. */
    @Column(name = "bank_name", nullable = false, length = 100)
    private String bankName;

    /** Snapshot of the destination account number at request time. */
    @Column(name = "account_number", nullable = false, length = 50)
    private String accountNumber;

    /** Snapshot of the destination account name at request time. */
    @Column(name = "account_name", nullable = false, length = 200)
    private String accountName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Status status = Status.PENDING;

    /** Optional note added by admin when processing / rejecting. */
    @Column(name = "admin_note", length = 500)
    private String adminNote;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum Status {
        /** Wallet debited; awaiting bank transfer by admin. */
        PENDING,
        /** Bank transfer completed successfully. */
        PROCESSED,
        /** Rejected / reversed — wallet re-credited. */
        REJECTED
    }
}
