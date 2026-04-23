package com.corecity.property.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

/**
 * Calls user-service to check whether a user has an active financial product
 * (subscription or loan). Used to gate property creation for AGENT/SELLER roles.
 */
@Service
public class UserServiceClient {

    private static final Logger log = LoggerFactory.getLogger(UserServiceClient.class);

    private final WebClient webClient;

    public UserServiceClient(WebClient.Builder builder,
                             @Value("${services.user-service-url:http://user-service:8081}") @NonNull String userServiceUrl) {
        this.webClient = builder.baseUrl(userServiceUrl).build();
    }

    /**
     * Returns true if the given user has an active subscription or active loan.
     * On any error (network, timeout, 4xx) the check defaults to BLOCKED
     * to prevent listing without a verified active product.
     */
    public boolean hasActiveProduct(Long userId) {
        ActiveProductResponse response = getActiveProductResponse(userId);
        return response != null && response.isHasActiveProduct();
    }

    /**
     * Returns the access level for a user:
     *   FULL        — active subscription or repaid loan
     *   LIMITED     — loan ACTIVE (unpaid)
     *   RESTRICTED  — loan OVERDUE
     *   NONE        — no active product
     * Defaults to NONE on any error.
     */
    public String getAccessLevel(Long userId) {
        ActiveProductResponse response = getActiveProductResponse(userId);
        if (response == null || response.getAccessLevel() == null) return "NONE";
        return response.getAccessLevel();
    }

    private ActiveProductResponse getActiveProductResponse(Long userId) {
        try {
            return webClient.get()
                .uri("/api/v1/subscriptions/active-check")
                .header("X-User-Id", userId.toString())
                .retrieve()
                .bodyToMono(ActiveProductResponse.class)
                .block();
        } catch (WebClientResponseException e) {
            log.warn("user-service active-check returned {}: {}", e.getStatusCode(), e.getMessage());
            return null;
        } catch (Exception e) {
            log.error("user-service active-check failed: {}", e.getMessage());
            return null;
        }
    }

    /** Minimal DTO matching user-service's ActiveProductResponse. */
    public static class ActiveProductResponse {
        private boolean hasActiveProduct;
        private String productType;
        private String accessLevel;

        public boolean isHasActiveProduct() { return hasActiveProduct; }
        public void setHasActiveProduct(boolean v) { hasActiveProduct = v; }
        public String getProductType() { return productType; }
        public void setProductType(String v) { productType = v; }
        public String getAccessLevel() { return accessLevel; }
        public void setAccessLevel(String v) { accessLevel = v; }
    }
}
