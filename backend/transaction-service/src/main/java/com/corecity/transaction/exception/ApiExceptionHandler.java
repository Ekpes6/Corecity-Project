// ─────────────────────────────────────────────────────────────────────────────
// FILE 2 of 2
// Place at:
//   backend/transaction-service/src/main/java/com/corecity/transaction/exception/ApiExceptionHandler.java
// ─────────────────────────────────────────────────────────────────────────────
package com.corecity.transaction.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
@Slf4j
public class ApiExceptionHandler {

    /** Bean validation failures (@Valid on request bodies) */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(
            MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
            .collect(Collectors.toMap(
                FieldError::getField,
                fe -> fe.getDefaultMessage() == null ? "invalid" : fe.getDefaultMessage(),
                (a, b) -> a));
        return ResponseEntity.badRequest()
            .body(Map.of("message", "Validation failed", "errors", fieldErrors));
    }

    /** Known domain errors — map to meaningful HTTP codes */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntime(RuntimeException ex) {
        String msg = ex.getMessage() == null ? "An error occurred" : ex.getMessage();

        HttpStatus status = switch (msg) {
            case "Unauthorized"              -> HttpStatus.FORBIDDEN;
            case "Payment initialization failed",
                 "Payment verification failed" -> HttpStatus.BAD_GATEWAY;
            default -> {
                if (msg.startsWith("Transaction not found")) yield HttpStatus.NOT_FOUND;
                log.error("Unhandled transaction-service exception: {}", msg, ex);
                yield HttpStatus.INTERNAL_SERVER_ERROR;
            }
        };

        String responseMsg = status == HttpStatus.INTERNAL_SERVER_ERROR
            ? "An unexpected error occurred"
            : msg;

        return ResponseEntity.status(status).body(Map.of("message", responseMsg));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleResponseStatus(ResponseStatusException ex) {
        HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());
        String msg = ex.getReason() != null ? ex.getReason() : status.getReasonPhrase();
        return ResponseEntity.status(status).body(Map.of("message", msg));
    }
}