// ─────────────────────────────────────────────────────────────────────────────
// FILE 1 of 2  —  PropertyDTOs.java (add @Max to PropertySearchRequest)
// Replace the existing PropertySearchRequest inner class only (the rest of the
// file is unchanged).
// Full path:
//   backend/property-service/src/main/java/com/corecity/property/dto/PropertyDTOs.java
// ─────────────────────────────────────────────────────────────────────────────
package com.corecity.property.dto;

import com.corecity.property.entity.Property;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class PropertyDTOs {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CreatePropertyRequest {
        @NotBlank private String title;
        private String description;
        @NotNull private Property.PropertyType propertyType;
        @NotNull private Property.ListingType listingType;
        @NotNull @Positive private BigDecimal price;
        private Property.PricePeriod pricePeriod;
        private Integer bedrooms;
        private Integer bathrooms;
        private Integer toilets;
        private BigDecimal sizeSqm;
        @NotBlank private String address;
        private Integer stateId;
        private Integer lgaId;
        private BigDecimal latitude;
        private BigDecimal longitude;
        @Builder.Default
        private Boolean negotiable = true;
        private List<String> amenities;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PropertyResponse {
        private Long id;
        private String title;
        private String description;
        private String propertyType;
        private String listingType;
        private BigDecimal price;
        private String pricePeriod;
        private Integer bedrooms;
        private Integer bathrooms;
        private Integer toilets;
        private BigDecimal sizeSqm;
        /**
         * Masked to null when the property is ON_NEGOTIATION and the requester is
         * not the active reservation holder.  Populated in full for the owner,
         * admin, or the customer who holds the active reservation.
         */
        private String address;
        private Integer stateId;
        private String stateName;
        private Integer lgaId;
        private String lgaName;
        private BigDecimal latitude;
        private BigDecimal longitude;
        private Long ownerId;
        /**
         * Masked to null (same conditions as address above).
         */
        private Long agentId;
        private String status;
        private Boolean negotiable;
        private List<String> amenities;
        private List<String> imageUrls;
        private String primaryImageUrl;
        private Integer viewsCount;
        private LocalDateTime createdAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PropertySearchRequest {
        private Property.ListingType listingType;
        private Property.PropertyType propertyType;
        private Integer stateId;
        private Integer lgaId;
        private BigDecimal minPrice;
        private BigDecimal maxPrice;
        private Integer bedrooms;
        private String keyword;

        @Builder.Default
        @Min(value = 0, message = "Page must be >= 0")
        private int page = 0;

        /**
         * Max page size capped at 50.
         * A request like ?size=100000 would load that many rows from MySQL into
         * memory, easily causing an OOM error. 50 is generous for a property
         * listing UI; raise it only if you have a documented use case.
         */
        @Builder.Default
        @Min(value = 1, message = "Size must be >= 1")
        @Max(value = 50, message = "Size must be <= 50")
        private int size = 12;

        @Builder.Default
        private String sortBy = "createdAt";

        @Builder.Default
        private String sortDir = "desc";
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class RejectPropertyRequest {
        private String reason;
    }

    // ─── Reservation DTOs ────────────────────────────────────────────────────

    /** Returned immediately after a customer calls POST /properties/{id}/reserve */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ReservationInitResponse {
        private Long reservationId;
        private Long propertyId;
        private String paymentReference;
        private String authorizationUrl;
        /** Fixed ₦1,000 */
        private BigDecimal reservationFee;
        private String status;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ReservationResponse {
        private Long id;
        private Long propertyId;
        private Long customerId;
        private String paymentReference;
        private String status;
        private java.time.LocalDateTime paidAt;
        private java.time.LocalDateTime expiresAt;
        private java.time.LocalDateTime createdAt;

        // ─── Enriched property snapshot (populated by getMyReservations) ────
        private String propertyTitle;
        private String primaryImageUrl;
        private BigDecimal propertyPrice;
        private String propertyListingType;
        /** Full address — always shown to the reservation holder. */
        private String propertyAddress;
        private String propertyStatus;

        // ─── Owner contact — only populated for ACTIVE reservations ─────────
        /** Full name of the property owner (seller / agent). */
        private String ownerName;
        /** Phone number of the property owner; only set when status=ACTIVE. */
        private String ownerPhone;
    }
}