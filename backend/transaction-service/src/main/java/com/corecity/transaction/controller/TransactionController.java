package com.corecity.transaction.controller;

import com.corecity.transaction.dto.TransactionDTOs.*;
import com.corecity.transaction.service.TransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    /** Initiate payment — returns Paystack checkout URL */
    @PostMapping("/initiate")
    public ResponseEntity<InitTransactionResponse> initiate(
            @Valid @RequestBody InitTransactionRequest req,
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(transactionService.initTransaction(req, userId));
    }

    /** Called after Paystack redirects back */
    @GetMapping("/verify/{reference}")
    public ResponseEntity<TransactionResponse> verify(@PathVariable String reference) {
        return ResponseEntity.ok(transactionService.verifyTransaction(reference));
    }

    /** Paystack webhook (server-to-server) */
    @PostMapping("/webhook/paystack")
    public ResponseEntity<Map<String, String>> paystackWebhook(
            @RequestBody Map<String, Object> payload,
            @RequestHeader(value = "x-paystack-signature", required = false) String signature) {
        // In production: verify HMAC-SHA512 signature here
        String event = (String) payload.get("event");
        if ("charge.success".equals(event)) {
            @SuppressWarnings("unchecked")
            Map<String, Object> data = (Map<String, Object>) payload.get("data");
            String reference = (String) data.get("reference");
            transactionService.verifyTransaction(reference);
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
}
