package com.corecity.user.repository;

import com.corecity.user.entity.WalletTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, Long> {

    List<WalletTransaction> findByWalletIdOrderByCreatedAtDesc(Long walletId);

    Optional<WalletTransaction> findByReference(String reference);

    boolean existsByReference(String reference);
}
