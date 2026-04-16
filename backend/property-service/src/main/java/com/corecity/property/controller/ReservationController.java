package com.corecity.property.controller;

import com.corecity.property.dto.PropertyDTOs.*;
import com.corecity.property.service.ReservationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@Slf4j
public class ReservationController {

    private final ReservationService reservationService;

    /**
     * Initiate a ₦1,000 reservation on an ACTIVE property.
     * Returns a Paystack checkout URL for the customer to complete payment.
     *
     * POST /api/v1/properties/{id}/reserve
     */
    @PostMapping("/api/v1/properties/{id}/reserve")
    public ResponseEntity<ReservationInitResponse> reserve(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Email") String userEmail) {
        log.info("Reservation request for property {} by user {}", id, userId);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(reservationService.initiateReservation(id, userId, userEmail));
    }

    /**
     * Paystack webhook callback for reservation payments.
     * Called by Paystack when a reservation fee payment is confirmed.
     *
     * POST /api/v1/reservations/webhook/paystack
     */
    @PostMapping("/api/v1/reservations/webhook/paystack")
    public ResponseEntity<Void> webhook(
            @RequestBody Map<String, Object> payload,
            @RequestHeader(value = "x-paystack-signature", required = false) String signature) {
        // In production, validate HMAC-SHA512 signature before processing.
        String event = (String) payload.getOrDefault("event", "");
        if ("charge.success".equals(event)) {
            @SuppressWarnings("unchecked")
            Map<String, Object> data = (Map<String, Object>) payload.get("data");
            if (data != null) {
                String reference = (String) data.get("reference");
                if (reference != null && reference.startsWith("RSV-")) {
                    try {
                        reservationService.activateReservation(reference);
                    } catch (Exception e) {
                        log.warn("Could not activate reservation for ref {}: {}", reference, e.getMessage());
                    }
                }
            }
        }
        return ResponseEntity.ok().build();
    }

    /**
     * Get all reservations placed by the authenticated customer.
     *
     * GET /api/v1/reservations/my
     */
    @GetMapping("/api/v1/reservations/my")
    public ResponseEntity<List<ReservationResponse>> myReservations(
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(reservationService.getMyReservations(userId));
    }

    /**
     * Get the active reservation for a property (owner or admin only).
     *
     * GET /api/v1/properties/{id}/reservation
     */
    @GetMapping("/api/v1/properties/{id}/reservation")
    public ResponseEntity<ReservationResponse> getActiveReservation(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Role") String userRole) {
        return ResponseEntity.ok(reservationService.getActiveReservation(id, userId, userRole));
    }
}
