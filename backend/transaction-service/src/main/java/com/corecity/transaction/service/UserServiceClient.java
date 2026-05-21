package com.corecity.transaction.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Objects;

/**
 * WebClient-based client for calling user-service internal endpoints.
 * Used by TransactionService to debit the buyer's wallet when paying with wallet.
 * Runs on the Docker network (http://user-service:8081) without going through the api-gateway.
 */
@Service
@Slf4j
public class UserServiceClient {

    private final WebClient webClient;

    public UserServiceClient(
            WebClient.Builder builder,
            @Value("${services.user-service-url:http://user-service:8081}") String userServiceUrl) {
        this.webClient = builder.baseUrl(Objects.requireNonNull(userServiceUrl)).build();
    }

    /**
     * Debit a user's wallet via the user-service internal endpoint.
     * Throws ResponseStatusException with the upstream status code on failure
     * (e.g. 400 if the wallet balance is insufficient).
     */
    public void debitWallet(Long userId, BigDecimal amount, String reference, String description) {
        Map<String, Object> body = Map.of(
            "userId", userId,
            "amount", amount,
            "reference", reference,
            "description", description
        );
        try {
            webClient.post()
                .uri("/api/v1/users/internal/wallet/debit")
                .contentType(java.util.Objects.requireNonNull(org.springframework.http.MediaType.APPLICATION_JSON))
                .bodyValue(java.util.Objects.requireNonNull((Object) body))
                .retrieve()
                .toBodilessEntity()
                .block();
            log.info("Wallet debited for user={} amount={} ref={}", userId, amount, reference);
        } catch (WebClientResponseException e) {
            // Propagate the upstream error (e.g. 400 Insufficient balance) to TransactionService
            throw new org.springframework.web.server.ResponseStatusException(
                e.getStatusCode(), e.getResponseBodyAsString());
        } catch (Exception e) {
            log.error("wallet debit call failed for user {}: {}", userId, e.getMessage());
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,
                "Wallet service unavailable — please try again");
        }
    }

    /**
     * Look up a user's role via the user-service internal endpoint.
     * Returns the role string (e.g. "AGENT", "SELLER") or "SELLER" as a safe fallback.
     * Used by TransactionService to select AGENT (7%/3%) vs SELLER (5%/5%) commission rates.
     */
    public String getUserRole(Long userId) {
        try {
            @SuppressWarnings("unchecked")
            java.util.Map<String, String> resp = webClient.get()
                .uri("/api/v1/users/internal/user-role/" + userId)
                .retrieve()
                .bodyToMono((Class<java.util.Map<String, String>>) (Class<?>) java.util.Map.class)
                .timeout(java.time.Duration.ofSeconds(5))
                .block();
            return resp != null ? resp.getOrDefault("role", "SELLER") : "SELLER";
        } catch (Exception e) {
            log.warn("getUserRole call failed for user={}: {} — defaulting to SELLER", userId, e.getMessage());
            return "SELLER";
        }
    }

    /**
     * Credit a user's wallet via the user-service internal endpoint.
     * Failures are swallowed and logged — commission disbursement must not roll back the transaction.
     */
    public void creditWallet(Long userId, BigDecimal amount, String reference, String description) {
        Map<String, Object> body = Map.of(
            "userId", userId,
            "amount", amount,
            "reference", reference,
            "description", description
        );
        try {
            webClient.post()
                .uri("/api/v1/users/internal/wallet/credit")
                .contentType(java.util.Objects.requireNonNull(org.springframework.http.MediaType.APPLICATION_JSON))
                .bodyValue(java.util.Objects.requireNonNull((Object) body))
                .retrieve()
                .toBodilessEntity()
                .timeout(java.time.Duration.ofSeconds(10))
                .block();
            log.info("Wallet credited for user={} amount={} ref={}", userId, amount, reference);
        } catch (Exception e) {
            log.warn("wallet credit call failed for user={} ref={}: {}", userId, reference, e.getMessage());
        }
    }

    /**
     * Contact info record returned by getUserInfo().
     */
    public record UserInfo(Long id, String firstName, String lastName, String email, String phone) {}

    /**
     * Fetches a user's basic contact details for notification enrichment.
     * Returns null on any failure so callers can safely proceed without this data.
     */
    public UserInfo getUserInfo(Long userId) {
        if (userId == null) return null;
        try {
            @SuppressWarnings("unchecked")
            java.util.Map<String, String> resp = webClient.get()
                .uri("/api/v1/users/internal/user-info/" + userId)
                .retrieve()
                .bodyToMono((Class<java.util.Map<String, String>>) (Class<?>) java.util.Map.class)
                .timeout(java.time.Duration.ofSeconds(5))
                .block();
            if (resp == null) return null;
            return new UserInfo(userId,
                resp.get("firstName"), resp.get("lastName"),
                resp.get("email"), resp.get("phone"));
        } catch (Exception e) {
            log.warn("getUserInfo call failed for user={}: {}", userId, e.getMessage());
            return null;
        }
    }
}
