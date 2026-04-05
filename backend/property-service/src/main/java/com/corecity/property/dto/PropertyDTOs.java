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
        private Double latitude;
        private Double longitude;
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
        private String address;
        private Integer stateId;
        private String stateName;
        private Integer lgaId;
        private String lgaName;
        private Double latitude;
        private Double longitude;
        private Long ownerId;
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
        private int page = 0;
        @Builder.Default
        private int size = 12;
        @Builder.Default
        private String sortBy = "createdAt";
        @Builder.Default
        private String sortDir = "desc";
    }
}
