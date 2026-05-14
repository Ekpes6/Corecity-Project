package com.corecity.user.dto;

import com.corecity.user.entity.User;
import jakarta.validation.constraints.*;
import lombok.*;

public class AuthDTOs {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class RegisterRequest {
        @NotBlank @Email
        private String email;

        @NotBlank @Pattern(regexp = "^\\+234[0-9]{10}$",
            message = "Phone must be in Nigerian format: +234XXXXXXXXXX")
        private String phone;

        @NotBlank @Size(min = 8, message = "Password must be at least 8 characters")
        private String password;

        @NotBlank private String firstName;
        @NotBlank private String lastName;

        @Builder.Default
        private User.Role role = User.Role.BUYER;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class LoginRequest {
        @NotBlank private String emailOrPhone;
        @NotBlank private String password;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class AuthResponse {
        private String accessToken;
        private String refreshToken;
        @Builder.Default
        private String tokenType = "Bearer";
        private UserDTO user;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class UserDTO {
        private Long id;
        private String email;
        private String phone;
        private String firstName;
        private String lastName;
        private String role;
        private boolean verified;
        private String avatarUrl;
        private Integer reputationScore;
        private boolean executiveAgent;
        private java.time.LocalDateTime createdAt;
        /** True if the user has already submitted a NIN (we never return the raw value). */
        private boolean ninSet;
        /** True if the user has already submitted a BVN (we never return the raw value). */
        private boolean bvnSet;
        /** Account status: ACTIVE | SUSPENDED | TERMINATED */
        private String accountStatus;
        /** Reason for suspension/termination (null when ACTIVE). */
        private String suspensionReason;
        /** Free-text admin note accompanying the action. */
        private String suspensionNote;
        /** True when pending funds are withheld pending investigation. */
        private boolean fundsWithheld;
        private java.time.LocalDateTime suspendedAt;
    }

    /** Lightweight projection returned by the admin user-search / managed-users endpoint. */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class UserSearchResult {
        private Long id;
        private String email;
        private String firstName;
        private String lastName;
        private String role;
        private String accountStatus;
        private String suspensionReason;
        private String suspensionNote;
        private boolean fundsWithheld;
        private java.time.LocalDateTime suspendedAt;
    }

    /** Request body for suspend / terminate endpoints. */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class SuspendRequest {
        /** BREACH | FRAUD | REGULATORY | INACTIVITY */
        private String reason;
        /** Optional free-text note visible only to admins. */
        private String note;
        /** When true, pending wallet/disbursement funds are frozen. */
        private boolean withholdFunds;
    }
}
