package com.corecity.transaction.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.corecity.transaction.dto.TransactionDTOs.*;
import com.corecity.transaction.entity.Transaction;
import com.corecity.transaction.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final PaystackService paystackService;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    @Transactional
    public InitTransactionResponse initTransaction(InitTransactionRequest req, Long buyerId) {
        BigDecimal fee = paystackService.calculateFee(req.getAmount());
        String reference = "HLK-" + Instant.now().toEpochMilli();

        // Persist in INITIATED state before hitting Paystack
        Transaction tx = Transaction.builder()
            .reference(reference)
            .propertyId(req.getPropertyId())
            .buyerId(buyerId)
            .sellerId(req.getSellerId())
            .amount(req.getAmount())
            .serviceFee(fee)
            .type(req.getType())
            .status(Transaction.TransactionStatus.INITIATED)
            .build();
        tx = transactionRepository.save(tx);

        // Call Paystack
        Map<String, Object> meta = Map.of(
            "propertyId", req.getPropertyId(),
            "transactionId", tx.getId(),
            "type", req.getType().name()
        );
        PaystackService.InitResult result =
            paystackService.initializeTransaction(req.getBuyerEmail(), req.getAmount().add(fee), reference, meta);

        // Update with Paystack URL
        tx.setAuthorizationUrl(result.authorizationUrl());
        tx.setStatus(Transaction.TransactionStatus.PENDING);
        transactionRepository.save(tx);

        return InitTransactionResponse.builder()
            .transactionId(tx.getId())
            .reference(reference)
            .authorizationUrl(result.authorizationUrl())
            .amount(req.getAmount())
            .serviceFee(fee)
            .totalAmount(req.getAmount().add(fee))
            .build();
    }

    @Transactional
    public TransactionResponse verifyTransaction(String reference) {
        Transaction tx = transactionRepository.findByReference(reference)
            .orElseThrow(() -> new RuntimeException("Transaction not found: " + reference));

        PaystackService.VerifyResult result = paystackService.verifyTransaction(reference);

        if (result.success()) {
            tx.setStatus(Transaction.TransactionStatus.SUCCESS);
            tx.setPaymentChannel(result.channel());
            try { tx.setPaystackData(objectMapper.writeValueAsString(result.data())); }
            catch (Exception ignored) {}

            // Notify both parties
            rabbitTemplate.convertAndSend("corecity.exchange", "notification.payment_success", Map.of(
                "buyerId", tx.getBuyerId(), "sellerId", tx.getSellerId(),
                "amount", tx.getAmount(), "reference", reference,
                "propertyId", tx.getPropertyId()
            ));
            log.info("Transaction {} verified successfully via {}", reference, result.channel());
        } else {
            tx.setStatus(Transaction.TransactionStatus.FAILED);
            log.warn("Transaction {} failed, Paystack status: {}", reference, result.status());
        }

        return toResponse(transactionRepository.save(tx));
    }

    public List<TransactionResponse> getMyTransactions(Long userId, String role) {
        List<Transaction> txs = "seller".equalsIgnoreCase(role)
            ? transactionRepository.findBySellerIdOrderByCreatedAtDesc(userId)
            : transactionRepository.findByBuyerIdOrderByCreatedAtDesc(userId);
        return txs.stream().map(this::toResponse).collect(Collectors.toList());
    }

    public TransactionResponse getTransaction(Long id, Long userId) {
        Transaction tx = transactionRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Transaction not found"));
        if (!tx.getBuyerId().equals(userId) && !tx.getSellerId().equals(userId))
            throw new RuntimeException("Unauthorized");
        return toResponse(tx);
    }

    private TransactionResponse toResponse(Transaction tx) {
        return TransactionResponse.builder()
            .id(tx.getId()).reference(tx.getReference())
            .propertyId(tx.getPropertyId()).buyerId(tx.getBuyerId()).sellerId(tx.getSellerId())
            .amount(tx.getAmount()).serviceFee(tx.getServiceFee())
            .totalAmount(tx.getAmount().add(tx.getServiceFee()))
            .type(tx.getType().name()).status(tx.getStatus().name())
            .paymentChannel(tx.getPaymentChannel())
            .authorizationUrl(tx.getAuthorizationUrl())
            .createdAt(tx.getCreatedAt()).build();
    }
}
