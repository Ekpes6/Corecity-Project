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

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransactionService {

    // ── Commission rates ──────────────────────────────────────────────────────
    // AGENT sellers (role=AGENT): 7% to agent wallet + 3% to CoreCity wallet
    private static final BigDecimal AGENT_COMMISSION_RATE   = new BigDecimal("0.07");
    private static final BigDecimal CORECITY_AGENT_RATE     = new BigDecimal("0.03");
    // SELLER/OWNER sellers (role=SELLER): 5% seller bonus in bank-transfer payout + 5% to CoreCity wallet
    private static final BigDecimal SELLER_BONUS_RATE       = new BigDecimal("0.05");
    private static final BigDecimal CORECITY_SELLER_RATE    = new BigDecimal("0.05");

    private final TransactionRepository transactionRepository;
    private final CommissionRepository commissionRepository;
    private final PaystackService paystackService;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;
    private final PropertyServiceClient propertyServiceClient;
    private final UserServiceClient userServiceClient;

    /** The user ID of the CoreCity platform admin account — receives the 3% platform fee. */
    @Value("${corecity.admin.user-id:1}")
    private Long adminUserId;

    @Transactional
    @SuppressWarnings("null") // Lombok builder returns unannotated Transaction; Spring Data save() is @NonNull — safe at runtime
    public InitTransactionResponse initTransaction(InitTransactionRequest req, Long buyerId) {
        Long safeBuyerId = Objects.requireNonNull(buyerId, "buyer id must not be null");

        // Guard 1: block duplicate payment only when the property is still occupied.
        // For SHORTLET/RENT, once the lifecycle expires the property returns to ACTIVE
        // and the buyer must be able to book again. For PURCHASE (SOLD), block forever.
        transactionRepository
            .findTopByPropertyIdAndBuyerIdAndStatusInOrderByCreatedAtDesc(
                req.getPropertyId(), safeBuyerId,
                List.of(Transaction.TransactionStatus.SUCCESS))
            .ifPresent(prev -> {
                boolean isPurchase = prev.getType() == Transaction.TransactionType.PURCHASE;
                if (isPurchase) {
                    log.warn("Duplicate PURCHASE blocked: buyer {} already owns property {}",
                        safeBuyerId, req.getPropertyId());
                    throw new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.CONFLICT,
                        "A payment for this property has already been completed.");
                }
                // For RENT/SHORTLET, only block if the property is still occupied
                String currentStatus = propertyServiceClient.getPropertyStatus(req.getPropertyId());
                boolean stillOccupied = currentStatus != null
                    && (currentStatus.equals("SHORTLET") || currentStatus.equals("RENTED"));
                if (stillOccupied) {
                    log.warn("Duplicate RENT/SHORTLET blocked: property {} still occupied (status={})",
                        req.getPropertyId(), currentStatus);
                    throw new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.CONFLICT,
                        "A payment for this property has already been completed.");
                }
            });

        // UUID reference: globally unique, no millisecond-collision risk under concurrent load
        String reference = "HLK-" + UUID.randomUUID().toString().replace("-", "").toUpperCase();

        // Debit wallet and mark transaction SUCCESS immediately
        userServiceClient.debitWallet(safeBuyerId, req.getAmount(), reference,
            req.getType().name() + " payment: property " + req.getPropertyId());

        var walletTx = transactionRepository.save(
            Transaction.builder()
                .reference(reference)
                .propertyId(req.getPropertyId())
                .buyerId(safeBuyerId)
                .sellerId(req.getSellerId())
                .amount(req.getAmount())
                .serviceFee(BigDecimal.ZERO)
                .type(req.getType())
                .leaseDays(req.getLeaseDays())
                .paymentChannel("wallet")
                .status(Transaction.TransactionStatus.SUCCESS)
                .build()
        );

        // Auto-create commission for PURCHASE / RENT
        if (walletTx.getType() == Transaction.TransactionType.PURCHASE
                || walletTx.getType() == Transaction.TransactionType.RENT) {
            createCommission(walletTx);
            notifyPropertyServiceAsync(walletTx.getPropertyId(), walletTx.getBuyerId(),
                walletTx.getType().name(), walletTx.getLeaseDays());
        }

        try {
            UserServiceClient.UserInfo buyer  = userServiceClient.getUserInfo(walletTx.getBuyerId());
            UserServiceClient.UserInfo seller = userServiceClient.getUserInfo(walletTx.getSellerId());
            String propTitle = propertyServiceClient.getPropertyTitle(walletTx.getPropertyId());

            java.util.HashMap<String, Object> notifPayload = new java.util.HashMap<>();
            notifPayload.put("buyerId",       walletTx.getBuyerId());
            notifPayload.put("sellerId",      walletTx.getSellerId());
            notifPayload.put("amount",        walletTx.getAmount());
            notifPayload.put("reference",     reference);
            notifPayload.put("propertyTitle", propTitle != null ? propTitle : "Your property");
            notifPayload.put("transactionType", walletTx.getType().name());
            notifPayload.put("date",          LocalDateTime.now().toString());
            if (buyer  != null) { notifPayload.put("buyerEmail",  buyer.email());  notifPayload.put("buyerName",  buyer.firstName());  notifPayload.put("buyerPhone",  buyer.phone()); }
            if (seller != null) { notifPayload.put("sellerEmail", seller.email()); notifPayload.put("sellerName", seller.firstName()); notifPayload.put("sellerPhone", seller.phone()); }
            publishAsync("notification.payment_success", notifPayload);
        } catch (Exception e) {
            log.warn("Could not publish payment notification for tx {}", walletTx.getId());
        }

        log.info("Transaction {} SUCCESS for buyer {} / property {}", reference, safeBuyerId, req.getPropertyId());

        return InitTransactionResponse.builder()
            .transactionId(walletTx.getId())
            .reference(reference)
            .amount(req.getAmount())
            .serviceFee(BigDecimal.ZERO)
            .totalAmount(req.getAmount())
            .build();
    }

    @Transactional
    public TransactionResponse verifyTransaction(String reference) {
        Transaction tx = transactionRepository.findByReference(reference)
            .orElseThrow(() -> new RuntimeException("Transaction not found: " + reference));

        // Idempotency: if this transaction is already in a terminal state, return immediately.
        // This prevents double-commission and double-notification when the webhook and the
        // frontend verify page race each other (both call this method within seconds).
        if (tx.getStatus() == Transaction.TransactionStatus.SUCCESS
                || tx.getStatus() == Transaction.TransactionStatus.FAILED) {
            log.debug("verifyTransaction: {} already {}, returning without Paystack call", reference, tx.getStatus());
            return toResponse(tx);
        }

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

            // Notify property-service to complete the reservation and start lifecycle countdown.
            // This is best-effort and async — must not delay the HTTP response or the @Transactional commit.
            if (tx.getType() == Transaction.TransactionType.PURCHASE
                    || tx.getType() == Transaction.TransactionType.RENT) {
                notifyPropertyServiceAsync(tx.getPropertyId(), tx.getBuyerId(),
                    tx.getType().name(), tx.getLeaseDays());
            }

            // Notify both parties (async — must not block the HTTP response or the @Transactional commit)
            try {
                UserServiceClient.UserInfo buyer  = userServiceClient.getUserInfo(tx.getBuyerId());
                UserServiceClient.UserInfo seller = userServiceClient.getUserInfo(tx.getSellerId());
                String propTitle = propertyServiceClient.getPropertyTitle(tx.getPropertyId());

                java.util.HashMap<String, Object> notifPayload = new java.util.HashMap<>();
                notifPayload.put("buyerId",       tx.getBuyerId());
                notifPayload.put("sellerId",      tx.getSellerId());
                notifPayload.put("amount",        tx.getAmount());
                notifPayload.put("reference",     reference);
                notifPayload.put("propertyTitle", propTitle != null ? propTitle : "Your property");
                notifPayload.put("transactionType", tx.getType().name());
                notifPayload.put("date",          LocalDateTime.now().toString());
                if (buyer  != null) { notifPayload.put("buyerEmail",  buyer.email());  notifPayload.put("buyerName",  buyer.firstName());  notifPayload.put("buyerPhone",  buyer.phone()); }
                if (seller != null) { notifPayload.put("sellerEmail", seller.email()); notifPayload.put("sellerName", seller.firstName()); notifPayload.put("sellerPhone", seller.phone()); }
                publishAsync("notification.payment_success", notifPayload);
            } catch (Exception e) {
                log.warn("Could not publish payment notification for ref {}: {}", reference, e.getMessage());
            }
            log.info("Transaction {} verified successfully via {}", reference, result.channel());
        } else if ("failed".equalsIgnoreCase(result.status())) {
            // Only write FAILED when Paystack explicitly confirms the payment failed.
            // Any other status (e.g. "pending" — Paystack hasn't finalised yet) leaves
            // the DB row unchanged so the webhook can still set it to SUCCESS when it arrives.
            tx.setStatus(Transaction.TransactionStatus.FAILED);
            log.warn("Transaction {} explicitly failed on Paystack (status={})", reference, result.status());
        } else {
            // Paystack returned a non-success, non-failed status (e.g. "pending" / "abandoned").
            // Do NOT overwrite the current status — the webhook will arrive shortly and set SUCCESS.
            log.info("Transaction {} Paystack status='{}' — leaving DB status as {} to await webhook",
                reference, result.status(), tx.getStatus());
            return toResponse(tx); // return current state without saving
        }

        var savedTransaction = transactionRepository.save(
            Objects.requireNonNull(tx, "verified transaction must not be null"));
        return toResponse(savedTransaction);
    }

    public List<TransactionResponse> getMyTransactions(Long userId, String role) {
        Long safeUserId = Objects.requireNonNull(userId, "user id must not be null");
        boolean isSeller = "seller".equalsIgnoreCase(role) || "agent".equalsIgnoreCase(role);
        List<Transaction> txs = isSeller
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
        // tx.getAmount() = total buyer price (base + 10% commission + Paystack fee).
        // Derive the seller's base: (totalBuyerPrice − paystackFee) ÷ 1.10
        // e.g. (85,802,000 − 2,000) ÷ 1.10 = 78,000,000
        String sellerRole = userServiceClient.getUserRole(tx.getSellerId());
        boolean isAgent   = "AGENT".equalsIgnoreCase(sellerRole);
        BigDecimal base      = tx.getAmount().subtract(tx.getServiceFee())
            .divide(new BigDecimal("1.10"), 2, RoundingMode.HALF_UP);
        BigDecimal coreCityC = base.multiply(isAgent ? CORECITY_AGENT_RATE : CORECITY_SELLER_RATE)
            .setScale(2, RoundingMode.HALF_UP);
        BigDecimal agentC    = base.multiply(isAgent ? AGENT_COMMISSION_RATE : SELLER_BONUS_RATE)
            .setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalC    = coreCityC.add(agentC);
        Commission commission = Commission.builder()
            .transactionId(tx.getId())
            .propertyId(tx.getPropertyId())
            .agentId(tx.getSellerId())
            .propertyValue(base)
            .corecityCommission(coreCityC)
            .agentCommission(agentC)
            .totalCommission(totalC)
            .overallCost(base.add(totalC))
            .sellerRole(sellerRole)
            .status(Commission.CommissionStatus.PENDING)
            .build();
        commissionRepository.save(Objects.requireNonNull(commission));
        log.info("Commission created for tx={}: sellerRole={} CoreCity={} AgentOrBonus={}",
            tx.getId(), sellerRole, coreCityC, agentC);

        // Disburse immediately on a background thread.
        // AGENT  → credit agent wallet (7%) + admin wallet (3%).
        // SELLER → credit only admin wallet (5%); seller's 5% bonus is included in manual bank-transfer payout.
        final String txRef    = tx.getReference();
        CompletableFuture.runAsync(() -> {
            if (isAgent) {
                userServiceClient.creditWallet(adminUserId, coreCityC,
                    "CMM-ADMIN-" + txRef, "Commission (platform 3%): tx " + txRef);
                userServiceClient.creditWallet(tx.getSellerId(), agentC,
                    "CMM-AGENT-" + txRef, "Commission (agent 7%): tx " + txRef);
            } else {
                userServiceClient.creditWallet(adminUserId, coreCityC,
                    "CMM-ADMIN-" + txRef, "Commission (platform 5%): tx " + txRef);
            }
            commission.setStatus(Commission.CommissionStatus.DISBURSED);
            commissionRepository.save(commission);
        });
    }

    public List<CommissionResponse> getMyCommissions(Long agentId) {
        return commissionRepository.findByAgentIdOrderByCreatedAtDesc(agentId)
            .stream().map(this::toCommissionResponse).collect(Collectors.toList());
    }

    /** Admin-only: all transactions across all buyers and sellers. */
    public List<TransactionResponse> getAllTransactions() {
        return transactionRepository.findAllByOrderByCreatedAtDesc()
            .stream().map(this::toResponse).collect(Collectors.toList());
    }

    /** Admin-only: all commissions across every agent and property. */
    public List<CommissionResponse> getAllCommissions() {
        return commissionRepository.findAllByOrderByCreatedAtDesc()
            .stream().map(this::toCommissionResponse).collect(Collectors.toList());
    }

    /**
     * One-time admin backfill: find every PENDING commission (created before the
     * creditWallet code was deployed) and fire the wallet credit calls for them.
     * Safe to call multiple times — each credit uses a unique reference so
     * user-service will reject duplicates (unique constraint on reference column).
     *
     * Returns a summary: { "processed": N, "alreadyDisbursed": M }
     */
    public Map<String, Integer> backfillDisbursements() {
        List<Commission> pending = commissionRepository.findByStatus(Commission.CommissionStatus.PENDING);
        int processed = 0;
        for (Commission c : pending) {
            final Commission comm = c;
            if (c.getTransactionId() == null) { processed++; continue; }
            // Look up the original transaction to get its reference string
            transactionRepository.findById(Objects.requireNonNull(c.getTransactionId())).ifPresent(tx -> {
                final String txRef = tx.getReference();
                try {
                    if (comm.getAgentId() == null) {
                        log.warn("Backfill skipped for commission id={}: agentId is null", comm.getId());
                        return;
                    }
                    // Branch on sellerRole: AGENT gets both wallets credited; SELLER gets only admin.
                    if ("AGENT".equalsIgnoreCase(comm.getSellerRole())) {
                        userServiceClient.creditWallet(comm.getAgentId(), comm.getAgentCommission(),
                            "CMM-AGENT-" + txRef, "Backfill commission (agent 7%): tx " + txRef);
                        userServiceClient.creditWallet(adminUserId, comm.getCorecityCommission(),
                            "CMM-ADMIN-" + txRef, "Backfill commission (platform 3%): tx " + txRef);
                    } else {
                        // SELLER: only admin wallet; seller's 5% bonus is in bank-transfer payout.
                        userServiceClient.creditWallet(adminUserId, comm.getCorecityCommission(),
                            "CMM-ADMIN-" + txRef, "Backfill commission (platform 5%): tx " + txRef);
                    }
                } catch (Exception e) {
                    log.warn("Backfill admin credit failed for tx={}: {}", txRef, e.getMessage());
                }
                comm.setStatus(Commission.CommissionStatus.DISBURSED);
                commissionRepository.save(comm);
                log.info("Backfill disbursed commission id={} tx={}", comm.getId(), txRef);
            });
            processed++;
        }
        log.info("Backfill complete: {} PENDING commissions processed", processed);
        return Map.of("processed", processed);
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
            .sellerRole(c.getSellerRole())
            .createdAt(c.getCreatedAt())
            .build();
    }

    // ── Seller Disbursement ───────────────────────────────────────────────────

    /**
     * Admin: list commissions where the seller's property-value (90%) is owed.
     * Each commission maps 1-to-1 with a successful PURCHASE or RENT transaction.
     *
     * @param pendingOnly true = only unpaid, false = all (paid + unpaid)
     */
    public List<DisbursementResponse> getSellerDisbursements(boolean pendingOnly) {
        List<Commission> commissions = pendingOnly
            ? commissionRepository.findBySellerPaidFalseOrderByCreatedAtDesc()
            : commissionRepository.findAllByOrderByCreatedAtDesc();
        return commissions.stream().map(this::toDisbursementResponse).collect(Collectors.toList());
    }

    /**
     * Admin: mark one commission's seller-payment as done (bank transfer confirmed).
     * Records the timestamp and optional note (e.g. bank transfer reference).
     */
    @Transactional
    public DisbursementResponse markSellerPaid(Long commissionId, String note) {
        if (commissionId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "commissionId required");
        Commission commission = commissionRepository.findById(commissionId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Commission not found"));
        if (commission.isSellerPaid()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Commission already marked as paid");
        }
        commission.setSellerPaid(true);
        commission.setSellerPaidAt(LocalDateTime.now());
        commission.setSellerNote(note);
        commissionRepository.save(Objects.requireNonNull(commission));
        log.info("Seller disbursement marked paid: commissionId={} note={}", commissionId, note);
        return toDisbursementResponse(commission);
    }

    private DisbursementResponse toDisbursementResponse(Commission c) {
        Long txId = c.getTransactionId();
        Transaction tx = txId != null
            ? transactionRepository.findById(txId).orElse(null)
            : null;
        Long propId = c.getPropertyId();
        PropertyServiceClient.PropertySummary prop = propId != null
            ? propertyServiceClient.getPropertyForDisbursement(propId)
            : null;
        return DisbursementResponse.builder()
            .commissionId(c.getId())
            .transactionId(c.getTransactionId())
            .transactionReference(tx != null ? tx.getReference() : null)
            .transactionType(tx != null ? tx.getType().name() : null)
            .propertyId(c.getPropertyId())
            .propertyTitle(prop != null ? prop.title() : null)
            .sellerId(c.getAgentId())
            // Bank-transfer amount:
            //   SELLER → base + 5% seller bonus (propertyValue + agentCommission)
            //   AGENT  → base only (agent already received their 7% via wallet)
            .propertyValue("SELLER".equalsIgnoreCase(c.getSellerRole())
                ? c.getPropertyValue().add(c.getAgentCommission())
                : c.getPropertyValue())
            .ownerName(prop != null ? prop.ownerName() : null)
            .ownerPhone(prop != null ? prop.ownerPhone() : null)
            .ownerBankName(prop != null ? prop.ownerBankName() : null)
            .ownerAccountNumber(prop != null ? prop.ownerAccountNumber() : null)
            .ownerAccountName(prop != null ? prop.ownerAccountName() : null)
            .sellerPaid(c.isSellerPaid())
            .sellerPaidAt(c.getSellerPaidAt())
            .sellerNote(c.getSellerNote())
            .sellerRole(c.getSellerRole())
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

    /**
     * Fire-and-forget property-service notification. Runs on a separate thread so it never
     * blocks the calling @Transactional method or delays the HTTP response.
     */
    private void notifyPropertyServiceAsync(Long propertyId, Long buyerId, String type, Integer leaseDays) {
        CompletableFuture.runAsync(() ->
            propertyServiceClient.completeReservation(propertyId, buyerId, type, leaseDays));
    }

    /**
     * Fire-and-forget RabbitMQ publish. Runs on a separate thread so it never
     * blocks the calling @Transactional method or delays the HTTP response.
     */
    private void publishAsync(String routingKey, Object payload) {
        CompletableFuture.runAsync(() -> {
            try {
                rabbitTemplate.convertAndSend("corecity.exchange", routingKey, payload);
            } catch (Exception e) {
                log.warn("Could not publish {} event: {}", routingKey, e.getMessage());
            }
        });
    }
}
