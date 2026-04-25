package com.corecity.property.controller;

import com.corecity.property.dto.PropertyDTOs.*;
import com.corecity.property.service.ReservationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@Slf4j
public class ReservationController {

    private final ReservationService reservationService;

    @Value("${paystack.secret-key}")
    private String paystackSecretKey;

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
     * Validates HMAC-SHA512 signature before processing.
     *
     * POST /api/v1/reservations/webhook/paystack
     */
    @PostMapping("/api/v1/reservations/webhook/paystack")
    public ResponseEntity<Void> webhook(
            @RequestBody String rawBody,
            @RequestHeader(value = "x-paystack-signature", required = false) String signature) {

        // Verify HMAC-SHA512 signature to prevent spoofed events
        if (!isValidPaystackSignature(rawBody, signature)) {
            log.warn("Reservation webhook: invalid or missing signature — rejected");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper =
                new com.fasterxml.jackson.databind.ObjectMapper();
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = mapper.readValue(rawBody, Map.class);
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
        } catch (Exception e) {
            log.error("Failed to process reservation webhook body", e);
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

    /**
     * Look up a reservation by Paystack reference – used by the payment verify page
     * to determine whether a reservation payment succeeded or failed.
     *
     * GET /api/v1/reservations/by-reference/{reference}
     */
    @GetMapping("/api/v1/reservations/by-reference/{reference}")
    public ResponseEntity<ReservationResponse> getByReference(
            @PathVariable String reference,
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(reservationService.getByReference(reference, userId));
    }

    /**
     * Actively verify the payment with Paystack and activate the reservation if confirmed.
     * Eliminates the webhook-vs-browser-redirect race condition on the verify page.
     * Safe to call multiple times (idempotent — already-ACTIVE reservations are returned as-is).
     *
     * GET /api/v1/reservations/verify/{reference}
     */
    @GetMapping("/api/v1/reservations/verify/{reference}")
    public ResponseEntity<ReservationResponse> verifyReservation(
            @PathVariable String reference,
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(reservationService.verifyAndActivate(reference, userId));
    }

    // ── Private helpers ────────────────────────────────────────────────────

    /**
     * Verifies the Paystack webhook HMAC-SHA512 signature.
     * Uses constant-time comparison to prevent timing attacks.
     */
    private boolean isValidPaystackSignature(String rawBody, String receivedSignature) {
        if (receivedSignature == null || receivedSignature.isBlank()) return false;
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(
                paystackSecretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            byte[] digest = mac.doFinal(rawBody.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) sb.append(String.format("%02x", b));
            String expected = sb.toString();
            if (expected.length() != receivedSignature.length()) return false;
            // Constant-time comparison
            int diff = 0;
            for (int i = 0; i < expected.length(); i++) {
                diff |= expected.charAt(i) ^ receivedSignature.charAt(i);
            }
            return diff == 0;
        } catch (Exception e) {
            log.error("Reservation webhook signature verification error", e);
            return false;
        }
    }
}
