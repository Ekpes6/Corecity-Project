package com.corecity.user.service;

import com.corecity.user.entity.BankAccount;
import com.corecity.user.entity.Wallet;
import com.corecity.user.entity.WalletTransaction;
import com.corecity.user.entity.WalletTransaction.Status;
import com.corecity.user.entity.WalletTransaction.Type;
import com.corecity.user.entity.WithdrawalRequest;
import com.corecity.user.entity.User;
import com.corecity.user.repository.BankAccountRepository;
import com.corecity.user.repository.UserRepository;
import com.corecity.user.repository.WalletRepository;
import com.corecity.user.repository.WalletTransactionRepository;
import com.corecity.user.repository.WithdrawalRequestRepository;
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
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.scheduling.annotation.Scheduled;

@Service
@RequiredArgsConstructor
@Slf4j
public class WalletService {

    private final WalletRepository walletRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final WithdrawalRequestRepository withdrawalRequestRepository;
    private final BankAccountRepository bankAccountRepository;
    private final UserRepository userRepository;
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
    @SuppressWarnings("null")
    public FundInitResult initiateWalletFunding(Long userId, String userEmail, BigDecimal amountNgn) {
        if (amountNgn.compareTo(BigDecimal.valueOf(100)) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Minimum wallet top-up is ₦100");
        }

        Wallet wallet = getOrCreateWallet(userId);

        String reference = "WLT-" + userId + "-" + System.currentTimeMillis();
        long amountKobo = amountNgn.multiply(BigDecimal.valueOf(100)).longValue();

        Map<String, Object> body = Map.of(
            "email", userEmail,
            "amount", amountKobo,
            "reference", reference,
            "currency", "NGN",
            "callback_url", callbackUrl,
            "metadata", Map.of("wallet_id", wallet.getId(), "user_id", userId)
        );

        // Call Paystack FIRST — only persist a PENDING record if the gateway
        // accepts the request and returns a valid authorization URL.
        // The 25-second timeout ensures we fail fast before the API gateway's 60s
        // deadline, so no orphan PENDING record is written on a slow Paystack call.
        String authorizationUrl;
        try {
            String response = webClientBuilder.build()
                .post()
                .uri(PAYSTACK_BASE + "/transaction/initialize")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + paystackSecretKey)
                .header(HttpHeaders.CONTENT_TYPE, "application/json")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(25))
                .block();

            log.info("Paystack initialize response for user {} ref {}: {}", userId, reference, response);

            JsonNode root = objectMapper.readTree(response);

            // Paystack can return HTTP 200 with {"status": false, "message": "..."} for bad keys
            boolean paystackStatus = root.path("status").asBoolean(false);
            if (!paystackStatus) {
                String message = root.path("message").asText("Unknown error");
                log.error("Paystack returned status=false for user {} ref {}: {}", userId, reference, message);
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Payment gateway rejected the request: " + message);
            }

            authorizationUrl = root.path("data").path("authorization_url").asText(null);
        } catch (ResponseStatusException e) {
            throw e; // re-throw our own exceptions unchanged
        } catch (Exception e) {
            log.error("Paystack wallet fund init failed for user {} ref {}: {}", userId, reference, e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "Payment gateway unavailable – please try again later");
        }

        // Paystack returned 200 but with an empty/missing authorization_url —
        // treat this as a gateway failure; do NOT persist anything.
        if (authorizationUrl == null || authorizationUrl.isBlank()) {
            log.error("Paystack returned empty authorization_url for user {} reference {}", userId, reference);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "Payment gateway did not return a valid payment URL – please try again");
        }

        // Gateway accepted the request — now record the PENDING transaction.
        WalletTransaction pending = WalletTransaction.builder()
            .walletId(wallet.getId())
            .type(Type.CREDIT)
            .amount(amountNgn)
            .reference(reference)
            .description("Wallet top-up")
            .status(Status.PENDING)
            .build();
        walletTransactionRepository.save(pending);

        return new FundInitResult(reference, authorizationUrl);
    }

    /**
     * Called by the Paystack webhook handler when a WLT-* reference payment succeeds.
     * Idempotent: if the reference is already SUCCESSFUL, this is a no-op.
     */
    @Transactional
    @SuppressWarnings("null")
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
    @SuppressWarnings("null")
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

    /**
     * Credits a wallet directly — used for commission disbursements, reservation fee routing,
     * and loan repayment income.  Creates the wallet if it does not yet exist.
     */
    @Transactional
    @SuppressWarnings("null")
    public void creditWallet(Long userId, BigDecimal amount, String reference, String description) {
        Wallet wallet = getOrCreateWallet(userId);
        wallet.setBalance(wallet.getBalance().add(amount));
        walletRepository.save(wallet);
        WalletTransaction txn = WalletTransaction.builder()
            .walletId(wallet.getId())
            .type(Type.CREDIT)
            .amount(amount)
            .reference(reference)
            .description(description)
            .status(Status.SUCCESSFUL)
            .build();
        walletTransactionRepository.save(txn);
        log.info("Wallet userId={} credited ₦{} ref={} ({})", userId, amount, reference, description);
    }

    public List<WalletTransaction> getTransactionHistory(Long userId) {
        Wallet wallet = getOrCreateWallet(userId);
        return walletTransactionRepository.findByWalletIdOrderByCreatedAtDesc(wallet.getId());
    }

    /**
     * Re-initializes a PENDING wallet top-up with Paystack to retrieve a fresh payment URL.
     * This lets users resume a payment they didn't complete.
     * Only the owner of the wallet can call this.
     */
    @SuppressWarnings("null")
    public String resumeWalletFunding(Long userId, String reference, String userEmail) {
        WalletTransaction txn = walletTransactionRepository.findByReference(reference)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found"));

        // Security: verify the transaction belongs to the caller's wallet
        Wallet wallet = walletRepository.findByUserId(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found"));
        if (!txn.getWalletId().equals(wallet.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your transaction");
        }
        if (txn.getStatus() != Status.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Only PENDING transactions can be resumed");
        }

        // Paystack rejects re-initialization with the same reference (HTTP 400).
        // Generate a fresh reference and update the DB record before calling Paystack.
        String newReference = "WLT-" + userId + "-" + System.currentTimeMillis();
        txn.setReference(newReference);
        walletTransactionRepository.save(txn);
        log.info("Resume: replaced old ref {} with new ref {} for userId {}", reference, newReference, userId);

        long amountKobo = txn.getAmount().multiply(BigDecimal.valueOf(100)).longValue();
        Map<String, Object> body = Map.of(
            "email", userEmail,
            "amount", amountKobo,
            "reference", newReference,
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

            log.info("Paystack resume response for ref {}: {}", newReference, response);
            JsonNode root = objectMapper.readTree(response);
            boolean status = root.path("status").asBoolean(false);
            if (!status) {
                String message = root.path("message").asText("Unknown error");
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Payment gateway rejected resume: " + message);
            }
            String url = root.path("data").path("authorization_url").asText(null);
            if (url == null || url.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Payment gateway did not return a valid URL");
            }
            return url;
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.error("Paystack resume failed for ref {}: {}", newReference, e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "Payment gateway unavailable – please try again later");
        }
    }

    /**
     * Verifies a PENDING wallet top-up with Paystack and credits the wallet if confirmed paid.
     * Used when the webhook was missed (e.g. URL not configured at payment time).
     */
    @Transactional
    public String verifyWalletFunding(Long userId, String reference) {
        WalletTransaction txn = walletTransactionRepository.findByReference(reference)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found"));

        Wallet wallet = walletRepository.findByUserId(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found"));
        if (!txn.getWalletId().equals(wallet.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your transaction");
        }

        if (txn.getStatus() == Status.SUCCESSFUL) {
            return "already_credited";
        }
        if (txn.getStatus() == Status.FAILED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This transaction has already failed");
        }

        try {
            String response = webClientBuilder.build()
                .get()
                .uri(PAYSTACK_BASE + "/transaction/verify/" + reference)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + paystackSecretKey)
                .retrieve()
                .bodyToMono(String.class)
                .block();

            log.info("Paystack verify response for ref {}: {}", reference, response);
            JsonNode root = objectMapper.readTree(response);
            String paystackStatus = root.path("data").path("status").asText("");

            if ("success".equals(paystackStatus)) {
                creditWalletFromWebhook(reference);
                return "credited";
            } else {
                txn.setStatus(Status.FAILED);
                walletTransactionRepository.save(txn);
                log.warn("Paystack verify: ref {} has status '{}' — marking FAILED", reference, paystackStatus);
                throw new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED,
                    "Payment not completed. Paystack status: " + paystackStatus);
            }
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.error("Paystack verify failed for ref {}: {}", reference, e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "Could not verify payment – please try again");
        }
    }

    public record FundInitResult(String reference, String authorizationUrl) {}

    // ── Withdrawal ────────────────────────────────────────────────────────────

    /**
     * Initiates a wallet withdrawal to the user's primary bank account.
     * The wallet is debited immediately; the withdrawal_requests record is created
     * with status PENDING for admin processing.
     *
     * @param userId  caller's user ID
     * @param amount  amount in Naira (must be ≥ ₦100 and ≤ wallet balance)
     * @return the saved WithdrawalRequest
     */
    @Transactional
    @SuppressWarnings("null")
    public WithdrawalRequest initiateWithdrawal(Long userId, BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.valueOf(100)) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Minimum withdrawal is ₦100");
        }

        BankAccount primary = bankAccountRepository.findByUserIdOrderByCreatedAtDesc(userId)
            .stream().filter(BankAccount::isPrimary).findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "No primary bank account found. Please add and set a primary bank account before withdrawing."));

        Wallet wallet = walletRepository.findByUserId(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found"));

        if (wallet.getBalance().compareTo(amount) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Insufficient wallet balance. Available: ₦" +
                wallet.getBalance().toPlainString());
        }

        // Debit wallet immediately
        String reference = "WDR-" + userId + "-" + System.currentTimeMillis();
        wallet.setBalance(wallet.getBalance().subtract(amount));
        walletRepository.save(wallet);

        WalletTransaction txn = WalletTransaction.builder()
            .walletId(wallet.getId())
            .type(Type.DEBIT)
            .amount(amount)
            .reference(reference)
            .description("Withdrawal to " + primary.getBankName() + " ••••" + primary.getAccountNumber().replaceAll(".(?=.{4})", "*").substring(Math.max(0, primary.getAccountNumber().length() - 4)))
            .status(Status.SUCCESSFUL)
            .build();
        walletTransactionRepository.save(txn);

        // Record withdrawal request for admin processing
        WithdrawalRequest request = WithdrawalRequest.builder()
            .userId(userId)
            .reference(reference)
            .amount(amount)
            .bankName(primary.getBankName())
            .accountNumber(primary.getAccountNumber())
            .accountName(primary.getAccountName())
            .status(WithdrawalRequest.Status.PENDING)
            .build();
        withdrawalRequestRepository.save(request);

        log.info("Withdrawal initiated: userId={} amount=₦{} ref={} → {} {}", userId, amount, reference,
            primary.getBankName(), primary.getAccountName());
        return request;
    }

    /** Returns all withdrawal requests for a user, newest first. */
    @Transactional(readOnly = true)
    public List<WithdrawalRequest> getWithdrawals(Long userId) {
        return withdrawalRequestRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    /** Returns true if the given userId belongs to an ADMIN user. */
    public boolean isAdmin(Long userId) {
        return userRepository.findById(userId)
            .map(u -> u.getRole() == User.Role.ADMIN)
            .orElse(false);
    }

    /** Admin: all withdrawal requests across all users, newest first. */
    @Transactional(readOnly = true)
    public List<WithdrawalRequest> getAllWithdrawals() {
        return withdrawalRequestRepository.findAllByOrderByCreatedAtDesc();
    }

    /**
     * Admin: mark a withdrawal request as PROCESSED or REJECTED.
     * If REJECTED, the debited amount is refunded to the user's wallet.
     */
    @Transactional
    public WithdrawalRequest processWithdrawal(Long requestId, WithdrawalRequest.Status newStatus, String adminNote) {
        if (requestId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request ID must not be null");
        WithdrawalRequest request = withdrawalRequestRepository.findById(requestId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Withdrawal request not found"));

        if (request.getStatus() != WithdrawalRequest.Status.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Request is already " + request.getStatus() + " and cannot be updated");
        }
        if (newStatus == WithdrawalRequest.Status.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New status must be PROCESSED or REJECTED");
        }

        request.setStatus(newStatus);
        request.setAdminNote(adminNote);

        if (newStatus == WithdrawalRequest.Status.REJECTED) {
            // Refund the amount back to the user's wallet
            Wallet wallet = walletRepository.findByUserId(request.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User wallet not found"));
            wallet.setBalance(wallet.getBalance().add(request.getAmount()));
            walletRepository.save(wallet);

            // Record a credit transaction for the reversal
            WalletTransaction refund = WalletTransaction.builder()
                .walletId(wallet.getId())
                .type(WalletTransaction.Type.CREDIT)
                .amount(request.getAmount())
                .reference("REF-" + request.getReference())
                .description("Withdrawal rejected — refund for " + request.getReference())
                .status(WalletTransaction.Status.SUCCESSFUL)
                .build();
            walletTransactionRepository.save(java.util.Objects.requireNonNull(refund));
            log.info("Withdrawal rejected and refunded: ref={} userId={} amount=₦{}",
                request.getReference(), request.getUserId(), request.getAmount());
        } else {
            log.info("Withdrawal processed: ref={} userId={} amount=₦{} → {} {}",
                request.getReference(), request.getUserId(), request.getAmount(),
                request.getBankName(), request.getAccountName());
        }

        return withdrawalRequestRepository.save(request);
    }

    /**
     * Runs every 5 minutes. Finds PENDING wallet top-ups that are older than 15 minutes
     * (i.e. the user never reached the Paystack checkout — usually because the API gateway
     * timed out before user-service could return the authorization URL).
     *
     * For each stale PENDING record:
     *  - If Paystack says "success"  → credit the wallet (idempotent via creditWalletFromWebhook)
     *  - Otherwise                   → mark FAILED so the wallet history is clean
     *
     * This prevents orphan PENDING records that accumulate after cold-start 503s.
     */
    @Scheduled(fixedDelay = 300_000)
    public void reconcilePendingTopUps() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(15);
        List<WalletTransaction> stale = walletTransactionRepository
            .findByTypeAndStatusAndCreatedAtBefore(Type.CREDIT, Status.PENDING, cutoff);

        if (stale.isEmpty()) return;
        log.info("Reconciliation: found {} stale PENDING top-up(s) older than 15 minutes", stale.size());

        for (WalletTransaction txn : stale) {
            try {
                String response = webClientBuilder.build()
                    .get()
                    .uri(PAYSTACK_BASE + "/transaction/verify/" + txn.getReference())
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + paystackSecretKey)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(15))
                    .block();

                JsonNode root = objectMapper.readTree(response);
                String paystackStatus = root.path("data").path("status").asText("");

                if ("success".equals(paystackStatus)) {
                    creditWalletFromWebhook(txn.getReference());
                    log.info("Reconciliation: credited wallet for previously-stale ref {}", txn.getReference());
                } else {
                    txn.setStatus(Status.FAILED);
                    walletTransactionRepository.save(txn);
                    log.info("Reconciliation: marked ref {} FAILED (Paystack status: '{}')",
                        txn.getReference(), paystackStatus);
                }
            } catch (Exception e) {
                log.warn("Reconciliation: could not verify ref {}: {}", txn.getReference(), e.getMessage());
            }
        }
    }
}
