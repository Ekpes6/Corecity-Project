package com.corecity.user.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.corecity.user.dto.SubscriptionDTOs.*;
import com.corecity.user.entity.AgentLoan;
import com.corecity.user.entity.AgentSubscription;
import com.corecity.user.entity.AgentSubscription.SubscriptionPlan;
import com.corecity.user.entity.AgentSubscription.SubscriptionStatus;
import com.corecity.user.entity.LoanProgram;
import com.corecity.user.entity.User;
import com.corecity.user.repository.AgentLoanRepository;
import com.corecity.user.repository.AgentSubscriptionRepository;
import com.corecity.user.repository.LoanProgramRepository;
import com.corecity.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionService {

    private final AgentSubscriptionRepository subscriptionRepo;
    private final AgentLoanRepository loanRepo;
    private final LoanProgramRepository loanProgramRepo;
    private final UserRepository userRepository;
    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    @Value("${paystack.secret-key}")
    private String paystackSecretKey;

    @Value("${paystack.callback-url:https://corecity.com.ng/payment/verify}")
    private String paystackCallbackUrl;

    private static final String PAYSTACK_BASE = "https://api.paystack.co";
    private static final BigDecimal EXECUTIVE_AGENT_MIN_AMOUNT = new BigDecimal("10000");

    // ── Catalogue ─────────────────────────────────────────────────────────────

    public List<PlanInfo> listPlans() {
        return Arrays.stream(SubscriptionPlan.values())
            .map(plan -> PlanInfo.builder()
                .name(plan.name())
                .monthlyFee(plan.monthlyFee)
                .maxListings(plan.maxListings)
                .coreCityCommission("3%")
                .agentCommission("7%")
                .loanEligible(plan != SubscriptionPlan.EXECUTIVE)
                .build())
            .collect(Collectors.toList());
    }

    // ── Subscribe ─────────────────────────────────────────────────────────────

    /**
     * Initiates a subscription for an AGENT or SELLER.
     *
     * Rules enforced:
     *  - SELLER may subscribe but cannot use the loan feature.
     *  - Only one active financial product at a time (subscription OR active loan).
     *  - Loan subscriptions must follow the 13-trial BASIC→STANDARD→PREMIUM progression.
     *  - Loan is created with PENDING status; activated only after Paystack confirmation.
     *  - Loan duration is fixed at 1 month (30 days).
     */
    @Transactional
    public SubscriptionInitResponse subscribe(SubscribeRequest req, Long agentId, String agentEmail,
                                              String userRole) {
        Objects.requireNonNull(agentId, "agentId must not be null");

        User agent = userRepository.findById(agentId)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));

        boolean isAgent  = agent.getRole() == User.Role.AGENT;
        boolean isSeller = agent.getRole() == User.Role.SELLER;

        if (!isAgent && !isSeller) {
            throw new ResponseStatusException(FORBIDDEN, "Subscriptions are only available to agents and sellers");
        }

        // ── Exclusivity: one active product at a time ─────────────────────────
        if (subscriptionRepo.countByAgentIdAndStatus(agentId, SubscriptionStatus.ACTIVE) > 0) {
            throw new ResponseStatusException(CONFLICT,
                "You already have an active subscription. Wait for it to expire before subscribing again.");
        }
        if (loanRepo.countByAgentIdAndStatus(agentId, AgentLoan.LoanStatus.ACTIVE) > 0) {
            throw new ResponseStatusException(CONFLICT,
                "You already have an active loan. Repay it fully before subscribing to a new plan.");
        }

        boolean useLoan = req.isUseLoan();

        // ── Loan access: agents only, not EXECUTIVE plan ──────────────────────
        if (useLoan) {
            if (!isAgent) {
                throw new ResponseStatusException(FORBIDDEN, "The loan feature is only available to agents");
            }
            if (req.getPlan() == SubscriptionPlan.EXECUTIVE) {
                throw new ResponseStatusException(BAD_REQUEST, "Loans are not available for the Executive plan");
            }
        }

        SubscriptionPlan plan = req.getPlan();
        BigDecimal amount = resolveAmount(plan, req.getCustomAmount(), agent.isExecutiveAgent());

        // ── 13-trial loan cycle validation ────────────────────────────────────
        LoanProgram loanProgram = null;
        int trialNumber = 0;
        if (useLoan) {
            loanProgram = loanProgramRepo.findByAgentId(agentId).orElse(null);

            if (loanProgram == null) {
                // First-ever loan: must start from BASIC
                if (plan != SubscriptionPlan.BASIC) {
                    throw new ResponseStatusException(BAD_REQUEST,
                        "You must start the loan program from the BASIC plan");
                }
                LoanProgram newProgram = Objects.requireNonNull(LoanProgram.builder().agentId(agentId).build());
                loanProgram = Objects.requireNonNull(loanProgramRepo.save(newProgram), "saved LoanProgram must not be null");
            } else {
                if (loanProgram.getProgramStatus() == LoanProgram.ProgramStatus.COMPLETED) {
                    throw new ResponseStatusException(CONFLICT,
                        "You have completed the 13-trial loan program. Contact support to apply for a reset.");
                }
                SubscriptionPlan eligible = loanProgram.eligiblePlan();
                if (plan != eligible) {
                    throw new ResponseStatusException(BAD_REQUEST,
                        "At your current loan level (" + loanProgram.getCurrentLevel() + "), "
                        + "you must subscribe to the " + eligible.name() + " plan");
                }
            }
            trialNumber = loanProgram.getTotalTrialsCompleted() + 1;
        }

        // ── LOAN PATH: activate immediately, no Paystack ──────────────────────
        if (useLoan) {
            Objects.requireNonNull(loanProgram, "loanProgram must be set when useLoan=true");

            // Idempotency: return existing ACTIVE loan subscription for same plan
            Optional<AgentSubscription> existingActive = subscriptionRepo
                .findFirstByAgentIdAndPlanAndStatusAndLoan(agentId, plan, SubscriptionStatus.ACTIVE, true);
            if (existingActive.isPresent()) {
                AgentSubscription ex = existingActive.get();
                return SubscriptionInitResponse.builder()
                    .subscriptionId(ex.getId())
                    .plan(plan.name())
                    .amountDue(ex.getAmountPaid())
                    .paymentReference(ex.getPaymentReference())
                    .isLoan(true)
                    .status(ex.getStatus().name())
                    .build();
            }

            String reference = "LOAN-" + UUID.randomUUID().toString().replace("-", "").toUpperCase();
            LocalDate today = LocalDate.now();

            // Create ACTIVE subscription immediately (no payment step)
            AgentSubscription subscription = AgentSubscription.builder()
                .agentId(agentId)
                .plan(plan)
                .amountPaid(amount)
                .startDate(today)
                .endDate(today.plusMonths(1))
                .status(SubscriptionStatus.ACTIVE)
                .loan(true)
                .paymentReference(reference)
                .build();
            subscriptionRepo.save(Objects.requireNonNull(subscription));

            // Create ACTIVE loan immediately; repayment is due in 30 days
            AgentLoan loan = AgentLoan.builder()
                .agentId(agentId)
                .subscriptionId(subscription.getId())
                .plan(plan)
                .loanAmount(amount)
                .amountRepaid(BigDecimal.ZERO)
                .dueDate(today.plusDays(30))
                .trialNumber(trialNumber)
                .loanProgramId(loanProgram.getId())
                .status(AgentLoan.LoanStatus.ACTIVE)
                .repaymentStatus(AgentLoan.RepaymentStatus.PENDING)
                .build();
            loanRepo.save(Objects.requireNonNull(loan));

            log.info("Loan subscription {} created for agent {} on plan {} (trial {})",
                reference, agentId, plan, trialNumber);

            return SubscriptionInitResponse.builder()
                .subscriptionId(subscription.getId())
                .plan(plan.name())
                .amountDue(amount)
                .paymentReference(reference)
                .isLoan(true)
                .status(subscription.getStatus().name())
                .build();
        }

        // ── STANDARD PATH: Paystack payment required ──────────────────────────

        // Idempotency: return existing PENDING_PAYMENT sub rather than creating a duplicate.
        // This handles the case where the gateway timed out returning the first response.
        Optional<AgentSubscription> existingPending = subscriptionRepo
            .findFirstByAgentIdAndPlanAndStatusAndLoan(agentId, plan, SubscriptionStatus.PENDING_PAYMENT, false);
        if (existingPending.isPresent()) {
            AgentSubscription ex = existingPending.get();
            String url = ex.getAuthorizationUrl();
            if (url == null || url.isBlank()) {
                // URL was never stored (old row) — re-initialize Paystack
                url = initPaystackPayment(agentEmail, ex.getAmountPaid(), ex.getPaymentReference(),
                    Map.of("subscriptionId", ex.getId(), "plan", plan.name(), "agentId", agentId));
                ex.setAuthorizationUrl(url);
                subscriptionRepo.save(ex);
            }
            return SubscriptionInitResponse.builder()
                .subscriptionId(ex.getId())
                .plan(plan.name())
                .amountDue(ex.getAmountPaid())
                .paymentReference(ex.getPaymentReference())
                .authorizationUrl(url)
                .isLoan(false)
                .status(ex.getStatus().name())
                .build();
        }

        String reference = "SUB-" + UUID.randomUUID().toString().replace("-", "").toUpperCase();
        LocalDate today = LocalDate.now();

        AgentSubscription subscription = AgentSubscription.builder()
            .agentId(agentId)
            .plan(plan)
            .amountPaid(amount)
            .startDate(today)
            .endDate(today.plusMonths(1))
            .status(SubscriptionStatus.PENDING_PAYMENT)
            .loan(false)
            .paymentReference(reference)
            .build();
        subscriptionRepo.save(Objects.requireNonNull(subscription));

        String authorizationUrl = initPaystackPayment(agentEmail, amount, reference,
            Map.of("subscriptionId", subscription.getId(), "plan", plan.name(), "agentId", agentId));

        // Store the URL so retries can recover it without calling Paystack again
        subscription.setAuthorizationUrl(authorizationUrl);
        subscriptionRepo.save(subscription);

        return SubscriptionInitResponse.builder()
            .subscriptionId(subscription.getId())
            .plan(plan.name())
            .amountDue(amount)
            .paymentReference(reference)
            .authorizationUrl(authorizationUrl)
            .isLoan(false)
            .status(subscription.getStatus().name())
            .build();
    }

    /**
     * Verify a subscription payment by Paystack reference.
     * If the subscription is still PENDING_PAYMENT, calls the Paystack API live to check
     * and activates the subscription if the payment succeeded.
     * Used by the payment verify page as a fallback when the webhook hasn't fired yet.
     */
    @Transactional
    public SubscriptionResponse verifySubscriptionPayment(String reference) {
        AgentSubscription sub = subscriptionRepo.findByPaymentReference(reference)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND,
                "Subscription not found for reference: " + reference));

        if (sub.getStatus() == SubscriptionStatus.PENDING_PAYMENT) {
            try {
                String response = webClientBuilder.build()
                    .get()
                    .uri(PAYSTACK_BASE + "/transaction/verify/" + reference)
                    .header(org.springframework.http.HttpHeaders.AUTHORIZATION, "Bearer " + paystackSecretKey)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
                JsonNode data = objectMapper.readTree(response).path("data");
                if ("success".equals(data.path("status").asText())) {
                    activateSubscription(reference);
                    // Reload after activation
                    sub = subscriptionRepo.findByPaymentReference(reference).orElse(sub);
                }
            } catch (Exception e) {
                log.warn("Paystack verify for SUB reference {} failed: {}", reference, e.getMessage());
            }
        }

        return toSubscriptionResponse(sub);
    }

    /**
     * Activate a subscription after Paystack payment is confirmed.
     * Only used for standard (non-loan) subscriptions — loan subscriptions are
     * created ACTIVE immediately without Paystack.
     */
    @Transactional
    public void activateSubscription(String reference) {
        AgentSubscription sub = subscriptionRepo.findAll().stream()
            .filter(s -> reference.equals(s.getPaymentReference()))
            .findFirst()
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND,
                "Subscription not found for reference: " + reference));

        if (sub.getStatus() != SubscriptionStatus.PENDING_PAYMENT) {
            log.warn("Subscription {} already in status {}; skipping", reference, sub.getStatus());
            return;
        }
        sub.setStatus(SubscriptionStatus.ACTIVE);
        subscriptionRepo.save(sub);
        log.info("Subscription {} activated for agent {} on plan {}", reference, sub.getAgentId(), sub.getPlan());
    }

    /**
     * Mark a subscription as FAILED (called when Paystack signals failure or abandonment).
     * Only applies to standard (non-loan) subscriptions.
     */
    @Transactional
    public void failSubscription(String reference) {
        subscriptionRepo.findAll().stream()
            .filter(s -> reference.equals(s.getPaymentReference()))
            .findFirst()
            .ifPresent(sub -> {
                if (sub.getStatus() == SubscriptionStatus.PENDING_PAYMENT) {
                    sub.setStatus(SubscriptionStatus.FAILED);
                    subscriptionRepo.save(sub);
                    log.info("Subscription {} marked as FAILED", reference);
                }
            });
    }

    /** Returns all subscriptions for an agent. */
    @Transactional(readOnly = true)
    public List<SubscriptionResponse> getMySubscriptions(Long agentId) {
        return subscriptionRepo.findByAgentIdOrderByCreatedAtDesc(agentId)
            .stream().map(this::toSubscriptionResponse).collect(Collectors.toList());
    }

    /** Returns active subscription for the agent (for listing limit checks). */
    @Transactional(readOnly = true)
    public Optional<AgentSubscription> getActiveSubscription(Long agentId) {
        return subscriptionRepo.findFirstByAgentIdAndStatusOrderByEndDateDesc(agentId, SubscriptionStatus.ACTIVE);
    }

    /** Returns the max listings allowed under the agent's active subscription. */
    @Transactional(readOnly = true)
    public int getListingLimit(Long agentId) {
        return getActiveSubscription(agentId)
            .map(s -> s.getPlan().maxListings)
            .orElse(0);
    }
    /**
     * Returns whether the user has any active financial product (subscription OR loan),
     * along with their access level. Used by property-service to gate property creation.
     *
     * Access level semantics:
     *  RESTRICTED — loan is OVERDUE (past due date, unpaid)
     *  LIMITED    — loan is ACTIVE but not yet repaid
     *  FULL       — active subscription (non-loan) or loan is REPAID
     *  NONE       — no active product
     */
    @Transactional(readOnly = true)
    public ActiveProductResponse getActiveProduct(Long userId) {
        // OVERDUE takes priority — must be checked first
        if (loanRepo.countByAgentIdAndStatus(userId, AgentLoan.LoanStatus.OVERDUE) > 0) {
            return ActiveProductResponse.builder()
                .hasActiveProduct(true).productType("LOAN").accessLevel("RESTRICTED").build();
        }
        // Active unpaid loan → LIMITED
        if (loanRepo.countByAgentIdAndStatus(userId, AgentLoan.LoanStatus.ACTIVE) > 0) {
            return ActiveProductResponse.builder()
                .hasActiveProduct(true).productType("LOAN").accessLevel("LIMITED").build();
        }
        // Active subscription (repaid loan sub or standard sub) → FULL
        if (subscriptionRepo.countByAgentIdAndStatus(userId, SubscriptionStatus.ACTIVE) > 0) {
            return ActiveProductResponse.builder()
                .hasActiveProduct(true).productType("SUBSCRIPTION").accessLevel("FULL").build();
        }
        return ActiveProductResponse.builder()
            .hasActiveProduct(false).productType(null).accessLevel("NONE").build();
    }
    // ── Loan ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<LoanResponse> getMyLoans(Long agentId) {
        return loanRepo.findByAgentIdOrderByCreatedAtDesc(agentId)
            .stream().map(this::toLoanResponse).collect(Collectors.toList());
    }

    /** Record a loan repayment and advance the 13-trial cycle on full repayment. */
    @Transactional
    public LoanRepayInitResponse initiateLoanRepayment(Long loanId, Long agentId, String agentEmail) {
        AgentLoan loan = loanRepo.findById(Objects.requireNonNull(loanId, "loanId must not be null"))
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Loan not found"));

        if (!loan.getAgentId().equals(agentId))
            throw new ResponseStatusException(FORBIDDEN, "Access denied");
        if (loan.getStatus() != AgentLoan.LoanStatus.ACTIVE && loan.getStatus() != AgentLoan.LoanStatus.OVERDUE)
            throw new ResponseStatusException(BAD_REQUEST, "Loan is not repayable (status: " + loan.getStatus() + ")");

        // Idempotency: return existing Paystack URL if already initiated and not yet confirmed
        if (loan.getRepaymentReference() != null && !loan.getRepaymentReference().isBlank()
                && loan.getRepaymentStatus() == AgentLoan.RepaymentStatus.PENDING) {
            return LoanRepayInitResponse.builder()
                .loanId(loan.getId())
                .repaymentReference(loan.getRepaymentReference())
                .authorizationUrl(loan.getRepaymentAuthorizationUrl())
                .amount(loan.getLoanAmount())
                .build();
        }

        String reference = "REP-" + UUID.randomUUID().toString().replace("-", "").toUpperCase();
        String authorizationUrl = initPaystackPayment(agentEmail, loan.getLoanAmount(), reference,
            Map.of("loanId", loan.getId(), "agentId", agentId, "type", "LOAN_REPAYMENT"));

        loan.setRepaymentReference(reference);
        loan.setRepaymentAuthorizationUrl(authorizationUrl);
        loan.setRepaymentStatus(AgentLoan.RepaymentStatus.PENDING);
        loanRepo.save(loan);

        log.info("Loan repayment {} initiated for loan {} (agent {})", reference, loanId, agentId);
        return LoanRepayInitResponse.builder()
            .loanId(loan.getId())
            .repaymentReference(reference)
            .authorizationUrl(authorizationUrl)
            .amount(loan.getLoanAmount())
            .build();
    }

    /**
     * Confirm a loan repayment after Paystack webhook fires with charge.success on a REP- reference.
     * Marks loan REPAID, subscription remains ACTIVE, advances the 13-trial cycle.
     */
    @Transactional
    public void confirmLoanRepayment(String reference) {
        AgentLoan loan = loanRepo.findByRepaymentReference(reference)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND,
                "Loan not found for repayment reference: " + reference));

        if (loan.getStatus() == AgentLoan.LoanStatus.REPAID) {
            log.warn("Loan {} already REPAID; skipping duplicate webhook", loan.getId());
            return;
        }

        loan.setAmountRepaid(loan.getLoanAmount());
        loan.setStatus(AgentLoan.LoanStatus.REPAID);
        loan.setRepaymentStatus(AgentLoan.RepaymentStatus.SUCCESS);
        loanRepo.save(loan);
        log.info("Loan {} fully repaid via reference {}", loan.getId(), reference);

        // Advance the 13-trial cycle on successful repayment
        if (loan.getLoanProgramId() != null) {
            loanProgramRepo.findById(Objects.requireNonNull(loan.getLoanProgramId())).ifPresent(program -> {
                boolean advanced = program.recordSuccessfulRepayment();
                loanProgramRepo.save(program);
                if (advanced) {
                    log.info("Agent {} advanced to loan level {}", loan.getAgentId(), program.getCurrentLevel());
                }
            });
        }

        // Subscription remains ACTIVE — no change needed here
        // Access level will automatically become FULL (no ACTIVE loan anymore)
    }

    /**
     * Mark a loan repayment attempt as FAILED (Paystack charge.failed on a REP- reference).
     * Clears the repayment reference so the agent can retry.
     */
    @Transactional
    public void failLoanRepayment(String reference) {
        loanRepo.findByRepaymentReference(reference).ifPresent(loan -> {
            if (loan.getRepaymentStatus() == AgentLoan.RepaymentStatus.PENDING) {
                loan.setRepaymentStatus(AgentLoan.RepaymentStatus.FAILED);
                // Clear the reference so the agent can initiate a new payment
                loan.setRepaymentReference(null);
                loan.setRepaymentAuthorizationUrl(null);
                loanRepo.save(loan);
                log.info("Loan repayment {} failed for loan {}", reference, loan.getId());
            }
        });
    }

    // ── Loan Program ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Optional<LoanProgramResponse> getLoanProgram(Long agentId) {
        return loanProgramRepo.findByAgentId(agentId).map(this::toLoanProgramResponse);
    }

    // ── Scheduler ─────────────────────────────────────────────────────────────

    /** Expire subscriptions past their end date, and mark loans past their due date as OVERDUE. Runs every 6 hours. */
    @Scheduled(fixedDelay = 21_600_000)
    @Transactional
    public void expireStaleSubscriptions() {
        LocalDate today = LocalDate.now();

        List<AgentSubscription> expired = subscriptionRepo.findExpiredActive(today);
        if (!expired.isEmpty()) {
            log.info("Expiring {} subscription(s)", expired.size());
            expired.forEach(s -> {
                s.setStatus(SubscriptionStatus.EXPIRED);
                subscriptionRepo.save(s);
            });
        }

        // Mark ACTIVE loans past their dueDate as OVERDUE
        List<AgentLoan> overdueLoans = loanRepo.findOverdueActiveLoans(today);
        if (!overdueLoans.isEmpty()) {
            log.info("Marking {} loan(s) as OVERDUE", overdueLoans.size());
            overdueLoans.forEach(loan -> {
                loan.setStatus(AgentLoan.LoanStatus.OVERDUE);
                loanRepo.save(loan);
                // Also expire the associated loan-based subscription
                if (loan.getSubscriptionId() != null) {
                    subscriptionRepo.findById(Objects.requireNonNull(loan.getSubscriptionId())).ifPresent(sub -> {
                        if (sub.getStatus() == SubscriptionStatus.ACTIVE) {
                            sub.setStatus(SubscriptionStatus.EXPIRED);
                            subscriptionRepo.save(sub);
                            log.info("Expired loan subscription {} for agent {} (loan overdue)",
                                sub.getId(), sub.getAgentId());
                        }
                    });
                }
                log.info("Loan {} marked OVERDUE for agent {} (due: {})",
                    loan.getId(), loan.getAgentId(), loan.getDueDate());
            });
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private BigDecimal resolveAmount(SubscriptionPlan plan, BigDecimal customAmount, boolean isExecutiveAgent) {
        if (isExecutiveAgent && customAmount != null) {
            if (customAmount.compareTo(EXECUTIVE_AGENT_MIN_AMOUNT) < 0) {
                throw new ResponseStatusException(BAD_REQUEST,
                    "Executive Agents must contribute a minimum of ₦10,000/month");
            }
            return customAmount;
        }
        return plan.monthlyFee;
    }

    private String initPaystackPayment(String email, BigDecimal amountNgn,
                                       String reference, Map<String, Object> meta) {
        long amountKobo = amountNgn.multiply(BigDecimal.valueOf(100)).longValue();
        Map<String, Object> body = Map.of(
            "email", email,
            "amount", amountKobo,
            "reference", reference,
            "currency", "NGN",
            "callback_url", paystackCallbackUrl,
            "metadata", meta,
            "channels", new String[]{"card", "bank", "ussd", "bank_transfer", "qr"}
        );
        try {
            String response = webClientBuilder.build()
                .post()
                .uri(PAYSTACK_BASE + "/transaction/initialize")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + paystackSecretKey)
                .header(HttpHeaders.CONTENT_TYPE, "application/json")
                .bodyValue(Objects.requireNonNull(body))
                .retrieve()
                .bodyToMono(String.class)
                .block();
            JsonNode root = objectMapper.readTree(response);
            return root.path("data").path("authorization_url").asText();
        } catch (Exception e) {
            log.error("Paystack subscription init failed: {}", e.getMessage());
            throw new RuntimeException("Payment gateway unavailable – please try again later");
        }
    }

    private SubscriptionResponse toSubscriptionResponse(AgentSubscription s) {
        return SubscriptionResponse.builder()
            .id(s.getId()).plan(s.getPlan().name())
            .amountPaid(s.getAmountPaid())
            .startDate(s.getStartDate()).endDate(s.getEndDate())
            .status(s.getStatus().name()).isLoan(s.isLoan())
            .maxListings(s.getPlan().maxListings)
            .createdAt(s.getCreatedAt())
            .authorizationUrl(s.getStatus() == SubscriptionStatus.PENDING_PAYMENT ? s.getAuthorizationUrl() : null)
            .build();
    }

    private LoanResponse toLoanResponse(AgentLoan l) {
        return LoanResponse.builder()
            .id(l.getId()).agentId(l.getAgentId()).subscriptionId(l.getSubscriptionId())
            .plan(l.getPlan().name()).loanAmount(l.getLoanAmount())
            .amountRepaid(l.getAmountRepaid()).remainingBalance(l.getRemainingBalance())
            .dueDate(l.getDueDate()).status(l.getStatus().name())
            .repaymentStatus(l.getRepaymentStatus() != null ? l.getRepaymentStatus().name() : null)
            .repaymentAuthorizationUrl(
                l.getRepaymentStatus() == AgentLoan.RepaymentStatus.PENDING
                    ? l.getRepaymentAuthorizationUrl() : null)
            .trialNumber(l.getTrialNumber())
            .createdAt(l.getCreatedAt())
            .build();
    }

    private LoanProgramResponse toLoanProgramResponse(LoanProgram p) {
        return LoanProgramResponse.builder()
            .id(p.getId())
            .currentLevel(p.getCurrentLevel().name())
            .basicTrialsCompleted(p.getBasicTrialsCompleted())
            .standardTrialsCompleted(p.getStandardTrialsCompleted())
            .premiumTrialsCompleted(p.getPremiumTrialsCompleted())
            .totalTrialsCompleted(p.getTotalTrialsCompleted())
            .trialsRemainingInLevel(p.getTrialsRemainingInCurrentLevel())
            .programStatus(p.getProgramStatus().name())
            .eligiblePlan(p.eligiblePlan() != null ? p.eligiblePlan().name() : null)
            .build();
    }
}
