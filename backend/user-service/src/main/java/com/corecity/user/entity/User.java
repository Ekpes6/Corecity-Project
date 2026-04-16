package com.corecity.user.entity;

import com.corecity.user.security.EncryptedStringConverter;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false, unique = true)
    private String phone;

    @Column(nullable = false)
    private String password;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Role role = Role.BUYER;

    @Convert(converter = EncryptedStringConverter.class)
    private String nin;   // National Identification Number (AES-256-GCM encrypted)

    @Convert(converter = EncryptedStringConverter.class)
    private String bvn;   // Bank Verification Number (AES-256-GCM encrypted)

    @Column(name = "is_verified")
    @Builder.Default
    private boolean verified = false;

    @Column(name = "avatar_url")
    private String avatarUrl;

    /**
     * Cumulative reputation score for agents.
     * Exceeding 1,000 with no negative reviews qualifies the agent for Executive Agent status.
     */
    @Column(name = "reputation_score")
    @Builder.Default
    private Integer reputationScore = 0;

    /**
     * True when the agent's reputation score > 1,000 and they have no negative reviews.
     * Grants access to Executive Plan features with flexible monthly contribution.
     */
    @Column(name = "is_executive_agent")
    @Builder.Default
    private boolean executiveAgent = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum Role {
        BUYER, SELLER, AGENT, ADMIN
    }
}
