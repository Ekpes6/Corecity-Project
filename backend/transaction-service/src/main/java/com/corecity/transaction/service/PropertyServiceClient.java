package com.corecity.transaction.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.HashMap;
import java.util.Map;

/**
 * WebClient-based client for calling property-service internal endpoints.
 * Runs on the Docker network (http://property-service:8082) without going through the api-gateway.
 * All errors are caught and logged — a property-service failure MUST NOT cause the transaction
 * verification to fail from the buyer's perspective.
 */
@Service
@Slf4j
public class PropertyServiceClient {

    private final WebClient webClient;

    public PropertyServiceClient(
            WebClient.Builder builder,
            @Value("${services.property-service-url:http://property-service:8082}") String propertyServiceUrl) {
        this.webClient = builder.baseUrl(java.util.Objects.requireNonNull(propertyServiceUrl)).build();
    }

    /**
     * Notify property-service that a PURCHASE or RENT transaction succeeded.
     * Property-service will mark the reservation COMPLETED, update property status,
     * and create a lifecycle record.
     *
     * @param propertyId      the property involved in the transaction
     * @param buyerId         the buyer who made the payment
     * @param transactionType "PURCHASE" or "RENT"
     * @param leaseDays       optional rental duration (null → property-service defaults apply)
     */
    public void completeReservation(Long propertyId, Long buyerId, String transactionType, Integer leaseDays) {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("propertyId", propertyId);
            body.put("buyerId", buyerId);
            body.put("transactionType", transactionType);
            if (leaseDays != null) {
                body.put("leaseDays", leaseDays);
            }

            webClient.post()
                .uri("/api/v1/reservations/internal/complete")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Void.class)
                .block();

            log.info("property-service notified: reservation completed for property={} buyer={} type={}",
                propertyId, buyerId, transactionType);
        } catch (Exception e) {
            // Non-critical: the transaction is already SUCCESS in our DB.
            // Log the failure for alerting/retry but don't propagate — buyer must not
            // see a 500 because property-service is temporarily unreachable.
            log.warn("Failed to notify property-service of completed reservation (property={} buyer={}): {}",
                propertyId, buyerId, e.getMessage());
        }
    }
}
