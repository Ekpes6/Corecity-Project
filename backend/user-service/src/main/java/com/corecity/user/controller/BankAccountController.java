package com.corecity.user.controller;

import com.corecity.user.entity.BankAccount;
import com.corecity.user.service.BankAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/users/me/bank-accounts")
@RequiredArgsConstructor
public class BankAccountController {

    private final BankAccountService bankAccountService;

    @GetMapping
    public ResponseEntity<List<BankAccount>> getAccounts(
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(bankAccountService.getAccounts(userId));
    }

    @PostMapping
    public ResponseEntity<BankAccount> addAccount(
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody Map<String, String> body) {
        String bankName = body.get("bankName");
        String accountNumber = body.get("accountNumber");
        String accountName = body.get("accountName");

        if (bankName == null || bankName.isBlank()
                || accountNumber == null || accountNumber.isBlank()
                || accountName == null || accountName.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        if (!accountNumber.matches("\\d{10}")) {
            return ResponseEntity.badRequest().build();
        }

        BankAccount created = bankAccountService.addAccount(userId, bankName, accountNumber, accountName);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/{id}/primary")
    public ResponseEntity<BankAccount> setPrimary(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id) {
        return ResponseEntity.ok(bankAccountService.setPrimary(userId, id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAccount(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id) {
        bankAccountService.deleteAccount(userId, id);
        return ResponseEntity.noContent().build();
    }
}
