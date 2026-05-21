package com.corecity.user.controller;

import com.corecity.user.dto.AuthDTOs.*;
import com.corecity.user.dto.UpdateProfileRequest;
import com.corecity.user.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.Objects;

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

    /**
     * Email verification link handler.
     * Marks the account as email-verified and redirects the browser to the dashboard.
     * This endpoint is public (excluded from AuthFilter in the gateway).
     */
    @GetMapping("/auth/verify-email")
    public ResponseEntity<Void> verifyEmail(@RequestParam String token) {
        boolean ok = authService.verifyEmail(token);
        String redirect = ok
            ? "https://corecity.com.ng/login?emailVerified=1"
            : "https://corecity.com.ng/login?emailVerified=0";
        return ResponseEntity.status(HttpStatus.FOUND)
            .location(Objects.requireNonNull(URI.create(redirect)))
            .build();
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

    /**
     * POST /api/v1/users/me/verify-identity
     * Accepts nin and/or bvn in the request body.
     * Stores them encrypted and marks the user verified when both are on record.
     */
    @PostMapping("/users/me/verify-identity")
    public ResponseEntity<UserDTO> verifyIdentity(
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody Map<String, String> body) {
        String nin = body.get("nin");
        String bvn = body.get("bvn");
        if ((nin == null || nin.isBlank()) && (bvn == null || bvn.isBlank())) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(authService.submitIdentityVerification(userId, nin, bvn));
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

    /**
     * GET /api/v1/users/admin/managed — list all AGENT and SELLER accounts with status.
     */
    @GetMapping("/users/admin/managed")
    public ResponseEntity<List<UserSearchResult>> listManagedUsers(
            @RequestHeader("X-User-Role") String role) {
        if (!"ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(authService.listManagedUsers());
    }

    /**
     * POST /api/v1/users/admin/{id}/suspend — suspend a user's account.
     */
    @PostMapping("/users/admin/{id}/suspend")
    public ResponseEntity<Void> suspendUser(
            @PathVariable("id") Long targetId,
            @RequestHeader("X-User-Id") Long adminId,
            @RequestHeader("X-User-Role") String role,
            @RequestBody SuspendRequest req) {
        if (!"ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        authService.suspendUser(adminId, targetId, req.getReason(), req.getNote(), req.isWithholdFunds());
        return ResponseEntity.ok().build();
    }

    /**
     * POST /api/v1/users/admin/{id}/terminate — permanently terminate a user's account.
     */
    @PostMapping("/users/admin/{id}/terminate")
    public ResponseEntity<Void> terminateUser(
            @PathVariable("id") Long targetId,
            @RequestHeader("X-User-Id") Long adminId,
            @RequestHeader("X-User-Role") String role,
            @RequestBody SuspendRequest req) {
        if (!"ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        authService.terminateUser(adminId, targetId, req.getReason(), req.getNote(), req.isWithholdFunds());
        return ResponseEntity.ok().build();
    }

    /**
     * POST /api/v1/users/admin/{id}/reinstate — restore a suspended/terminated account to ACTIVE.
     */
    @PostMapping("/users/admin/{id}/reinstate")
    public ResponseEntity<Void> reinstateUser(
            @PathVariable("id") Long targetId,
            @RequestHeader("X-User-Id") Long adminId,
            @RequestHeader("X-User-Role") String role) {
        if (!"ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        authService.reinstateUser(adminId, targetId);
        return ResponseEntity.ok().build();
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
