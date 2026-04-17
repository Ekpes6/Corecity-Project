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
                loanProgram = LoanProgram.builder().agentId(agentId).build();
                loanProgram = loanProgramRepo.save(loanProgram);
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

        String reference = "SUB-" + UUID.randomUUID().toString().replace("-", "").toUpperCase();
        LocalDate today = LocalDate.now();

        AgentSubscription subscription = AgentSubscription.builder()
            .agentId(agentId)
            .plan(plan)
            .amountPaid(amount)
            .startDate(today)
            .endDate(today.plusMonths(1))
            .status(SubscriptionStatus.PENDING_PAYMENT)
            .loan(useLoan)
            .paymentReference(reference)
            .build();
        subscriptionRepo.save(Objects.requireNonNull(subscription));

        String authorizationUrl = initPaystackPayment(agentEmail, amount, reference,
            Map.of("subscriptionId", subscription.getId(), "plan", plan.name(), "agentId", agentId));

        // ── Loan created as PENDING — only activated after payment confirmed ──
        if (useLoan) {
            AgentLoan loan = AgentLoan.builder()
                .agentId(agentId)
                .subscriptionId(subscription.getId())
                .plan(plan)
                .loanAmount(amount)
                .amountRepaid(BigDecimal.ZERO)
                .dueDate(today.plusDays(30))          // 1-month fixed duration
                .trialNumber(trialNumber)
                .loanProgramId(loanProgram.getId())
                .status(AgentLoan.LoanStatus.PENDING) // activated on webhook
                .build();
            loanRepo.save(Objects.requireNonNull(loan));
        }

        return SubscriptionInitResponse.builder()
            .subscriptionId(subscription.getId())
            .plan(plan.name())
            .amountDue(amount)
            .paymentReference(reference)
            .authorizationUrl(authorizationUrl)
            .isLoan(useLoan)
            .status(subscription.getStatus().name())
            .build();
    }

    /**
     * Activate a subscription after Paystack payment is confirmed.
     * Also activates the associated PENDING loan if this was a loan-funded subscription.
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

        // Activate the associated PENDING loan now that payment is confirmed
        if (sub.isLoan()) {
            loanRepo.findBySubscriptionId(sub.getId()).ifPresent(loan -> {
                if (loan.getStatus() == AgentLoan.LoanStatus.PENDING) {
                    loan.setStatus(AgentLoan.LoanStatus.ACTIVE);
                    loanRepo.save(loan);
                    log.info("Loan {} activated for agent {} (trial {})",
                        loan.getId(), sub.getAgentId(), loan.getTrialNumber());
                }
            });
        }
    }

    /**
     * Mark a subscription as FAILED (called when Paystack signals failure or abandonment).
     * Also cancels the associated PENDING loan to keep state consistent.
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
                    loanRepo.findBySubscriptionId(sub.getId()).ifPresent(loan -> {
                        if (loan.getStatus() == AgentLoan.LoanStatus.PENDING) {
                            loan.setStatus(AgentLoan.LoanStatus.DEFAULTED);
                            loanRepo.save(loan);
                        }
                    });
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
     * Returns whether the user has any active financial product (subscription OR loan).
     * Used by property-service to gate property creation for AGENT/SELLER roles.
     */
    @Transactional(readOnly = true)
    public ActiveProductResponse getActiveProduct(Long userId) {
        boolean hasActiveSub  = subscriptionRepo.countByAgentIdAndStatus(userId, SubscriptionStatus.ACTIVE) > 0;
        boolean hasActiveLoan = loanRepo.countByAgentIdAndStatus(userId, AgentLoan.LoanStatus.ACTIVE) > 0;

        if (hasActiveSub) {
            return ActiveProductResponse.builder()
                .hasActiveProduct(true).productType("SUBSCRIPTION").build();
        }
        if (hasActiveLoan) {
            return ActiveProductResponse.builder()
                .hasActiveProduct(true).productType("LOAN").build();
        }
        return ActiveProductResponse.builder()
            .hasActiveProduct(false).productType(null).build();
    }
    // ── Loan ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<LoanResponse> getMyLoans(Long agentId) {
        return loanRepo.findByAgentIdOrderByCreatedAtDesc(agentId)
            .stream().map(this::toLoanResponse).collect(Collectors.toList());
    }

    /** Record a loan repayment and advance the 13-trial cycle on full repayment. */
    @Transactional
    public LoanResponse repayLoan(Long loanId, BigDecimal amount, Long agentId) {
        AgentLoan loan = loanRepo.findById(Objects.requireNonNull(loanId, "loanId must not be null"))
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Loan not found"));

        if (!loan.getAgentId().equals(agentId))
            throw new ResponseStatusException(FORBIDDEN, "Access denied");
        if (loan.getStatus() != AgentLoan.LoanStatus.ACTIVE)
            throw new ResponseStatusException(BAD_REQUEST, "Loan is not in ACTIVE state");
        if (amount.compareTo(BigDecimal.ZERO) <= 0)
            throw new ResponseStatusException(BAD_REQUEST, "Repayment amount must be positive");

        BigDecimal newRepaid = loan.getAmountRepaid().add(amount);
        if (newRepaid.compareTo(loan.getLoanAmount()) >= 0) {
            loan.setAmountRepaid(loan.getLoanAmount());
            loan.setStatus(AgentLoan.LoanStatus.REPAID);
            // Advance the 13-trial cycle on successful full repayment
            if (loan.getLoanProgramId() != null) {
                loanProgramRepo.findById(loan.getLoanProgramId()).ifPresent(program -> {
                    boolean advanced = program.recordSuccessfulRepayment();
                    loanProgramRepo.save(program);
                    if (advanced) {
                        log.info("Agent {} advanced to loan level {}", agentId, program.getCurrentLevel());
                    }
                });
            }
        } else {
            loan.setAmountRepaid(newRepaid);
        }
        loanRepo.save(loan);
        return toLoanResponse(loan);
    }

    // ── Loan Program ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Optional<LoanProgramResponse> getLoanProgram(Long agentId) {
        return loanProgramRepo.findByAgentId(agentId).map(this::toLoanProgramResponse);
    }

    // ── Scheduler ─────────────────────────────────────────────────────────────

    /** Expire subscriptions past their end date. Runs every 6 hours. */
    @Scheduled(fixedDelay = 21_600_000)
    @Transactional
    public void expireStaleSubscriptions() {
        List<AgentSubscription> expired = subscriptionRepo.findExpiredActive(LocalDate.now());
        if (expired.isEmpty()) return;
        log.info("Expiring {} subscription(s)", expired.size());
        expired.forEach(s -> {
            s.setStatus(SubscriptionStatus.EXPIRED);
            subscriptionRepo.save(s);
        });
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
            .build();
    }

    private LoanResponse toLoanResponse(AgentLoan l) {
        return LoanResponse.builder()
            .id(l.getId()).agentId(l.getAgentId()).subscriptionId(l.getSubscriptionId())
            .plan(l.getPlan().name()).loanAmount(l.getLoanAmount())
            .amountRepaid(l.getAmountRepaid()).remainingBalance(l.getRemainingBalance())
            .dueDate(l.getDueDate()).status(l.getStatus().name())
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
