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
        /** Optional: rental duration in days. Only relevant for RENT type transactions. */
        private Integer leaseDays;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class InitTransactionResponse {
        private Long transactionId;
        private String reference;
        private BigDecimal amount;
        private BigDecimal serviceFee;
        private BigDecimal totalAmount;
        private String authorizationUrl;

        public String getAuthorizationUrl() {
            return authorizationUrl;
        }
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

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CommissionResponse {
        private Long id;
        private Long transactionId;
        private Long propertyId;
        private Long agentId;
        private BigDecimal propertyValue;
        private BigDecimal corecityCommission;
        private BigDecimal agentCommission;
        private BigDecimal totalCommission;
        private BigDecimal overallCost;
        private String status;
        /** 'AGENT' → 7%+3% model. 'SELLER' → 5%+5% model. */
        private String sellerRole;
        private LocalDateTime createdAt;
    }

    /**
     * Admin view of a single seller disbursement — one per completed PURCHASE / RENT
     * transaction.  Contains everything admin needs to make the bank transfer and
     * then mark the record as paid.
     */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class DisbursementResponse {
        private Long commissionId;
        private Long transactionId;
        private String transactionReference;
        private String transactionType;
        private Long propertyId;
        private String propertyTitle;
        private Long sellerId;
        /** Net property value (90% of buyer payment) — the amount owed to the seller. */
        private BigDecimal propertyValue;
        private String ownerName;
        private String ownerBankName;
        private String ownerAccountNumber;
        private String ownerAccountName;
        private boolean sellerPaid;
        private LocalDateTime sellerPaidAt;
        private String sellerNote;
        /** 'AGENT' → 7%+3% model. 'SELLER' → 5%+5% model. */
        private String sellerRole;
        private LocalDateTime createdAt;
    }
}
