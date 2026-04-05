package com.corecity.transaction.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaystackService {

    @Value("${paystack.secret-key}")
    private String secretKey;

    private static final String PAYSTACK_BASE = "https://api.paystack.co";
    // Nigerian service fee: 1.5% + ₦100 (capped at ₦2,000)
    private static final BigDecimal FEE_RATE = new BigDecimal("0.015");
    private static final BigDecimal FEE_FLAT = new BigDecimal("100");
    private static final BigDecimal FEE_CAP  = new BigDecimal("2000");

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    public record InitResult(String authorizationUrl, String reference, String accessCode) {}
    public record VerifyResult(boolean success, String status, String channel, JsonNode data) {}

    /** Initialise a Paystack transaction — returns checkout URL */
    public InitResult initializeTransaction(
            String email, BigDecimal amountNgn, String reference, Map<String, Object> meta) {

        // Paystack amounts are in kobo (1 NGN = 100 kobo)
        long amountKobo = amountNgn.multiply(BigDecimal.valueOf(100)).longValue();

        Map<String, Object> body = Map.of(
            "email", email,
            "amount", amountKobo,
            "reference", reference,
            "currency", "NGN",
            "callback_url", "https://corecity.com.ng/payment/verify",
            "metadata", meta,
            "channels", new String[]{"card", "bank", "ussd", "bank_transfer", "qr"}
        );

        try {
            String response = webClientBuilder.build()
                .post()
                .uri(PAYSTACK_BASE + "/transaction/initialize")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + secretKey)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .block();

            JsonNode node = objectMapper.readTree(response);
            JsonNode data = node.get("data");
            return new InitResult(
                data.get("authorization_url").asText(),
                data.get("reference").asText(),
                data.get("access_code").asText()
            );
        } catch (Exception e) {
            log.error("Paystack init failed: {}", e.getMessage());
            throw new RuntimeException("Payment initialization failed");
        }
    }

    /** Verify a Paystack transaction by reference */
    public VerifyResult verifyTransaction(String reference) {
        try {
            String response = webClientBuilder.build()
                .get()
                .uri(PAYSTACK_BASE + "/transaction/verify/" + reference)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + secretKey)
                .retrieve()
                .bodyToMono(String.class)
                .block();

            JsonNode node = objectMapper.readTree(response);
            boolean apiStatus = node.get("status").asBoolean();
            JsonNode data = node.get("data");
            String txStatus = data.get("status").asText();   // "success" | "failed"
            String channel  = data.has("channel") ? data.get("channel").asText() : "unknown";
            return new VerifyResult(apiStatus && "success".equals(txStatus), txStatus, channel, data);
        } catch (Exception e) {
            log.error("Paystack verify failed: {}", e.getMessage());
            throw new RuntimeException("Payment verification failed");
        }
    }

    /** Calculate Nigerian Paystack service fee */
    public BigDecimal calculateFee(BigDecimal amount) {
        BigDecimal fee = amount.multiply(FEE_RATE).add(FEE_FLAT);
        return fee.compareTo(FEE_CAP) > 0 ? FEE_CAP : fee;
    }
}
