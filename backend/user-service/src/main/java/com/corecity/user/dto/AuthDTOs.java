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
    }
}
