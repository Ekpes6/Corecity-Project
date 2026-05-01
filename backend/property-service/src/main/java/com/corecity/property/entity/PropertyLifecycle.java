package com.corecity.property.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Tracks the post-transaction occupancy of a property.
 * Created when a PURCHASE/RENT/SHORTLET transaction completes successfully.
 * A scheduled job checks endTime and reverts RENTED/SHORTLET properties to ACTIVE when expired.
 */
@Entity
@Table(name = "property_lifecycle")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PropertyLifecycle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "property_id", nullable = false)
    private Long propertyId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** PURCHASE, RENT, or SHORTLET */
    @Column(nullable = false, length = 20)
    private String type;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    /** Null for PURCHASE (permanent ownership — no automatic reversion). Set for RENT/SHORTLET. */
    @Column(name = "end_time")
    private LocalDateTime endTime;

    /** ACTIVE or EXPIRED */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "ACTIVE";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
