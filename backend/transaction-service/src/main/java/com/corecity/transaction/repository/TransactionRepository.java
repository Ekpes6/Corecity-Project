package com.corecity.transaction.repository;

import com.corecity.transaction.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    Optional<Transaction> findByReference(String reference);
    List<Transaction> findByBuyerIdOrderByCreatedAtDesc(Long buyerId);
    List<Transaction> findBySellerIdOrderByCreatedAtDesc(Long sellerId);
    List<Transaction> findByPropertyId(Long propertyId);
    /** Used for idempotent initiation — find an in-flight transaction for same buyer+property. */
    Optional<Transaction> findTopByPropertyIdAndBuyerIdAndStatusInOrderByCreatedAtDesc(
        Long propertyId, Long buyerId, List<Transaction.TransactionStatus> statuses);
}
