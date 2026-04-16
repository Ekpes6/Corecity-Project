package com.corecity.property.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Records a customer's paid reservation (₦1,000 non-refundable fee) on an
 * ACTIVE property.  Once payment is confirmed the property moves to
 * ON_NEGOTIATION status for up to 5 days.
 */
@Entity
@Table(name = "reservations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Reservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "property_id", nullable = false)
    private Long propertyId;

    /** The customer (buyer) who placed the reservation. */
    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    /** Paystack payment reference for the ₦1,000 fee. */
    @Column(name = "payment_reference", unique = true)
    private String paymentReference;

    @Column(name = "authorization_url")
    private String authorizationUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ReservationStatus status = ReservationStatus.PENDING_PAYMENT;

    /** Set when payment is confirmed; expiry = paidAt + 5 days. */
    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum ReservationStatus {
        /** Payment link generated but not yet paid. */
        PENDING_PAYMENT,
        /** Payment confirmed – 5-day negotiation window active. */
        ACTIVE,
        /** Negotiation window expired with no deal – property reverted to ACTIVE. */
        EXPIRED,
        /** Deal was successfully concluded. */
        COMPLETED
    }
}
