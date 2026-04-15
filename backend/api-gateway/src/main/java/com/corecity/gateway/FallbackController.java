package com.corecity.gateway;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.util.Map;

/**
 * Returns a structured 503 response when a circuit breaker fallback is triggered.
 * The gateway routes each service's CircuitBreaker filter to forward:/fallback.
 */
@RestController
public class FallbackController {

    @RequestMapping("/fallback")
    public Mono<ResponseEntity<Map<String, String>>> fallback() {
        return Mono.just(ResponseEntity
                .status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of(
                    "error",   "service_unavailable",
                    "message", "The requested service is temporarily unavailable. Please try again shortly."
                )));
    }
}
