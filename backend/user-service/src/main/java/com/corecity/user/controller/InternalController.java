package com.corecity.user.controller;

import com.corecity.user.service.WalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Internal service-to-service endpoints.
 * These paths are NOT exposed through the API Gateway — other services call
 * user-service directly on the Docker network (http://user-service:8081).
 * No auth headers are required or verified here.
 */
@RestController
@RequestMapping("/api/v1/users/internal")
@RequiredArgsConstructor
@Slf4j
public class InternalController {

    private final WalletService walletService;

    /**
     * Debit a user's wallet on behalf of another service (e.g., property-service, transaction-service).
     * Body: { "userId": Long, "amount": BigDecimal, "reference": String, "description": String }
     * Returns 200 on success, 400 if insufficient balance (WalletService throws ResponseStatusException).
     */
    @PostMapping("/wallet/debit")
    public ResponseEntity<Void> internalDebit(@RequestBody Map<String, Object> body) {
        Long userId      = Long.valueOf(body.get("userId").toString());
        BigDecimal amount = new BigDecimal(body.get("amount").toString());
        String reference  = body.get("reference").toString();
        String description = body.get("description").toString();

        log.info("Internal wallet debit: userId={} amount={} ref={}", userId, amount, reference);
        walletService.debitWallet(userId, amount, reference, description);
        return ResponseEntity.ok().build();
    }
}
