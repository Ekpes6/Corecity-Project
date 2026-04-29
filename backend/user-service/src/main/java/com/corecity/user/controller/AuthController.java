package com.corecity.user.controller;

import com.corecity.user.dto.AuthDTOs.*;
import com.corecity.user.dto.UpdateProfileRequest;
import com.corecity.user.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/auth/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(req));
    }

    @PostMapping("/auth/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.login(req));
    }

    @PostMapping("/auth/refresh")
    public ResponseEntity<AuthResponse> refresh(@RequestBody Map<String, String> body) {
        String token = body.get("refreshToken");
        if (token == null || token.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(authService.refresh(token));
    }

    @GetMapping("/users/check-phone")
    public ResponseEntity<Map<String, Boolean>> checkPhone(
            @RequestParam String phone) {
        boolean available = authService.isPhoneAvailable(phone);
        return ResponseEntity.ok(Map.of("available", available));
    }

    @GetMapping("/users/me")
    public ResponseEntity<UserDTO> getProfile(@RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(authService.getProfile(userId));
    }

    @PutMapping("/users/me")
    public ResponseEntity<UserDTO> updateProfile(
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody UpdateProfileRequest req) {
        return ResponseEntity.ok(authService.updateProfile(userId, req));
    }

    @PostMapping("/users/me/change-password")
    public ResponseEntity<Void> changePassword(
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody Map<String, String> body) {
        String current = body.get("currentPassword");
        String newPwd  = body.get("newPassword");
        if (current == null || current.isBlank() || newPwd == null || newPwd.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        authService.changePassword(userId, current, newPwd);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/auth/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP", "service", "user-service"));
    }

    /**
     * Internal service-to-service endpoint — NOT routed through the API gateway.
     * Called by notification-service to fan-out admin notifications by role.
     * Path intentionally uses /internal/ prefix so it doesn't match any gateway route.
     */
    /**
     * GET /api/v1/users/admin/search?q=X — admin user search for autocomplete.
     * Returns up to 20 users whose email/name contains the query string.
     */
    @GetMapping("/users/admin/search")
    public ResponseEntity<List<UserSearchResult>> searchUsers(
            @RequestParam(defaultValue = "") String q,
            @RequestHeader("X-User-Role") String role) {
        if (!"ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(authService.searchUsers(q));
    }

    @GetMapping("/internal/users/ids-by-role")
    public ResponseEntity<List<Long>> getUserIdsByRole(
            @RequestParam(required = false) String role) {
        return ResponseEntity.ok(authService.getUserIdsByRole(role));
    }

    /**
     * Internal: resolves a user's email to their numeric ID.
     * Used by notification-service when admin sends to an individual by email.
     */
    @GetMapping("/internal/users/id-by-email")
    public ResponseEntity<Map<String, Long>> getUserIdByEmail(
            @RequestParam String email) {
        return authService.getUserIdByEmail(email)
                .map(id -> ResponseEntity.ok(Map.of("id", id)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
