package com.corecity.user.repository;

import com.corecity.user.entity.WithdrawalRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WithdrawalRequestRepository extends JpaRepository<WithdrawalRequest, Long> {

    /** All withdrawal requests for a user, newest first. */
    List<WithdrawalRequest> findByUserIdOrderByCreatedAtDesc(Long userId);

    /** All withdrawal requests across all users, newest first — admin use. */
    List<WithdrawalRequest> findAllByOrderByCreatedAtDesc();
}
