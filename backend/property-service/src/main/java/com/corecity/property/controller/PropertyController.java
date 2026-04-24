// ─────────────────────────────────────────────────────────────────────────────
// FILE 2 of 2  —  PropertyController.java
// Adds @Validated + @Min/@Max directly on the search() method params so Spring
// validates them before the DTO is built — catching bad values at the boundary.
// Full path:
//   backend/property-service/src/main/java/com/corecity/property/controller/PropertyController.java
// ─────────────────────────────────────────────────────────────────────────────
package com.corecity.property.controller;

import com.corecity.property.dto.PropertyDTOs.*;
import com.corecity.property.entity.Property;
import com.corecity.property.service.PropertyService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.*;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/properties")
@RequiredArgsConstructor
@Validated   // enables constraint annotations on @RequestParam directly
@Slf4j
public class PropertyController {

    private final PropertyService propertyService;

    @PostMapping
    public ResponseEntity<PropertyResponse> create(
            @Valid @RequestBody CreatePropertyRequest req,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        log.info("Property create request received for user {} (role: {}) with title '{}'", userId, userRole, req.getTitle());
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(propertyService.createProperty(req, userId, userRole));
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
            @RequestParam(defaultValue = "0")  @Min(0)       int page,
            @RequestParam(defaultValue = "12") @Min(1) @Max(50) int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc")      String sortDir) {

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
    public ResponseEntity<PropertyResponse> getOne(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        return ResponseEntity.ok(propertyService.getProperty(id, userId, userRole));
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

    @GetMapping("/rejected")
    public ResponseEntity<List<PropertyResponse>> rejectedListings(
            @RequestHeader("X-User-Role") String userRole) {
        return ResponseEntity.ok(propertyService.getRejectedProperties(userRole));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<PropertyResponse> approve(
            @PathVariable Long id,
            @RequestHeader("X-User-Role") String userRole) {
        return ResponseEntity.ok(propertyService.approveProperty(id, userRole));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<PropertyResponse> reject(
            @PathVariable Long id,
            @RequestHeader("X-User-Role") String userRole,
            @RequestBody(required = false) RejectPropertyRequest req) {
        String reason = req != null ? req.getReason() : null;
        return ResponseEntity.ok(propertyService.rejectProperty(id, userRole, reason));
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

    @PostMapping("/{id}/publish")
    public ResponseEntity<PropertyResponse> publish(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(propertyService.publishProperty(id, userId));
    }

    @PostMapping("/{id}/files")
    public ResponseEntity<Void> registerFiles(
            @PathVariable Long id,
            @RequestBody List<String> fileUrls,
            @RequestHeader("X-User-Id") Long userId) {
        propertyService.registerFiles(id, fileUrls, userId);
        return ResponseEntity.noContent().build();
    }
}