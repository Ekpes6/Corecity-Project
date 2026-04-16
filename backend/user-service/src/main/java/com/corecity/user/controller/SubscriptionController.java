package com.corecity.user.controller;

import com.corecity.user.dto.SubscriptionDTOs.*;
import com.corecity.user.service.SubscriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/subscriptions")
@RequiredArgsConstructor
@Slf4j
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

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
