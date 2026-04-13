// ─────────────────────────────────────────────────────────────────────────────
// FILE 1 of 2
// Place at:
//   backend/user-service/src/main/java/com/corecity/user/exception/ApiExceptionHandler.java
// ─────────────────────────────────────────────────────────────────────────────
package com.corecity.user.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
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

    /** Bean validation failures (@Valid) — 400 with field-level detail */
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

    /** Known domain errors surfaced as RuntimeException — map to meaningful HTTP codes */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntime(RuntimeException ex) {
        String msg = ex.getMessage() == null ? "An error occurred" : ex.getMessage();

        HttpStatus status = switch (msg) {
            case "Invalid credentials"           -> HttpStatus.UNAUTHORIZED;
            case "Email already registered",
                 "Phone number already registered" -> HttpStatus.CONFLICT;
            case "User not found"                -> HttpStatus.NOT_FOUND;
            default -> {
                // Only log unexpected errors — expected ones are just business logic
                log.error("Unhandled user-service exception: {}", msg);
                yield HttpStatus.INTERNAL_SERVER_ERROR;
            }
        };

        // Never expose the raw exception message for 500s — generic message only
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

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(Map.of("message", "Access denied"));
    }
}