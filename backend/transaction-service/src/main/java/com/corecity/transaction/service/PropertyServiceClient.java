package com.corecity.transaction.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

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
        this.webClient = builder.baseUrl(Objects.requireNonNull(propertyServiceUrl)).build();
    }

    /**
     * Fetch the current status of a property from property-service.
     * Returns null if the property cannot be reached (treat as non-blocking).
     */
    public String getPropertyStatus(Long propertyId) {
        try {
            return webClient.get()
                .uri("/api/v1/properties/" + propertyId)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .timeout(Duration.ofSeconds(5))
                .map(node -> node.path("status").asText(null))
                .block();
        } catch (Exception e) {
            log.warn("Could not fetch property {} status: {}", propertyId, e.getMessage());
            return null;
        }
    }

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
                .header("X-User-Id", String.valueOf(buyerId))
                .bodyValue(body)
                .retrieve()
                .toBodilessEntity()
                .timeout(Duration.ofSeconds(15))
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
