package com.corecity.notification.controller;

import com.corecity.notification.dto.NotificationDTOs.*;
import com.corecity.notification.service.AppNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class AppNotificationController {

    private final AppNotificationService service;

    /** GET /api/v1/notifications — logged-in user's notifications (newest first, max 50) */
    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getMyNotifications(
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(service.getMyNotifications(userId));
    }

    /** GET /api/v1/notifications/unread-count — unread badge count */
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(Map.of("count", service.getUnreadCount(userId)));
    }

    /** POST /api/v1/notifications/{id}/read — mark one notification as read */
    @PostMapping("/{id}/read")
    public ResponseEntity<Void> markRead(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long userId) {
        service.markRead(id, userId);
        return ResponseEntity.ok().build();
    }

    /** POST /api/v1/notifications/mark-all-read — mark all as read */
    @PostMapping("/mark-all-read")
    public ResponseEntity<Void> markAllRead(
            @RequestHeader("X-User-Id") Long userId) {
        service.markAllRead(userId);
        return ResponseEntity.ok().build();
    }

    /**
     * POST /api/v1/notifications/admin/send — admin sends a notification.
     *
     * Body:
     * {
     *   "userId": 42,          // optional — send to a specific user
     *   "role": "AGENT",       // optional — AGENT | SELLER | BUYER | ALL
     *   "title": "...",
     *   "body": "...",
     *   "type": "INFO"         // INFO | SUCCESS | ALERT
     * }
     *
     * If both userId and role are omitted, defaults to ALL users.
     */
    @PostMapping("/admin/send")
    public ResponseEntity<Map<String, Object>> adminSend(
            @RequestBody SendNotificationRequest req,
            @RequestHeader("X-User-Role") String role) {
        if (!"ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        int sent = service.sendNotification(req);
        return ResponseEntity.ok(Map.of("sent", sent));
    }
}
