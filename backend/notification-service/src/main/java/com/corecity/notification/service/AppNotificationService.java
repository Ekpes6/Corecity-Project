package com.corecity.notification.service;

import com.corecity.notification.dto.NotificationDTOs.*;
import com.corecity.notification.entity.AppNotification;
import com.corecity.notification.repository.AppNotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class AppNotificationService {

    private final AppNotificationRepository repo;
    private final WebClient.Builder webClientBuilder;

    @Value("${user-service.uri:http://user-service:8081}")
    private String userServiceUri;

    // ── Read ──────────────────────────────────────────────────────────────────

    public List<NotificationResponse> getMyNotifications(Long userId) {
        return repo.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, 50))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public long getUnreadCount(Long userId) {
        return repo.countByUserIdAndReadFalse(userId);
    }

    // ── Mark read ─────────────────────────────────────────────────────────────

    @Transactional
    public void markRead(Long id, Long userId) {
        AppNotification n = repo.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!n.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        n.setRead(true);
        repo.save(n);
    }

    @Transactional
    public void markAllRead(Long userId) {
        repo.markAllReadForUser(userId);
    }

    // ── Admin send ────────────────────────────────────────────────────────────

    @Transactional
    public int sendNotification(SendNotificationRequest req) {
        if (req.getTitle() == null || req.getTitle().isBlank()
                || req.getBody() == null || req.getBody().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title and body are required");
        }

        List<Long> targetIds = resolveTargetUserIds(req);
        if (targetIds.isEmpty()) {
            return 0;
        }

        String type = (req.getType() != null && !req.getType().isBlank()) ? req.getType() : "INFO";

        List<AppNotification> notifications = targetIds.stream()
                .map(uid -> AppNotification.builder()
                        .userId(uid)
                        .title(req.getTitle())
                        .body(req.getBody())
                        .type(type)
                        .build())
                .toList();

        repo.saveAll(Objects.requireNonNull(notifications));
        log.info("Admin sent notification '{}' to {} users", req.getTitle(), notifications.size());
        return notifications.size();
    }

    /** Resolve target user IDs: specific user, role group, or everyone. */
    @SuppressWarnings("unchecked")
    private List<Long> resolveTargetUserIds(SendNotificationRequest req) {
        // Target a single user
        if (req.getUserId() != null) {
            return List.of(req.getUserId());
        }

        // Fan-out: call user-service internal endpoint to get IDs
        String role = (req.getRole() != null && !req.getRole().isBlank()) ? req.getRole() : "ALL";
        try {
            List<Long> ids = webClientBuilder.build()
                    .get()
                    .uri(userServiceUri + "/internal/users/ids-by-role?role=" + role)
                    .retrieve()
                    .bodyToFlux(Long.class)
                    .collectList()
                    .block();
            return ids != null ? ids : List.of();
        } catch (Exception e) {
            log.error("Failed to fetch user IDs for role '{}' from user-service: {}", role, e.getMessage());
            return List.of();
        }
    }

    // ── Mapper ────────────────────────────────────────────────────────────────

    private NotificationResponse toResponse(AppNotification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .title(n.getTitle())
                .body(n.getBody())
                .type(n.getType())
                .read(n.isRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
