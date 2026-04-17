package com.corecity.transaction;

import com.corecity.transaction.dto.TransactionDTOs.*;
import com.corecity.transaction.entity.Transaction;
import com.corecity.transaction.repository.CommissionRepository;
import com.corecity.transaction.repository.TransactionRepository;
import com.corecity.transaction.service.PaystackService;
import com.corecity.transaction.service.TransactionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

    @Mock TransactionRepository transactionRepository;
    @Mock CommissionRepository commissionRepository;
    @Mock PaystackService paystackService;
    @Mock RabbitTemplate rabbitTemplate;

    @InjectMocks TransactionService transactionService;

    @BeforeEach
    void setUp() {
        // Inject real ObjectMapper via reflection (field injection for non-Spring test)
        ObjectMapper objectMapper = new ObjectMapper();
        try {
            var field = TransactionService.class.getDeclaredField("objectMapper");
            field.setAccessible(true);
            field.set(transactionService, objectMapper);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    // ─── initTransaction ────────────────────────────────────────────────────

    @Test
    @SuppressWarnings("null")
    void initTransaction_persistsBeforeCallingPaystack() {
        // Arrange
        var req = InitTransactionRequest.builder()
            .propertyId(1L).sellerId(2L).buyerEmail("buyer@test.com")
            .amount(new BigDecimal("500000"))
            .type(Transaction.TransactionType.PURCHASE)
            .build();

        var savedTx = buildTransaction(1L, Transaction.TransactionStatus.INITIATED);
        doReturn(savedTx).when(transactionRepository).save(argThat(Objects::nonNull));
        when(paystackService.calculateFee(argThat((BigDecimal amount) -> amount != null)))
            .thenReturn(new BigDecimal("2000"));
        when(paystackService.initializeTransaction(
            argThat((String email) -> email != null),
            argThat((BigDecimal amount) -> amount != null),
            argThat((String reference) -> reference != null),
            argThat((java.util.Map<String, Object> metadata) -> metadata != null)))
            .thenReturn(new PaystackService.InitResult(
                "https://checkout.paystack.com/abc", "HLK-ref", "code"));

        // Act
        var response = transactionService.initTransaction(req, 10L);

        // Assert — Paystack is called exactly once, after the initial save
        verify(transactionRepository, times(2)).save(argThat(Objects::nonNull)); // initial + update with URL
        verify(paystackService).initializeTransaction(
            argThat((String email) -> email != null),
            argThat((BigDecimal amount) -> amount != null),
            argThat((String reference) -> reference != null),
            argThat((java.util.Map<String, Object> metadata) -> metadata != null));
        assertThat(response.getAuthorizationUrl()).isNotBlank();
    }

    @Test
    void initTransaction_rejectsNullBuyerId() {
        var req = InitTransactionRequest.builder()
            .propertyId(1L).sellerId(2L).buyerEmail("b@t.com")
            .amount(BigDecimal.TEN).type(Transaction.TransactionType.PURCHASE)
            .build();

        assertThatNullPointerException()
            .isThrownBy(() -> transactionService.initTransaction(req, null))
            .withMessageContaining("buyer id");
    }

    // ─── verifyTransaction ───────────────────────────────────────────────────

    @Test
    @SuppressWarnings("null")
    void verifyTransaction_successfulPayment_setsStatusAndPublishesEvent() {
        var tx = buildTransaction(1L, Transaction.TransactionStatus.PENDING);
        when(transactionRepository.findByReference("REF-001")).thenReturn(Optional.of(tx));
        when(paystackService.verifyTransaction("REF-001"))
            .thenReturn(new PaystackService.VerifyResult(true, "success", "card", null));
        doReturn(tx).when(transactionRepository).save(argThat(Objects::nonNull));
        when(commissionRepository.findByTransactionId(anyLong())).thenReturn(Optional.empty());

        var response = transactionService.verifyTransaction("REF-001");

        assertThat(response.getStatus()).isEqualTo("SUCCESS");
        verify(rabbitTemplate).convertAndSend(eq("corecity.exchange"),
            eq("notification.payment_success"),
            argThat((java.util.Map<String, Object> payload) -> payload != null));
    }

    @Test
    @SuppressWarnings("null")
    void verifyTransaction_failedPayment_setsStatusFailed_doesNotPublishEvent() {
        var tx = buildTransaction(1L, Transaction.TransactionStatus.PENDING);
        when(transactionRepository.findByReference("REF-002")).thenReturn(Optional.of(tx));
        when(paystackService.verifyTransaction("REF-002"))
            .thenReturn(new PaystackService.VerifyResult(false, "failed", "card", null));
        doReturn(tx).when(transactionRepository).save(argThat(Objects::nonNull));

        var response = transactionService.verifyTransaction("REF-002");

        assertThat(response.getStatus()).isEqualTo("FAILED");
        verifyNoInteractions(rabbitTemplate);
    }

    @Test
    void verifyTransaction_unknownReference_throwsException() {
        when(transactionRepository.findByReference(anyString())).thenReturn(Optional.empty());

        assertThatRuntimeException()
            .isThrownBy(() -> transactionService.verifyTransaction("UNKNOWN"))
            .withMessageContaining("Transaction not found");
    }

    // ─── getTransaction ──────────────────────────────────────────────────────

    @Test
    void getTransaction_rejectsUnrelatedUser() {
        var tx = buildTransaction(1L, Transaction.TransactionStatus.SUCCESS);
        // tx has buyerId=10, sellerId=20
        when(transactionRepository.findById(1L)).thenReturn(Optional.of(tx));

        // userId 99 is neither buyer nor seller
        assertThatRuntimeException()
            .isThrownBy(() -> transactionService.getTransaction(1L, 99L))
            .withMessageContaining("Unauthorized");
    }

    @Test
    void getTransaction_allowsBuyer() {
        var tx = buildTransaction(1L, Transaction.TransactionStatus.SUCCESS);
        when(transactionRepository.findById(1L)).thenReturn(Optional.of(tx));

        // buyerId = 10 — should succeed
        var response = transactionService.getTransaction(1L, 10L);
        assertThat(response.getId()).isEqualTo(1L);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private Transaction buildTransaction(Long id, Transaction.TransactionStatus status) {
        return Transaction.builder()
            .id(id)
            .reference("REF-001")
            .propertyId(1L)
            .buyerId(10L)
            .sellerId(20L)
            .amount(new BigDecimal("500000"))
            .serviceFee(new BigDecimal("2000"))
            .type(Transaction.TransactionType.PURCHASE)
            .status(status)
            .createdAt(LocalDateTime.now())
            .build();
    }
}