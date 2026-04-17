package com.corecity.user.repository;

import com.corecity.user.entity.LoanProgram;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LoanProgramRepository extends JpaRepository<LoanProgram, Long> {
    Optional<LoanProgram> findByAgentId(Long agentId);
}
