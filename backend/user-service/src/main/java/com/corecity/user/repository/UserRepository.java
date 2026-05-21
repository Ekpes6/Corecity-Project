package com.corecity.user.repository;

import com.corecity.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByPhone(String phone);
    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);
    List<User> findByRole(User.Role role);
    Optional<User> findByEmailVerificationToken(String token);

    @Query("SELECT u FROM User u WHERE LOWER(u.email) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "OR LOWER(u.firstName) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "OR LOWER(u.lastName) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<User> searchByEmailOrName(@Param("q") String q);

    /**
     * Writes a pre-encrypted NIN value directly into the column, bypassing the
     * JPA AttributeConverter. Call this with an already-encrypted ciphertext.
     */
    @Modifying
    @Query(value = "UPDATE users SET nin = :nin WHERE id = :id", nativeQuery = true)
    void setEncryptedNin(@Param("id") Long id, @Param("nin") String nin);

    /**
     * Writes a pre-encrypted BVN value directly into the column, bypassing the
     * JPA AttributeConverter. Call this with an already-encrypted ciphertext.
     */
    @Modifying
    @Query(value = "UPDATE users SET bvn = :bvn WHERE id = :id", nativeQuery = true)
    void setEncryptedBvn(@Param("id") Long id, @Param("bvn") String bvn);

    /** Marks the user as verified. */
    @Modifying
    @Query(value = "UPDATE users SET is_verified = 1 WHERE id = :id", nativeQuery = true)
    void markVerified(@Param("id") Long id);

    /**
     * Returns the raw (encrypted) NIN column value without loading the full entity.
     * Used to check whether a NIN has already been stored.
     */
    @Query(value = "SELECT nin FROM users WHERE id = :id", nativeQuery = true)
    String getRawNin(@Param("id") Long id);

    /**
     * Returns the raw (encrypted) BVN column value without loading the full entity.
     */
    @Query(value = "SELECT bvn FROM users WHERE id = :id", nativeQuery = true)
    String getRawBvn(@Param("id") Long id);

    /** Returns all AGENT and SELLER accounts, ordered by most recently created. */
    @Query("SELECT u FROM User u WHERE u.role IN ('AGENT', 'SELLER') ORDER BY u.createdAt DESC")
    List<User> findAllAgentsAndSellers();

    /** Updates account_status, suspension_reason, suspension_note, funds_withheld, suspended_at, suspended_by_admin_id for a user. */
    @Modifying
    @Query(value = "UPDATE users SET account_status = :status, suspension_reason = :reason, " +
                   "suspension_note = :note, funds_withheld = :withheld, " +
                   "suspended_at = :suspendedAt, suspended_by_admin_id = :adminId WHERE id = :id",
           nativeQuery = true)
    void updateAccountStatus(@Param("id") Long id,
                             @Param("status") String status,
                             @Param("reason") String reason,
                             @Param("note") String note,
                             @Param("withheld") boolean withheld,
                             @Param("suspendedAt") java.time.LocalDateTime suspendedAt,
                             @Param("adminId") Long adminId);

    /** Reinstates a user to ACTIVE, clearing all suspension fields. */
    @Modifying
    @Query(value = "UPDATE users SET account_status = 'ACTIVE', suspension_reason = NULL, " +
                   "suspension_note = NULL, funds_withheld = 0, suspended_at = NULL, " +
                   "suspended_by_admin_id = NULL WHERE id = :id",
           nativeQuery = true)
    void reinstateUser(@Param("id") Long id);
}
