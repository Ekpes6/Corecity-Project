package com.corecity.property.controller;

import com.corecity.property.dto.PropertyDTOs.*;
import com.corecity.property.entity.Property;
import com.corecity.property.service.PropertyService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/properties")
@RequiredArgsConstructor
@Slf4j
public class PropertyController {

    private final PropertyService propertyService;

    @PostMapping
    public ResponseEntity<PropertyResponse> create(
            @Valid @RequestBody CreatePropertyRequest req,
            @RequestHeader("X-User-Id") Long userId) {
        log.info("Property create request received for user {} with title '{}'", userId, req.getTitle());
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(propertyService.createProperty(req, userId));
    }

    @GetMapping("/search")
    public ResponseEntity<Page<PropertyResponse>> search(
            @RequestParam(required = false) Property.ListingType listingType,
            @RequestParam(required = false) Property.PropertyType propertyType,
            @RequestParam(required = false) Integer stateId,
            @RequestParam(required = false) Integer lgaId,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) Integer bedrooms,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        PropertySearchRequest req = PropertySearchRequest.builder()
            .listingType(listingType).propertyType(propertyType)
            .stateId(stateId).lgaId(lgaId)
            .minPrice(minPrice).maxPrice(maxPrice)
            .bedrooms(bedrooms).keyword(keyword)
            .page(page).size(size).sortBy(sortBy).sortDir(sortDir)
            .build();

        return ResponseEntity.ok(propertyService.searchProperties(req));
    }

    @GetMapping("/featured")
    public ResponseEntity<List<PropertyResponse>> featured() {
        return ResponseEntity.ok(propertyService.getFeaturedProperties());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PropertyResponse> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(propertyService.getProperty(id));
    }

    @GetMapping("/my-listings")
    public ResponseEntity<List<PropertyResponse>> myListings(
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(propertyService.getMyProperties(userId));
    }

    @GetMapping("/pending")
    public ResponseEntity<List<PropertyResponse>> pendingListings(
            @RequestHeader("X-User-Role") String userRole) {
        return ResponseEntity.ok(propertyService.getPendingProperties(userRole));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<PropertyResponse> approve(
            @PathVariable Long id,
            @RequestHeader("X-User-Role") String userRole) {
        return ResponseEntity.ok(propertyService.approveProperty(id, userRole));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PropertyResponse> update(
            @PathVariable Long id,
            @RequestBody CreatePropertyRequest req,
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(propertyService.updateProperty(id, req, userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long userId) {
        propertyService.deleteProperty(id, userId);
        return ResponseEntity.ok(Map.of("message", "Property removed successfully"));
    }
}
