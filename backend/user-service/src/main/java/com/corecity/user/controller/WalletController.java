package com.corecity.user.controller;

import com.corecity.user.entity.Wallet;
import com.corecity.user.entity.WalletTransaction;
import com.corecity.user.service.WalletService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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

    /**
     * Paystack webhook endpoint for wallet funding events.
     * Paystack sends POST with event type "charge.success".
     * References prefixed with WLT- are routed here; all others are ignored.
     *
     * Security: Paystack signatures should be verified in production.
     * This endpoint is intentionally at /api/v1/users/me/wallet/webhook so
     * the gateway forwards it. For stronger security, move to an /internal/ path.
     */
    @PostMapping("/webhook")
    public ResponseEntity<Void> handleWebhook(@RequestBody Map<String, Object> payload) {
        try {
            String event = (String) payload.get("event");
            if (!"charge.success".equals(event)) {
                return ResponseEntity.ok().build();
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> data = (Map<String, Object>) payload.get("data");
            if (data == null) return ResponseEntity.ok().build();

            String reference = (String) data.get("reference");
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
