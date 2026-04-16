package com.corecity.user.controller;

import com.corecity.user.dto.SubscriptionDTOs.*;
import com.corecity.user.service.ReputationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/agents")
@RequiredArgsConstructor
public class ReputationController {

    private final ReputationService reputationService;

    /**
     * GET /api/v1/agents/{agentId}/reputation
     * Public endpoint – anyone can view an agent's reputation score.
     */
    @GetMapping("/{agentId}/reputation")
    public ResponseEntity<AgentReputationResponse> getReputation(
            @PathVariable Long agentId) {
        return ResponseEntity.ok(reputationService.getAgentReputation(agentId));
    }

    /**
     * POST /api/v1/agents/{agentId}/feedback
     * Authenticated customers submit post-transaction feedback for an agent.
     */
    @PostMapping("/{agentId}/feedback")
    public ResponseEntity<AgentReputationResponse> submitFeedback(
            @PathVariable Long agentId,
            @Valid @RequestBody SubmitFeedbackRequest req,
            @RequestHeader("X-User-Id") Long userId) {
        req.setAgentId(agentId);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(reputationService.submitCustomerFeedback(req, userId));
    }
}
