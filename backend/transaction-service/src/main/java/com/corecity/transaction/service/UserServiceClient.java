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
                .bodyValue(java.util.Objects.requireNonNull((Object) body))
                .retrieve()
                .bodyToMono(Void.class)
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
}
