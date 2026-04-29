package com.corecity.notification.dto;

import lombok.*;

import java.time.LocalDateTime;

public class NotificationDTOs {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class NotificationResponse {
        private Long id;
        private String title;
        private String body;
        private String type;
        private boolean read;
        private LocalDateTime createdAt;
    }

    /** Request body for POST /api/v1/notifications/admin/send */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class SendNotificationRequest {
        /** Target a specific user by their numeric ID. */
        private Long userId;

        /** Target a specific user by their email address (alternative to userId). */
        private String userEmail;

        /**
         * Target a role group: AGENT | SELLER | BUYER | ALL.
         * Ignored when userId or userEmail is set.
         */
        private String role;

        private String title;
        private String body;

        /** INFO (default) | SUCCESS | ALERT */
        private String type;
    }
}
