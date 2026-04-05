package com.corecity.user.service;

import com.corecity.user.dto.AuthDTOs.*;
import com.corecity.user.entity.User;
import com.corecity.user.repository.UserRepository;
import com.corecity.user.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;

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

        User user = User.builder()
            .email(req.getEmail())
            .phone(req.getPhone())
            .password(passwordEncoder.encode(req.getPassword()))
            .firstName(req.getFirstName())
            .lastName(req.getLastName())
            .role(req.getRole())
            .build();

        user = userRepository.save(user);

        // Publish welcome notification event
        rabbitTemplate.convertAndSend("corecity.exchange", "notification.welcome",
            Map.of("userId", user.getId(), "email", user.getEmail(),
                   "name", user.getFirstName(), "phone", user.getPhone()));

        return AuthResponse.builder()
            .accessToken(jwtUtil.generateToken(user))
            .user(toDTO(user))
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
            .user(toDTO(user))
            .build();
    }

    public UserDTO getProfile(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        return toDTO(user);
    }

    public UserDTO updateProfile(Long userId, UpdateProfileRequest req) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        if (req.getFirstName() != null) user.setFirstName(req.getFirstName());
        if (req.getLastName() != null) user.setLastName(req.getLastName());
        if (req.getAvatarUrl() != null) user.setAvatarUrl(req.getAvatarUrl());
        return toDTO(userRepository.save(user));
    }

    private UserDTO toDTO(User u) {
        return UserDTO.builder()
            .id(u.getId()).email(u.getEmail()).phone(u.getPhone())
            .firstName(u.getFirstName()).lastName(u.getLastName())
            .role(u.getRole().name()).verified(u.isVerified())
            .avatarUrl(u.getAvatarUrl()).build();
    }
}
