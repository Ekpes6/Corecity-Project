package com.corecity.user;

import com.corecity.user.dto.AuthDTOs.*;
import com.corecity.user.entity.User;
import com.corecity.user.repository.UserRepository;
import com.corecity.user.security.JwtUtil;
import com.corecity.user.service.AuthService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock UserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock JwtUtil jwtUtil;
    @Mock RabbitTemplate rabbitTemplate;

    @InjectMocks AuthService authService;

    // ─── register ────────────────────────────────────────────────────────────

    @Test
    void register_success_returnsTokenAndUser() {
        when(userRepository.existsByEmail("a@b.com")).thenReturn(false);
        when(userRepository.existsByPhone("+2348012345678")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("$bcrypt$hash");
        when(userRepository.save(any())).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            // Simulate DB assigning an ID
            try {
                var idField = User.class.getDeclaredField("id");
                idField.setAccessible(true);
                idField.set(u, 1L);
            } catch (Exception ignored) {}
            return u;
        });
        when(jwtUtil.generateToken(any())).thenReturn("jwt.token.here");

        var req = RegisterRequest.builder()
            .email("a@b.com").phone("+2348012345678").password("password123")
            .firstName("Ada").lastName("Obi").build();

        var result = authService.register(req);

        assertThat(result.getAccessToken()).isEqualTo("jwt.token.here");
        assertThat(result.getUser().getEmail()).isEqualTo("a@b.com");
        assertThat(result.getUser().getFirstName()).isEqualTo("Ada");
        // Welcome notification must be published
        verify(rabbitTemplate).convertAndSend(eq("corecity.exchange"),
            eq("notification.welcome"), any(Object.class));
    }

    @Test
    void register_duplicateEmail_throwsException() {
        when(userRepository.existsByEmail("a@b.com")).thenReturn(true);

        var req = RegisterRequest.builder()
            .email("a@b.com").phone("+2348012345678").password("password123")
            .firstName("Ada").lastName("Obi").build();

        assertThatRuntimeException()
            .isThrownBy(() -> authService.register(req))
            .withMessageContaining("Email already registered");

        verify(userRepository, never()).save(any());
    }

    @Test
    void register_duplicatePhone_throwsException() {
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(userRepository.existsByPhone("+2348012345678")).thenReturn(true);

        var req = RegisterRequest.builder()
            .email("new@b.com").phone("+2348012345678").password("password123")
            .firstName("Ada").lastName("Obi").build();

        assertThatRuntimeException()
            .isThrownBy(() -> authService.register(req))
            .withMessageContaining("Phone number already registered");
    }

    // ─── login ───────────────────────────────────────────────────────────────

    @Test
    void login_validCredentials_returnsToken() {
        var user = buildUser(1L, "a@b.com", "$bcrypt$hash");
        when(userRepository.findByEmail("a@b.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password123", "$bcrypt$hash")).thenReturn(true);
        when(jwtUtil.generateToken(user)).thenReturn("valid.jwt.token");

        var req = new LoginRequest("a@b.com", "password123");
        var result = authService.login(req);

        assertThat(result.getAccessToken()).isEqualTo("valid.jwt.token");
    }

    @Test
    void login_wrongPassword_throwsInvalidCredentials() {
        var user = buildUser(1L, "a@b.com", "$bcrypt$hash");
        when(userRepository.findByEmail("a@b.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);

        assertThatRuntimeException()
            .isThrownBy(() -> authService.login(new LoginRequest("a@b.com", "wrong")))
            .withMessageContaining("Invalid credentials");
    }

    @Test
    void login_unknownEmail_throwsInvalidCredentials() {
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());
        when(userRepository.findByPhone(anyString())).thenReturn(Optional.empty());

        assertThatRuntimeException()
            .isThrownBy(() -> authService.login(new LoginRequest("nobody@x.com", "pass")))
            .withMessageContaining("Invalid credentials");
    }

    @Test
    void login_byPhone_works() {
        var user = buildUser(1L, "a@b.com", "$bcrypt$hash");
        // Email lookup returns empty, phone lookup finds the user
        when(userRepository.findByEmail("+2348012345678")).thenReturn(Optional.empty());
        when(userRepository.findByPhone("+2348012345678")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password123", "$bcrypt$hash")).thenReturn(true);
        when(jwtUtil.generateToken(user)).thenReturn("jwt.by.phone");

        var result = authService.login(new LoginRequest("+2348012345678", "password123"));
        assertThat(result.getAccessToken()).isEqualTo("jwt.by.phone");
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private User buildUser(Long id, String email, String encodedPassword) {
        return User.builder()
            .id(id).email(email).phone("+2348012345678")
            .password(encodedPassword).firstName("Ada").lastName("Obi")
            .role(User.Role.BUYER).build();
    }
}
