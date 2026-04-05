package com.corecity.transaction.dto;

import com.corecity.transaction.entity.Transaction;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class TransactionDTOs {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class InitTransactionRequest {
        @NotNull private Long propertyId;
        @NotNull private Long sellerId;
        @NotBlank @Email private String buyerEmail;
        @NotNull @Positive private BigDecimal amount;
        @NotNull private Transaction.TransactionType type;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class InitTransactionResponse {
        private Long transactionId;
        private String reference;
        private String authorizationUrl;
        private BigDecimal amount;
        private BigDecimal serviceFee;
        private BigDecimal totalAmount;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TransactionResponse {
        private Long id;
        private String reference;
        private Long propertyId;
        private Long buyerId;
        private Long sellerId;
        private BigDecimal amount;
        private BigDecimal serviceFee;
        private BigDecimal totalAmount;
        private String type;
        private String status;
        private String paymentChannel;
        private String authorizationUrl;
        private LocalDateTime createdAt;
    }
}
