package com.corecity.user.service;

import com.corecity.user.dto.SubscriptionDTOs.*;
import com.corecity.user.entity.ReputationEvent;
import com.corecity.user.entity.User;
import com.corecity.user.repository.ReputationEventRepository;
import com.corecity.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Objects;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReputationService {

    /** Minimum score to qualify for Executive Agent status. */
    private static final int EXECUTIVE_THRESHOLD = 1000;

    private final ReputationEventRepository reputationRepo;
    private final UserRepository userRepository;

    /**
     * Submit customer feedback for an agent.
     * Rating 1-2 is negative; rating 4-5 awards 2 points; rating 3 awards 1 point.
     */
    @Transactional
    public AgentReputationResponse submitCustomerFeedback(SubmitFeedbackRequest req, Long customerId) {
        User agent = userRepository.findById(Objects.requireNonNull(req.getAgentId(), "agentId must not be null"))
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Agent not found"));

        if (agent.getRole() != User.Role.AGENT) {
            throw new ResponseStatusException(BAD_REQUEST, "Target user is not an agent");
        }

        boolean negative = req.getRating() <= 2;
        int points = negative ? 0 : (req.getRating() >= 4 ? 2 : 1);

        ReputationEvent event = ReputationEvent.builder()
            .agentId(req.getAgentId())
            .sourceUserId(customerId)
            .source(ReputationEvent.ReputationSource.CUSTOMER_FEEDBACK)
            .points(points)
            .referenceId(req.getReferenceId())
            .comment(req.getComment())
            .negative(negative)
            .build();
        reputationRepo.save(Objects.requireNonNull(event));

        return refreshAgentReputation(agent);
    }

    /**
     * Award system-validation points when a transaction closes successfully.
     * Called internally or via RabbitMQ listener.
     */
    @Transactional
    public void awardSystemValidation(Long agentId, Long transactionId) {
        userRepository.findById(Objects.requireNonNull(agentId, "agentId must not be null")).ifPresent(agent -> {
            if (agent.getRole() != User.Role.AGENT) return;

            ReputationEvent event = ReputationEvent.builder()
                .agentId(agentId)
                .source(ReputationEvent.ReputationSource.SYSTEM_VALIDATION)
                .points(1)
                .referenceId(transactionId)
                .negative(false)
                .build();
            reputationRepo.save(Objects.requireNonNull(event));
            refreshAgentReputation(agent);
        });
    }

    /** Get the current reputation summary for an agent. */
    @Transactional(readOnly = true)
    public AgentReputationResponse getAgentReputation(Long agentId) {
        User agent = userRepository.findById(agentId)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Agent not found"));

        boolean hasNegative = reputationRepo.existsByAgentIdAndNegativeTrue(agentId);

        var recentEvents = reputationRepo.findByAgentIdOrderByCreatedAtDesc(agentId)
            .stream().limit(20)
            .map(e -> ReputationEventDTO.builder()
                .id(e.getId()).source(e.getSource().name())
                .points(e.getPoints()).negative(e.isNegative())
                .comment(e.getComment()).createdAt(e.getCreatedAt())
                .build())
            .collect(Collectors.toList());

        return AgentReputationResponse.builder()
            .agentId(agentId)
            .reputationScore(agent.getReputationScore())
            .executiveAgent(agent.isExecutiveAgent())
            .hasNegativeReviews(hasNegative)
            .recentEvents(recentEvents)
            .build();
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    private AgentReputationResponse refreshAgentReputation(User agent) {
        int score = reputationRepo.sumPositivePoints(agent.getId());
        boolean hasNegative = reputationRepo.existsByAgentIdAndNegativeTrue(agent.getId());
        boolean isExecutive = score > EXECUTIVE_THRESHOLD && !hasNegative;

        agent.setReputationScore(score);
        agent.setExecutiveAgent(isExecutive);
        userRepository.save(agent);

        if (isExecutive) {
            log.info("Agent {} has qualified for Executive Agent status (score={})", agent.getId(), score);
        }

        return AgentReputationResponse.builder()
            .agentId(agent.getId())
            .reputationScore(score)
            .executiveAgent(isExecutive)
            .hasNegativeReviews(hasNegative)
            .build();
    }
}
