package com.corecity.user.service;

import com.corecity.user.entity.Wallet;
import com.corecity.user.entity.WalletTransaction;
import com.corecity.user.entity.WalletTransaction.Status;
import com.corecity.user.entity.WalletTransaction.Type;
import com.corecity.user.repository.WalletRepository;
import com.corecity.user.repository.WalletTransactionRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class WalletService {

    private final WalletRepository walletRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    @Value("${paystack.secret-key}")
    private String paystackSecretKey;

    @Value("${paystack.callback-url:https://corecity.com.ng/payment/verify}")
    private String callbackUrl;

    private static final String PAYSTACK_BASE = "https://api.paystack.co";

    /** Returns the wallet for this user, creating one if it does not exist. */
    @Transactional
    @SuppressWarnings("null")
    public Wallet getOrCreateWallet(Long userId) {
        return walletRepository.findByUserId(userId).orElseGet(() -> {
            Wallet wallet = Wallet.builder()
                .userId(userId)
                .build();
            return walletRepository.save(wallet);
        });
    }

    /**
     * Initiates a Paystack payment to top up the wallet.
     * Reference prefix WLT- distinguishes wallet funding from other payment types.
     *
     * @param userEmail email used for the Paystack checkout page
     * @param amountNgn amount to credit (in Naira)
     * @return Paystack authorization URL to redirect the user
     */
    @Transactional
    public FundInitResult initiateWalletFunding(Long userId, String userEmail, BigDecimal amountNgn) {
        if (amountNgn.compareTo(BigDecimal.valueOf(100)) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Minimum wallet top-up is ₦100");
        }

        Wallet wallet = getOrCreateWallet(userId);
        String reference = "WLT-" + userId + "-" + System.currentTimeMillis();
        long amountKobo = amountNgn.multiply(BigDecimal.valueOf(100)).longValue();

        // Record a PENDING transaction before calling Paystack (idempotency anchor)
        WalletTransaction pending = WalletTransaction.builder()
            .walletId(wallet.getId())
            .type(Type.CREDIT)
            .amount(amountNgn)
            .reference(reference)
            .description("Wallet top-up")
            .status(Status.PENDING)
            .build();
        walletTransactionRepository.save(pending);

        Map<String, Object> body = Map.of(
            "email", userEmail,
            "amount", amountKobo,
            "reference", reference,
            "currency", "NGN",
            "callback_url", callbackUrl,
            "metadata", Map.of("wallet_id", wallet.getId(), "user_id", userId)
        );

        try {
            String response = webClientBuilder.build()
                .post()
                .uri(PAYSTACK_BASE + "/transaction/initialize")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + paystackSecretKey)
                .header(HttpHeaders.CONTENT_TYPE, "application/json")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .block();

            JsonNode root = objectMapper.readTree(response);
            String authorizationUrl = root.path("data").path("authorization_url").asText();
            return new FundInitResult(reference, authorizationUrl);
        } catch (Exception e) {
            log.error("Paystack wallet fund init failed: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "Payment gateway unavailable – please try again later");
        }
    }

    /**
     * Called by the Paystack webhook handler when a WLT-* reference payment succeeds.
     * Idempotent: if the reference is already SUCCESSFUL, this is a no-op.
     */
    @Transactional
    public void creditWalletFromWebhook(String reference) {
        WalletTransaction txn = walletTransactionRepository.findByReference(reference)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                "Wallet transaction not found for reference: " + reference));

        if (txn.getStatus() == Status.SUCCESSFUL) {
            log.info("Wallet credit already applied for reference {}, skipping", reference);
            return;
        }

        Wallet wallet = walletRepository.findById(txn.getWalletId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found"));

        wallet.setBalance(wallet.getBalance().add(txn.getAmount()));
        walletRepository.save(wallet);

        txn.setStatus(Status.SUCCESSFUL);
        walletTransactionRepository.save(txn);

        log.info("Wallet {} credited ₦{} via reference {}", wallet.getId(), txn.getAmount(), reference);
    }

    /**
     * Debits the wallet for in-app payments (reservations, subscriptions, loans).
     * Throws BAD_REQUEST if balance is insufficient.
     */
    @Transactional
    public void debitWallet(Long userId, BigDecimal amount, String reference, String description) {
        Wallet wallet = walletRepository.findByUserId(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found"));

        if (wallet.getBalance().compareTo(amount) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Insufficient wallet balance");
        }

        wallet.setBalance(wallet.getBalance().subtract(amount));
        walletRepository.save(wallet);

        WalletTransaction txn = WalletTransaction.builder()
            .walletId(wallet.getId())
            .type(Type.DEBIT)
            .amount(amount)
            .reference(reference)
            .description(description)
            .status(Status.SUCCESSFUL)
            .build();
        walletTransactionRepository.save(txn);
    }

    public List<WalletTransaction> getTransactionHistory(Long userId) {
        Wallet wallet = getOrCreateWallet(userId);
        return walletTransactionRepository.findByWalletIdOrderByCreatedAtDesc(wallet.getId());
    }

    public record FundInitResult(String reference, String authorizationUrl) {}
}
