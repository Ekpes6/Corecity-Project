package com.corecity.user.service;

import com.corecity.user.dto.AuthDTOs.*;
import com.corecity.user.dto.UpdateProfileRequest;
import com.corecity.user.entity.User;
import com.corecity.user.repository.UserRepository;
import com.corecity.user.security.JwtUtil;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final RabbitTemplate rabbitTemplate;

    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.getEmail()))
            throw new RuntimeException("Email already registered");
        if (userRepository.existsByPhone(req.getPhone()))
            throw new RuntimeException("Phone number already registered");

        var builtUser = User.builder()
            .email(req.getEmail())
            .phone(req.getPhone())
            .password(passwordEncoder.encode(req.getPassword()))
            .firstName(req.getFirstName())
            .lastName(req.getLastName())
            .role(req.getRole())
            .build();

        var savedUser = userRepository.save(Objects.requireNonNull(builtUser, "built user must not be null"));

        // Publish welcome notification event
        rabbitTemplate.convertAndSend("corecity.exchange", "notification.welcome",
            Map.of("userId", savedUser.getId(), "email", savedUser.getEmail(),
                   "name", savedUser.getFirstName(), "phone", savedUser.getPhone()));

        return AuthResponse.builder()
            .accessToken(jwtUtil.generateToken(savedUser))
            .refreshToken(jwtUtil.generateRefreshToken(savedUser))
            .user(toDTO(savedUser))
            .build();
    }

    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.getEmailOrPhone())
            .or(() -> userRepository.findByPhone(req.getEmailOrPhone()))
            .orElseThrow(() -> new RuntimeException("Invalid credentials"));

        if (!passwordEncoder.matches(req.getPassword(), user.getPassword()))
            throw new RuntimeException("Invalid credentials");

        return AuthResponse.builder()
            .accessToken(jwtUtil.generateToken(user))
            .refreshToken(jwtUtil.generateRefreshToken(user))
            .user(toDTO(user))
            .build();
    }

    /**
     * Validates a refresh token and issues a new access token + refresh token pair.
     * The old refresh token is implicitly invalidated when the new one is issued
     * (clients must replace it). Use short refresh-token expiry for sensitive deployments.
     */
    public AuthResponse refresh(String refreshToken) {
        Claims claims;
        try {
            claims = jwtUtil.extractRefreshClaims(refreshToken);
        } catch (JwtException e) {
            throw new RuntimeException("Invalid or expired refresh token");
        }
        Long userId = Long.parseLong(claims.getSubject());
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        return AuthResponse.builder()
            .accessToken(jwtUtil.generateToken(user))
            .refreshToken(jwtUtil.generateRefreshToken(user))
            .user(toDTO(user))
            .build();
    }

    public UserDTO getProfile(Long userId) {
        Long safeUserId = Objects.requireNonNull(userId, "user id must not be null");
        User user = userRepository.findById(safeUserId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        return toDTO(user);
    }

    public UserDTO updateProfile(Long userId, UpdateProfileRequest req) {
        Long safeUserId = Objects.requireNonNull(userId, "user id must not be null");
        var user = userRepository.findById(safeUserId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        if (req.getFirstName() != null) user.setFirstName(req.getFirstName());
        if (req.getLastName() != null) user.setLastName(req.getLastName());
        if (req.getAvatarUrl() != null) user.setAvatarUrl(req.getAvatarUrl());
        var savedUser = userRepository.save(Objects.requireNonNull(user, "updated user must not be null"));
        return toDTO(savedUser);
    }

    private UserDTO toDTO(User u) {
        return UserDTO.builder()
            .id(u.getId()).email(u.getEmail()).phone(u.getPhone())
            .firstName(u.getFirstName()).lastName(u.getLastName())
            .role(u.getRole().name()).verified(u.isVerified())
            .avatarUrl(u.getAvatarUrl()).build();
    }
}
