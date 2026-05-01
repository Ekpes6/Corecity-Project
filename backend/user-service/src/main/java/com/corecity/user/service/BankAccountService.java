package com.corecity.user.service;

import com.corecity.user.entity.BankAccount;
import com.corecity.user.repository.BankAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BankAccountService {

    private final BankAccountRepository bankAccountRepository;

    public List<BankAccount> getAccounts(Long userId) {
        return bankAccountRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional
    @SuppressWarnings("null")
    public BankAccount addAccount(Long userId, String bankName, String accountNumber, String accountName) {
        boolean hasAccounts = bankAccountRepository.existsByUserId(userId);

        BankAccount account = BankAccount.builder()
            .userId(userId)
            .bankName(bankName)
            .accountNumber(accountNumber)
            .accountName(accountName)
            .isPrimary(!hasAccounts) // first account is automatically primary
            .build();

        return bankAccountRepository.save(account);
    }

    @Transactional
    public BankAccount setPrimary(Long userId, Long accountId) {
        BankAccount account = bankAccountRepository.findByIdAndUserId(accountId, userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bank account not found"));

        bankAccountRepository.clearPrimaryForUser(userId);
        account.setPrimary(true);
        return bankAccountRepository.save(account);
    }

    @Transactional
    @SuppressWarnings("null")
    public void deleteAccount(Long userId, Long accountId) {
        BankAccount account = bankAccountRepository.findByIdAndUserId(accountId, userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bank account not found"));

        bankAccountRepository.delete(account);

        // If the deleted account was primary, promote the most recently created remaining one
        if (account.isPrimary()) {
            bankAccountRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().findFirst().ifPresent(next -> {
                    next.setPrimary(true);
                    bankAccountRepository.save(next);
                });
        }
    }
}
