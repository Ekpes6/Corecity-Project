package com.corecity.transaction.controller;

import com.corecity.transaction.service.TransactionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.Objects;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TransactionController.class)
class TransactionControllerWebhookTest {

    @Autowired MockMvc mockMvc;
    @MockBean TransactionService transactionService;

    @Autowired TransactionController controller;

    private static final String TEST_SECRET = "sk_test_webhook_secret_for_tests";
    private static final String CHARGE_SUCCESS_BODY = """
        {
          "event": "charge.success",
          "data": { "reference": "HLK-123456" }
        }
        """;

    @BeforeEach
    void injectSecret() {
        TransactionController target = Objects.requireNonNull(controller, "controller must be autowired");
        ReflectionTestUtils.setField(target, "paystackSecretKey", TEST_SECRET);
    }

    @Test
    void webhook_validSignature_returns200AndProcesses() throws Exception {
        String signature = computeHmac(TEST_SECRET, CHARGE_SUCCESS_BODY);

        mockMvc.perform(post("/api/v1/transactions/webhook/paystack")
            .contentType("application/json")
                .content(CHARGE_SUCCESS_BODY)
                .header("x-paystack-signature", signature))
            .andExpect(status().isOk());

        verify(transactionService).verifyTransaction("HLK-123456");
    }

    @Test
    void webhook_invalidSignature_returns401_doesNotProcess() throws Exception {
        mockMvc.perform(post("/api/v1/transactions/webhook/paystack")
            .contentType("application/json")
                .content(CHARGE_SUCCESS_BODY)
                .header("x-paystack-signature", "aaaabbbbccccdddd_wrong_signature"))
            .andExpect(status().isUnauthorized());

        verifyNoInteractions(transactionService);
    }

    @Test
    void webhook_missingSignature_returns401_doesNotProcess() throws Exception {
        mockMvc.perform(post("/api/v1/transactions/webhook/paystack")
            .contentType("application/json")
                .content(CHARGE_SUCCESS_BODY))
            .andExpect(status().isUnauthorized());

        verifyNoInteractions(transactionService);
    }

    @Test
    void webhook_unknownEvent_returns200_doesNotProcess() throws Exception {
        String body = """
            { "event": "transfer.success", "data": {} }
            """;
        String signature = computeHmac(TEST_SECRET, body);

        mockMvc.perform(post("/api/v1/transactions/webhook/paystack")
            .contentType("application/json")
                .content(body)
                .header("x-paystack-signature", signature))
            .andExpect(status().isOk());

        verifyNoInteractions(transactionService);
    }

    private static String computeHmac(String secret, String body) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA512");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
        return HexFormat.of().formatHex(mac.doFinal(body.getBytes(StandardCharsets.UTF_8)));
    }
}