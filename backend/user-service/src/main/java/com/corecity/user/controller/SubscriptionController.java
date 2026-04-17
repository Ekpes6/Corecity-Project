package com.corecity.user.controller;

import com.corecity.user.dto.SubscriptionDTOs.*;
import com.corecity.user.service.SubscriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/subscriptions")
@RequiredArgsConstructor
@Slf4j
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    @Value("${paystack.secret-key}")
    private String paystackSecretKey;

    /** GET /api/v1/subscriptions/plans — public catalogue of all plans */
    @GetMapping("/plans")
    public ResponseEntity<List<PlanInfo>> listPlans() {
        return ResponseEntity.ok(subscriptionService.listPlans());
    }

    /**
     * POST /api/v1/subscriptions — subscribe to a plan.
     * Allowed roles: AGENT (can use loans), SELLER (subscriptions only, no loans).
     */
    @PostMapping
    public ResponseEntity<SubscriptionInitResponse> subscribe(
            @Valid @RequestBody SubscribeRequest req,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Email") String userEmail,
            @RequestHeader("X-User-Role") String userRole) {
        if (!"AGENT".equalsIgnoreCase(userRole) && !"SELLER".equalsIgnoreCase(userRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(null);
        }
        log.info("Subscription request for plan {} by user {} ({})", req.getPlan(), userId, userRole);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(subscriptionService.subscribe(req, userId, userEmail, userRole));
    }

    /** GET /api/v1/subscriptions/my — user's own subscriptions */
    @GetMapping("/my")
    public ResponseEntity<List<SubscriptionResponse>> mySubscriptions(
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(subscriptionService.getMySubscriptions(userId));
    }

    /**
     * GET /api/v1/subscriptions/active-check — does this user have an active product?
     * Called by property-service to gate property creation.
     */
    @GetMapping("/active-check")
    public ResponseEntity<ActiveProductResponse> activeCheck(
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(subscriptionService.getActiveProduct(userId));
    }

    /**
     * Paystack webhook — POST /api/v1/subscriptions/webhook/paystack.
     * Validates HMAC-SHA512 signature before processing. Handles:
     *   charge.success  → activate subscription (and loan if applicable)
     *   charge.failed   → mark subscription as FAILED
     */
    @PostMapping("/webhook/paystack")
    public ResponseEntity<Void> webhook(
            @RequestHeader(value = "x-paystack-signature", required = false) String signature,
            @RequestBody String rawBody) {

        // ── HMAC-SHA512 verification ──────────────────────────────────────────
        if (!verifyHmac(rawBody, signature)) {
            log.warn("Paystack webhook: invalid or missing signature");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = mapper.readValue(rawBody, Map.class);
            String event = (String) payload.getOrDefault("event", "");
            @SuppressWarnings("unchecked")
            Map<String, Object> data = (Map<String, Object>) payload.get("data");

            if (data != null) {
                String reference = (String) data.get("reference");
                if (reference != null && reference.startsWith("SUB-")) {
                    if ("charge.success".equals(event)) {
                        subscriptionService.activateSubscription(reference);
                    } else if ("charge.failed".equals(event)) {
                        subscriptionService.failSubscription(reference);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Paystack webhook parse error: {}", e.getMessage());
        }

        return ResponseEntity.ok().build();
    }

    // ── Loans ─────────────────────────────────────────────────────────────────

    /** GET /api/v1/subscriptions/loans/my — agent's loan records */
    @GetMapping("/loans/my")
    public ResponseEntity<List<LoanResponse>> myLoans(
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(subscriptionService.getMyLoans(userId));
    }

    /** POST /api/v1/subscriptions/loans/{loanId}/repay — record a repayment */
    @PostMapping("/loans/{loanId}/repay")
    public ResponseEntity<LoanResponse> repay(
            @PathVariable Long loanId,
            @RequestParam BigDecimal amount,
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(subscriptionService.repayLoan(loanId, amount, userId));
    }

    // ── Loan Program ──────────────────────────────────────────────────────────

    /** GET /api/v1/subscriptions/loan-program/my — agent's 13-trial progression */
    @GetMapping("/loan-program/my")
    public ResponseEntity<LoanProgramResponse> myLoanProgram(
            @RequestHeader("X-User-Id") Long userId) {
        Optional<LoanProgramResponse> program = subscriptionService.getLoanProgram(userId);
        return program.map(ResponseEntity::ok)
                      .orElse(ResponseEntity.noContent().build());
    }

    // ── HMAC helper ───────────────────────────────────────────────────────────

    private boolean verifyHmac(String body, String signature) {
        if (signature == null || signature.isBlank()) return false;
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(paystackSecretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            byte[] digest = mac.doFinal(body.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) sb.append(String.format("%02x", b));
            String computed = sb.toString();
            // Constant-time comparison to prevent timing attacks
            if (computed.length() != signature.length()) return false;
            int result = 0;
            for (int i = 0; i < computed.length(); i++) {
                result |= computed.charAt(i) ^ signature.charAt(i);
            }
            return result == 0;
        } catch (Exception e) {
            log.error("HMAC verification error: {}", e.getMessage());
            return false;
        }
    }
}


    /** GET /api/v1/subscriptions/plans — public catalogue of all plans */
    @GetMapping("/plans")
    public ResponseEntity<List<PlanInfo>> listPlans() {
        return ResponseEntity.ok(subscriptionService.listPlans());
    }

    /**
     * POST /api/v1/subscriptions — subscribe to a plan.
     * Requires AGENT role (enforced via X-User-Role header injected by gateway).
     */
    @PostMapping
    public ResponseEntity<SubscriptionInitResponse> subscribe(
            @Valid @RequestBody SubscribeRequest req,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Email") String userEmail,
            @RequestHeader("X-User-Role") String userRole) {
        if (!"AGENT".equalsIgnoreCase(userRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(null);
        }
        log.info("Subscription request for plan {} by agent {}", req.getPlan(), userId);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(subscriptionService.subscribe(req, userId, userEmail));
    }

    /** GET /api/v1/subscriptions/my — agent's own subscriptions */
    @GetMapping("/my")
    public ResponseEntity<List<SubscriptionResponse>> mySubscriptions(
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(subscriptionService.getMySubscriptions(userId));
    }

    /**
     * Paystack webhook for subscription payments.
     * POST /api/v1/subscriptions/webhook/paystack
     */
    @PostMapping("/webhook/paystack")
    public ResponseEntity<Void> webhook(
            @RequestBody Map<String, Object> payload) {
        String event = (String) payload.getOrDefault("event", "");
        if ("charge.success".equals(event)) {
            @SuppressWarnings("unchecked")
            Map<String, Object> data = (Map<String, Object>) payload.get("data");
            if (data != null) {
                String reference = (String) data.get("reference");
                if (reference != null && reference.startsWith("SUB-")) {
                    try {
                        subscriptionService.activateSubscription(reference);
                    } catch (Exception e) {
                        log.warn("Could not activate subscription for ref {}: {}", reference, e.getMessage());
                    }
                }
            }
        }
        return ResponseEntity.ok().build();
    }

    // ── Loans ─────────────────────────────────────────────────────────────────

    /** GET /api/v1/subscriptions/loans/my — agent's loan records */
    @GetMapping("/loans/my")
    public ResponseEntity<List<LoanResponse>> myLoans(
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(subscriptionService.getMyLoans(userId));
    }

    /** POST /api/v1/subscriptions/loans/{loanId}/repay — record a repayment */
    @PostMapping("/loans/{loanId}/repay")
    public ResponseEntity<LoanResponse> repay(
            @PathVariable Long loanId,
            @RequestParam BigDecimal amount,
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(subscriptionService.repayLoan(loanId, amount, userId));
    }
}
