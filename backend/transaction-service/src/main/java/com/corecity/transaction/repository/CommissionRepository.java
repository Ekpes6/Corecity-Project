package com.corecity.transaction.repository;

import com.corecity.transaction.entity.Commission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CommissionRepository extends JpaRepository<Commission, Long> {

    Optional<Commission> findByTransactionId(Long transactionId);

    List<Commission> findByAgentIdOrderByCreatedAtDesc(Long agentId);

    List<Commission> findAllByOrderByCreatedAtDesc();
}
