package com.corecity.user.controller;

import com.corecity.user.entity.Wallet;
import com.corecity.user.entity.WalletTransaction;
import com.corecity.user.entity.WithdrawalRequest;
import com.corecity.user.service.WalletService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/users/me/wallet")
@RequiredArgsConstructor
@Slf4j
public class WalletController {

    private final WalletService walletService;
    private final ObjectMapper objectMapper;

    @Value("${paystack.secret-key}")
    private String paystackSecretKey;

    @GetMapping
    public ResponseEntity<Wallet> getWallet(
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(walletService.getOrCreateWallet(userId));
    }

    @PostMapping("/fund")
    public ResponseEntity<Map<String, String>> fundWallet(
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Email") String userEmail,
            @RequestBody Map<String, Object> body) {

        Object amountRaw = body.get("amount");
        if (amountRaw == null) {
            return ResponseEntity.badRequest().build();
        }

        BigDecimal amount;
        try {
            amount = new BigDecimal(amountRaw.toString());
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().build();
        }

        WalletService.FundInitResult result = walletService.initiateWalletFunding(userId, userEmail, amount);
        return ResponseEntity.ok(Map.of(
            "reference", result.reference(),
            "authorizationUrl", result.authorizationUrl()
        ));
    }

    @GetMapping("/transactions")
    public ResponseEntity<List<WalletTransaction>> getTransactions(
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(walletService.getTransactionHistory(userId));
    }

    /** Re-fetches the Paystack payment URL for a PENDING wallet top-up. */
    @PostMapping("/transactions/{reference}/resume")
    public ResponseEntity<Map<String, String>> resumePayment(
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Email") String userEmail,
            @PathVariable String reference) {
        String url = walletService.resumeWalletFunding(userId, reference, userEmail);
        return ResponseEntity.ok(Map.of("authorizationUrl", url));
    }

    /** Verifies a PENDING top-up with Paystack and credits the wallet if confirmed paid. */
    @PostMapping("/transactions/{reference}/verify")
    public ResponseEntity<Map<String, String>> verifyPayment(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable String reference) {
        String result = walletService.verifyWalletFunding(userId, reference);
        String message = "already_credited".equals(result)
            ? "Wallet was already credited for this transaction."
            : "Payment verified. Wallet has been credited.";
        return ResponseEntity.ok(Map.of("status", result, "message", message));
    }

    // ── Withdrawal endpoints ──────────────────────────────────────────────────

    /**
     * POST /api/v1/users/me/wallet/withdraw
     * Initiates a withdrawal from the wallet to the user's primary bank account.
     * The wallet is debited immediately; admin processes the bank transfer.
     */
    @PostMapping("/withdraw")
    public ResponseEntity<WithdrawalRequest> withdraw(
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody Map<String, Object> body) {
        Object amountRaw = body.get("amount");
        if (amountRaw == null) {
            return ResponseEntity.badRequest().build();
        }
        java.math.BigDecimal amount;
        try {
            amount = new java.math.BigDecimal(amountRaw.toString());
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(walletService.initiateWithdrawal(userId, amount));
    }

    /** GET /api/v1/users/me/wallet/withdrawals — caller's withdrawal history. */
    @GetMapping("/withdrawals")
    public ResponseEntity<List<WithdrawalRequest>> getWithdrawals(
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(walletService.getWithdrawals(userId));
    }

    /** GET /api/v1/users/me/wallet/withdrawals/all — admin: all withdrawal requests. */
    @GetMapping("/withdrawals/all")
    public ResponseEntity<List<WithdrawalRequest>> getAllWithdrawals(
            @RequestHeader("X-User-Id") Long userId) {
        if (!walletService.isAdmin(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(walletService.getAllWithdrawals());
    }

    /**
     * POST /api/v1/users/me/wallet/withdrawals/{id}/process
     * Admin: mark a PENDING withdrawal as PROCESSED (bank transfer sent) or REJECTED (refund wallet).
     * Body: { "status": "PROCESSED"|"REJECTED", "adminNote": "optional note" }
     * Note: Using POST instead of PATCH because Spring Cloud Gateway drops injected headers
     * (X-User-Id) on PATCH requests that carry a request body (reactive pipeline limitation).
     */
    @PostMapping("/withdrawals/{id}/process")
    public ResponseEntity<WithdrawalRequest> processWithdrawal(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        if (!walletService.isAdmin(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Object statusRaw = body.get("status");
        if (statusRaw == null) {
            return ResponseEntity.badRequest().build();
        }
        WithdrawalRequest.Status newStatus;
        try {
            newStatus = WithdrawalRequest.Status.valueOf(statusRaw.toString().toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
        String adminNote = body.get("adminNote") != null ? body.get("adminNote").toString() : null;
        return ResponseEntity.ok(walletService.processWithdrawal(id, newStatus, adminNote));
    }

    /**
     * Paystack webhook endpoint for wallet funding events.
     *
     * Security: every request is verified using HMAC-SHA512 of the raw request body
     * signed with the Paystack secret key (sent in the X-Paystack-Signature header).
     * Requests without a valid signature are silently ignored with HTTP 200 so
     * Paystack does not retry them as failures.
     */
    @PostMapping("/webhook")
    public ResponseEntity<Void> handleWebhook(
            @RequestBody String rawBody,
            @RequestHeader(value = "X-Paystack-Signature", required = false) String paystackSignature) {

        // ── 1. Reject missing signature ──────────────────────────────────────
        if (paystackSignature == null || paystackSignature.isBlank()) {
            log.warn("Paystack webhook received without X-Paystack-Signature header — ignoring");
            return ResponseEntity.ok().build();
        }

        // ── 2. Verify HMAC-SHA512 signature ──────────────────────────────────
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(paystackSecretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            byte[] hash = mac.doFinal(rawBody.getBytes(StandardCharsets.UTF_8));
            String expectedSignature = HexFormat.of().formatHex(hash);

            // Constant-time comparison to prevent timing attacks
            if (!MessageDigest.isEqual(
                    expectedSignature.getBytes(StandardCharsets.UTF_8),
                    paystackSignature.getBytes(StandardCharsets.UTF_8))) {
                log.warn("Paystack webhook signature mismatch — ignoring");
                return ResponseEntity.ok().build();
            }
        } catch (Exception e) {
            log.error("Webhook signature verification error: {}", e.getMessage());
            return ResponseEntity.ok().build();
        }

        // ── 3. Parse and process ─────────────────────────────────────────────
        try {
            JsonNode payload = objectMapper.readTree(rawBody);
            String event = payload.path("event").asText(null);
            if (!"charge.success".equals(event)) {
                return ResponseEntity.ok().build();
            }

            String reference = payload.path("data").path("reference").asText(null);
            if (reference == null || !reference.startsWith("WLT-")) {
                return ResponseEntity.ok().build();
            }

            walletService.creditWalletFromWebhook(reference);
        } catch (Exception e) {
            log.error("Wallet webhook processing error: {}", e.getMessage());
        }
        return ResponseEntity.ok().build();
    }
}
