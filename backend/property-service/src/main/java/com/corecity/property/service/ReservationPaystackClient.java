package com.corecity.property.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Objects;

/**
 * Thin Paystack client used by property-service exclusively for the ₦1,000
 * reservation fee.  Transaction-service handles all other payment types.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReservationPaystackClient {

    @Value("${paystack.secret-key}")
    private String secretKey;

    @Value("${paystack.callback-url:https://corecity.com.ng/payment/verify}")
    private String callbackUrl;

    private static final String PAYSTACK_BASE = "https://api.paystack.co";

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    public record InitResult(String authorizationUrl, String reference, String accessCode) {}
    public record VerifyResult(boolean success, String status, String channel) {}

    /** Initialise a ₦1,000 reservation payment on Paystack. */
    public InitResult initializeReservation(String email, BigDecimal amountNgn,
                                            String reference, Map<String, Object> meta) {
        long amountKobo = amountNgn.multiply(BigDecimal.valueOf(100)).longValue();

        Map<String, Object> body = Objects.requireNonNull(Map.of(
            "email", email,
            "amount", amountKobo,
            "reference", reference,
            "currency", "NGN",
            "callback_url", callbackUrl,
            "metadata", meta,
            "channels", new String[]{"card", "bank", "ussd", "bank_transfer", "qr"}
        ), "paystack request body must not be null");

        try {
            String response = webClientBuilder.build()
                .post()
                .uri(PAYSTACK_BASE + "/transaction/initialize")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + secretKey)
                .header(HttpHeaders.CONTENT_TYPE, "application/json")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .block();

            JsonNode root = objectMapper.readTree(response);
            JsonNode data = root.path("data");
            return new InitResult(
                data.path("authorization_url").asText(),
                data.path("reference").asText(),
                data.path("access_code").asText()
            );
        } catch (Exception e) {
            log.error("Paystack reservation init failed: {}", e.getMessage());
            throw new RuntimeException("Payment gateway unavailable – please try again later");
        }
    }

    /** Verify that a Paystack reservation payment succeeded. */
    public VerifyResult verifyReservation(String reference) {
        try {
            String response = webClientBuilder.build()
                .get()
                .uri(PAYSTACK_BASE + "/transaction/verify/" + reference)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + secretKey)
                .retrieve()
                .bodyToMono(String.class)
                .block();

            JsonNode root = objectMapper.readTree(response);
            JsonNode data = root.path("data");
            String status = data.path("status").asText();
            String channel = data.path("channel").asText("");
            return new VerifyResult("success".equals(status), status, channel);
        } catch (Exception e) {
            log.error("Paystack reservation verify failed: {}", e.getMessage());
            return new VerifyResult(false, "error", "");
        }
    }
}
