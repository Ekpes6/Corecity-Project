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
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
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
        Long safeBuyerId = Objects.requireNonNull(buyerId, "buyer id must not be null");
        BigDecimal fee = paystackService.calculateFee(req.getAmount());
        // UUID reference: globally unique, no millisecond-collision risk under concurrent load
        String reference = "HLK-" + UUID.randomUUID().toString().replace("-", "").toUpperCase();

        // Persist in INITIATED state before hitting Paystack
        var builtTransaction = Transaction.builder()
            .reference(reference)
            .propertyId(req.getPropertyId())
            .buyerId(safeBuyerId)
            .sellerId(req.getSellerId())
            .amount(req.getAmount())
            .serviceFee(fee)
            .type(req.getType())
            .status(Transaction.TransactionStatus.INITIATED)
            .build();
        var savedTransaction = transactionRepository.save(
            Objects.requireNonNull(builtTransaction, "built transaction must not be null"));

        // Call Paystack
        Map<String, Object> meta = Map.of(
            "propertyId", req.getPropertyId(),
            "transactionId", savedTransaction.getId(),
            "type", req.getType().name()
        );
        PaystackService.InitResult result =
            paystackService.initializeTransaction(req.getBuyerEmail(), req.getAmount().add(fee), reference, meta);

        // Update with Paystack URL
        savedTransaction.setAuthorizationUrl(result.authorizationUrl());
        savedTransaction.setStatus(Transaction.TransactionStatus.PENDING);
        transactionRepository.save(savedTransaction);

        return InitTransactionResponse.builder()
            .transactionId(savedTransaction.getId())
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

        var savedTransaction = transactionRepository.save(
            Objects.requireNonNull(tx, "verified transaction must not be null"));
        return toResponse(savedTransaction);
    }

    public List<TransactionResponse> getMyTransactions(Long userId, String role) {
        Long safeUserId = Objects.requireNonNull(userId, "user id must not be null");
        List<Transaction> txs = "seller".equalsIgnoreCase(role)
            ? transactionRepository.findBySellerIdOrderByCreatedAtDesc(safeUserId)
            : transactionRepository.findByBuyerIdOrderByCreatedAtDesc(safeUserId);
        return txs.stream().map(this::toResponse).collect(Collectors.toList());
    }

    public TransactionResponse getTransaction(Long id, Long userId) {
        Long safeId = Objects.requireNonNull(id, "transaction id must not be null");
        Long safeUserId = Objects.requireNonNull(userId, "user id must not be null");
        Transaction tx = transactionRepository.findById(safeId)
            .orElseThrow(() -> new RuntimeException("Transaction not found"));
        if (!tx.getBuyerId().equals(safeUserId) && !tx.getSellerId().equals(safeUserId))
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
