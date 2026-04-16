package com.corecity.user.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.corecity.user.dto.SubscriptionDTOs.*;
import com.corecity.user.entity.AgentLoan;
import com.corecity.user.entity.AgentSubscription;
import com.corecity.user.entity.AgentSubscription.SubscriptionPlan;
import com.corecity.user.entity.AgentSubscription.SubscriptionStatus;
import com.corecity.user.entity.User;
import com.corecity.user.repository.AgentLoanRepository;
import com.corecity.user.repository.AgentSubscriptionRepository;
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
    private final UserRepository userRepository;
    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    @Value("${paystack.secret-key}")
    private String paystackSecretKey;

    @Value("${paystack.callback-url:https://corecity.com.ng/payment/verify}")
    private String paystackCallbackUrl;

    private static final String PAYSTACK_BASE = "https://api.paystack.co";
    private static final int MAX_LOAN_MONTHS = 6;
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
     * Initiates a subscription for an agent.
     * If the agent is an Executive Agent, they may supply a customAmount ≥ ₦10,000.
     * If useLoan = true and the plan is eligible, the subscription is loan-funded.
     */
    @Transactional
    public SubscriptionInitResponse subscribe(SubscribeRequest req, Long agentId, String agentEmail) {
        Objects.requireNonNull(agentId, "agentId must not be null");

        User agent = userRepository.findById(agentId)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));

        if (agent.getRole() != User.Role.AGENT) {
            throw new ResponseStatusException(FORBIDDEN, "Subscriptions are only available to agents");
        }

        if (subscriptionRepo.countByAgentIdAndStatus(agentId, SubscriptionStatus.ACTIVE) > 0) {
            throw new ResponseStatusException(CONFLICT, "You already have an active subscription");
        }

        SubscriptionPlan plan = req.getPlan();
        BigDecimal amount = resolveAmount(plan, req.getCustomAmount(), agent.isExecutiveAgent());

        // Loan eligibility: BASIC, STANDARD, PREMIUM only
        boolean useLoan = req.isUseLoan();
        if (useLoan && plan == SubscriptionPlan.EXECUTIVE) {
            throw new ResponseStatusException(BAD_REQUEST, "Loans are not available for the Executive Plan");
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

        // For loan subscriptions the agent pays ₦0 upfront (loan covers it).
        // We still create a ₦1 Paystack link so the system can confirm intent,
        // but in practice the CoreCity admin approves the loan and activates manually.
        // For simplicity here we initiate a full Paystack checkout for loan plans too —
        // the agent repays via commission deductions.
        String authorizationUrl = initPaystackPayment(agentEmail, amount, reference,
            Map.of("subscriptionId", subscription.getId(), "plan", plan.name(), "agentId", agentId));

        if (useLoan) {
            AgentLoan loan = AgentLoan.builder()
                .agentId(agentId)
                .subscriptionId(subscription.getId())
                .plan(plan)
                .loanAmount(amount)
                .amountRepaid(BigDecimal.ZERO)
                .dueDate(today.plusMonths(MAX_LOAN_MONTHS))
                .status(AgentLoan.LoanStatus.ACTIVE)
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

    /** Activate a subscription after Paystack payment is confirmed. */
    @Transactional
    public void activateSubscription(String reference) {
        AgentSubscription sub = subscriptionRepo.findAll().stream()
            .filter(s -> reference.equals(s.getPaymentReference()))
            .findFirst()
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Subscription not found for reference: " + reference));

        if (sub.getStatus() != SubscriptionStatus.PENDING_PAYMENT) {
            log.warn("Subscription {} already in status {}; skipping", reference, sub.getStatus());
            return;
        }
        sub.setStatus(SubscriptionStatus.ACTIVE);
        subscriptionRepo.save(sub);
        log.info("Subscription {} activated for agent {} on plan {}", reference, sub.getAgentId(), sub.getPlan());
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

    // ── Loan ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<LoanResponse> getMyLoans(Long agentId) {
        return loanRepo.findByAgentIdOrderByCreatedAtDesc(agentId)
            .stream().map(this::toLoanResponse).collect(Collectors.toList());
    }

    /** Record a loan repayment. */
    @Transactional
    public LoanResponse repayLoan(Long loanId, BigDecimal amount, Long agentId) {
        AgentLoan loan = loanRepo.findById(loanId)
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
        } else {
            loan.setAmountRepaid(newRepaid);
        }
        loanRepo.save(loan);
        return toLoanResponse(loan);
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
                .bodyValue(body)
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
            .createdAt(l.getCreatedAt())
            .build();
    }
}
