package com.corecity.transaction.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.corecity.transaction.dto.TransactionDTOs.*;
import com.corecity.transaction.entity.Commission;
import com.corecity.transaction.entity.Transaction;
import com.corecity.transaction.repository.CommissionRepository;
import com.corecity.transaction.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransactionService {

    private static final BigDecimal CORECITY_RATE = new BigDecimal("0.03");
    private static final BigDecimal AGENT_RATE    = new BigDecimal("0.07");

    private final TransactionRepository transactionRepository;
    private final CommissionRepository commissionRepository;
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

            // Auto-create commission for property transactions
            if (tx.getType() == Transaction.TransactionType.PURCHASE
                    || tx.getType() == Transaction.TransactionType.RENT) {
                createCommission(tx);
            }

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

    // ── Commission helpers ────────────────────────────────────────────────────

    private void createCommission(Transaction tx) {
        if (commissionRepository.findByTransactionId(tx.getId()).isPresent()) return; // idempotent
        BigDecimal value      = tx.getAmount();
        BigDecimal coreCityC  = value.multiply(CORECITY_RATE).setScale(2, RoundingMode.HALF_UP);
        BigDecimal agentC     = value.multiply(AGENT_RATE).setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalC     = coreCityC.add(agentC);
        Commission commission = Commission.builder()
            .transactionId(tx.getId())
            .propertyId(tx.getPropertyId())
            .agentId(tx.getSellerId())
            .propertyValue(value)
            .corecityCommission(coreCityC)
            .agentCommission(agentC)
            .totalCommission(totalC)
            .overallCost(value.add(totalC))
            .status(Commission.CommissionStatus.PENDING)
            .build();
        commissionRepository.save(commission);
        log.info("Commission created for tx={}: CoreCity={} Agent={}", tx.getId(), coreCityC, agentC);
    }

    public List<CommissionResponse> getMyCommissions(Long agentId) {
        return commissionRepository.findByAgentIdOrderByCreatedAtDesc(agentId)
            .stream().map(this::toCommissionResponse).collect(Collectors.toList());
    }

    private CommissionResponse toCommissionResponse(Commission c) {
        return CommissionResponse.builder()
            .id(c.getId()).transactionId(c.getTransactionId())
            .propertyId(c.getPropertyId()).agentId(c.getAgentId())
            .propertyValue(c.getPropertyValue())
            .corecityCommission(c.getCorecityCommission())
            .agentCommission(c.getAgentCommission())
            .totalCommission(c.getTotalCommission())
            .overallCost(c.getOverallCost())
            .status(c.getStatus().name())
            .createdAt(c.getCreatedAt())
            .build();
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
