package com.corecity.user.repository;

import com.corecity.user.entity.WalletTransaction;
import com.corecity.user.entity.WalletTransaction.Status;
import com.corecity.user.entity.WalletTransaction.Type;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, Long> {

    List<WalletTransaction> findByWalletIdOrderByCreatedAtDesc(Long walletId);

    Optional<WalletTransaction> findByReference(String reference);

    boolean existsByReference(String reference);

    /** Used for idempotency: find the most recent pending top-up for a wallet. */
    Optional<WalletTransaction> findTopByWalletIdAndTypeAndStatusOrderByCreatedAtDesc(
        Long walletId, Type type, Status status);
}
