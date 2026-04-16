package com.corecity.user.listener;

import com.corecity.user.service.ReputationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Listens for payment_success events published by transaction-service and awards
 * one system-validation reputation point to the agent (seller) for each
 * completed property sale or rental.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ReputationEventListener {

    private final ReputationService reputationService;

    @RabbitListener(queues = "reputation.queue")
    public void onPaymentSuccess(Map<String, Object> event) {
        try {
            Object sellerIdObj     = event.get("sellerId");
            Object transactionObj  = event.get("transactionId");

            if (sellerIdObj == null) {
                log.debug("Skipping reputation event: no sellerId present");
                return;
            }

            Long agentId       = toLong(sellerIdObj);
            Long transactionId = transactionObj != null ? toLong(transactionObj) : null;

            reputationService.awardSystemValidation(agentId, transactionId);
            log.debug("Reputation point awarded to agent {} for transaction {}", agentId, transactionId);
        } catch (Exception e) {
            // Non-critical: do not crash the listener, just log
            log.warn("Failed to process reputation event: {}", e.getMessage());
        }
    }

    private Long toLong(Object value) {
        if (value instanceof Number n) return n.longValue();
        return Long.parseLong(value.toString());
    }
}
