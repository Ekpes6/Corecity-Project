package com.corecity.property.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "properties")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Property {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "property_type", nullable = false)
    private PropertyType propertyType;

    @Enumerated(EnumType.STRING)
    @Column(name = "listing_type", nullable = false)
    private ListingType listingType;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal price;

    @Enumerated(EnumType.STRING)
    @Column(name = "price_period")
    @Builder.Default
    private PricePeriod pricePeriod = PricePeriod.OUTRIGHT;

    @Builder.Default
    private Integer bedrooms = 0;
    @Builder.Default
    private Integer bathrooms = 0;
    @Builder.Default
    private Integer toilets = 0;

    @Column(name = "size_sqm", precision = 10, scale = 2)
    private BigDecimal sizeSqm;

    @Column(nullable = false)
    private String address;

    @Column(name = "state_id")
    private Integer stateId;

    @Column(name = "lga_id")
    private Integer lgaId;

    @Column(precision = 10, scale = 8)
    private BigDecimal latitude;

    @Column(precision = 11, scale = 8)
    private BigDecimal longitude;

    @Column(name = "owner_id", nullable = false)
    private Long ownerId;

    @Column(name = "agent_id")
    private Long agentId;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private PropertyStatus status = PropertyStatus.PENDING;

    @Column(name = "is_negotiable")
    @Builder.Default
    private Boolean negotiable = true;

    // Stored as JSON string: ["BOREHOLE","GENERATOR","CCTV"]
    @Column(columnDefinition = "JSON")
    private String amenities;

    @Column(name = "views_count")
    @Builder.Default
    private Integer viewsCount = 0;

    @OneToMany(mappedBy = "property", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<PropertyFile> files;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum PropertyType {
        APARTMENT, BUNGALOW, DUPLEX, TERRACED, SEMI_DETACHED, DETACHED, LAND, COMMERCIAL
    }

    public enum ListingType {
        FOR_SALE, FOR_RENT, SHORT_LET
    }

    public enum PricePeriod {
        OUTRIGHT, PER_YEAR, PER_MONTH, PER_NIGHT
    }

    public enum PropertyStatus {
        PENDING, ACTIVE, SOLD, RENTED, INACTIVE
    }
}
