package com.corecity.user.controller;

import com.corecity.user.entity.User;
import com.corecity.user.repository.UserRepository;
import com.corecity.user.service.WalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
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
    private final UserRepository userRepository;

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

    /**
     * Returns a list of user IDs matching the given role (e.g. AGENT, BUYER).
     * Pass role=ALL to return every user ID.
     */
    @GetMapping("/ids-by-role")
    public ResponseEntity<List<Long>> getIdsByRole(@RequestParam String role) {
        List<Long> ids;
        if ("ALL".equalsIgnoreCase(role)) {
            ids = userRepository.findAll().stream().map(User::getId).toList();
        } else {
            try {
                User.Role r = User.Role.valueOf(role.toUpperCase());
                ids = userRepository.findByRole(r).stream().map(User::getId).toList();
            } catch (IllegalArgumentException e) {
                log.warn("Unknown role '{}' requested in ids-by-role", role);
                return ResponseEntity.ok(List.of());
            }
        }
        return ResponseEntity.ok(ids);
    }

    /**
     * Returns the numeric user ID for a given email address.
     * Response: { "id": 42 }
     */
    @GetMapping("/id-by-email")
    public ResponseEntity<Map<String, Long>> getIdByEmail(@RequestParam String email) {
        return userRepository.findByEmail(email.trim())
                .map(u -> ResponseEntity.ok(Map.of("id", u.getId())))
                .orElse(ResponseEntity.notFound().<Map<String, Long>>build());
    }
}
