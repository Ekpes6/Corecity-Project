package com.corecity.notification.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

/**
 * Termii is a leading Nigerian bulk SMS provider.
 * Docs: https://developers.termii.com
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TermiiSmsService {

    @Value("${termii.api-key:}")
    private String apiKey;

    @Value("${termii.sender-id:corecity}")
    private String senderId;

    private static final String TERMII_BASE = "https://api.ng.termii.com/api";

    private final WebClient.Builder webClientBuilder;

    public boolean sendSms(String phoneNumber, String message) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("Termii API key not configured — skipping SMS to {}", phoneNumber);
            return false;
        }

        // Normalise Nigerian number: +2348012345678 → 2348012345678
        String normalised = phoneNumber.startsWith("+")
            ? phoneNumber.substring(1) : phoneNumber;

        Map<String, Object> body = Map.of(
            "to", normalised,
            "from", senderId,
            "sms", message,
            "type", "plain",
            "api_key", apiKey,
            "channel", "generic"
        );

        try {
            String response = webClientBuilder.build()
                .post()
                .uri(TERMII_BASE + "/sms/send")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .block();

            log.info("SMS sent to {} — response: {}", normalised, response);
            return true;
        } catch (Exception e) {
            log.error("SMS send failed to {}: {}", normalised, e.getMessage());
            return false;
        }
    }

    public boolean sendOtp(String phoneNumber, String otp) {
        String message = String.format(
            "Your corecity verification code is: %s. Valid for 10 minutes. Do not share.", otp);
        return sendSms(phoneNumber, message);
    }
}
