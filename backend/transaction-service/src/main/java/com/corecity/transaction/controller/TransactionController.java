package com.corecity.transaction.controller;

import com.corecity.transaction.dto.TransactionDTOs.*;
import com.corecity.transaction.service.TransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/transactions")
@RequiredArgsConstructor
@Slf4j
public class TransactionController {

    private final TransactionService transactionService;

    @Value("${paystack.secret-key}")
    private String paystackSecretKey;

    /** Initiate payment — returns Paystack checkout URL */
    @PostMapping("/initiate")
    public ResponseEntity<InitTransactionResponse> initiate(
            @Valid @RequestBody InitTransactionRequest req,
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(transactionService.initTransaction(req, userId));
    }

    /** Called after Paystack redirects back to the frontend */
    @GetMapping("/verify/{reference}")
    public ResponseEntity<TransactionResponse> verify(@PathVariable String reference) {
        return ResponseEntity.ok(transactionService.verifyTransaction(reference));
    }

    /**
     * Paystack webhook (server-to-server).
     *
     * Paystack signs every webhook body with HMAC-SHA512 using your secret key
     * and sends the hex digest in the x-paystack-signature header.
     * We recompute the digest over the raw body and reject any request
     * whose signature does not match — preventing spoofed payment events.
     *
     * Docs: https://paystack.com/docs/payments/webhooks/#verify-event-origin
     */
    @PostMapping("/webhook/paystack")
    public ResponseEntity<Map<String, String>> paystackWebhook(
            @RequestBody String rawBody,
            @RequestHeader(value = "x-paystack-signature", required = false) String signature) {

        // 1. Reject immediately if the signature header is missing
        if (signature == null || signature.isBlank()) {
            log.warn("Paystack webhook received with no signature — rejected");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("error", "Missing signature"));
        }

        // 2. Recompute HMAC-SHA512 over the raw request body
        if (!isValidPaystackSignature(rawBody, signature)) {
            log.warn("Paystack webhook signature mismatch — possible spoofed request");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("error", "Invalid signature"));
        }

        // 3. Signature is valid — parse and handle the event
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper =
                new com.fasterxml.jackson.databind.ObjectMapper();
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = mapper.readValue(rawBody, Map.class);

            String event = (String) payload.get("event");
            log.info("Paystack webhook received: event={}", event);

            if ("charge.success".equals(event)) {
                @SuppressWarnings("unchecked")
                Map<String, Object> data = (Map<String, Object>) payload.get("data");
                String reference = (String) data.get("reference");
                transactionService.verifyTransaction(reference);
            }
        } catch (Exception e) {
            // Return 200 to Paystack even on parse errors — Paystack retries on non-2xx.
            // Log it so you can investigate, but don't expose internal detail.
            log.error("Failed to process Paystack webhook body", e);
        }

        return ResponseEntity.ok(Map.of("status", "received"));
    }

    @GetMapping("/my")
    public ResponseEntity<List<TransactionResponse>> myTransactions(
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader(value = "X-User-Role", defaultValue = "BUYER") String role) {
        return ResponseEntity.ok(transactionService.getMyTransactions(userId, role));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TransactionResponse> getOne(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(transactionService.getTransaction(id, userId));
    }

    /** GET /api/v1/commissions/my — agent's commission records */
    @GetMapping("/commissions/my")
    public ResponseEntity<List<CommissionResponse>> myCommissions(
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(transactionService.getMyCommissions(userId));
    }

    /** GET /api/v1/transactions/commissions/all — all commissions (ADMIN only) */
    @GetMapping("/commissions/all")
    public ResponseEntity<List<CommissionResponse>> allCommissions(
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!"ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(transactionService.getAllCommissions());
    }

    // ─── Private helpers ────────────────────────────────────────────────────

    /**
     * Verifies the Paystack webhook signature.
     *
     * Algorithm: HMAC-SHA512(secretKey, rawBody) — compare hex digest to header.
     * Uses constant-time comparison (MessageDigest.isEqual) to prevent
     * timing-based attacks.
     */
    private boolean isValidPaystackSignature(String rawBody, String receivedSignature) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(
                paystackSecretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            byte[] digest = mac.doFinal(rawBody.getBytes(StandardCharsets.UTF_8));
            String expectedSignature = HexFormat.of().formatHex(digest);

            // Constant-time comparison — avoids leaking timing info
            return java.security.MessageDigest.isEqual(
                expectedSignature.getBytes(StandardCharsets.UTF_8),
                receivedSignature.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            log.error("Signature verification error", e);
            return false;
        }
    }
}