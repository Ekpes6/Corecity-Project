package com.corecity.property.service;

import com.corecity.property.dto.PropertyDTOs.*;
import com.corecity.property.entity.Property;
import com.corecity.property.entity.Reservation;
import com.corecity.property.repository.PropertyRepository;
import com.corecity.property.repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final PropertyRepository propertyRepository;
    private final ReservationPaystackClient paystackClient;
    private final RabbitTemplate rabbitTemplate;

    @Value("${reservation.fee:1000}")
    private BigDecimal reservationFee;

    @Value("${reservation.negotiation-days:5}")
    private int negotiationDays;

    /**
     * Initiate a reservation for an ACTIVE property.
     *
     * @param propertyId  the target property
     * @param customerId  JWT-authenticated customer ID
     * @param buyerEmail  email used to generate the Paystack link
     */
    @Transactional
    public ReservationInitResponse initiateReservation(Long propertyId, Long customerId, String buyerEmail) {
        Objects.requireNonNull(propertyId, "propertyId must not be null");
        Objects.requireNonNull(customerId, "customerId must not be null");

        Property property = propertyRepository.findById(propertyId)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Property not found"));

        if (property.getStatus() != Property.PropertyStatus.ACTIVE) {
            throw new ResponseStatusException(BAD_REQUEST,
                "Property is not available for reservation (status: " + property.getStatus() + ")");
        }

        // Prevent duplicate active/pending-payment reservations by the same customer
        boolean alreadyReserved = reservationRepository.existsByPropertyIdAndCustomerIdAndStatusIn(
            propertyId, customerId,
            List.of(Reservation.ReservationStatus.PENDING_PAYMENT, Reservation.ReservationStatus.ACTIVE)
        );
        if (alreadyReserved) {
            throw new ResponseStatusException(CONFLICT, "You already have an active reservation on this property");
        }

        // Only one customer can hold an ACTIVE reservation at a time
        boolean propertyAlreadyOnNegotiation = reservationRepository
            .findByPropertyIdAndStatus(propertyId, Reservation.ReservationStatus.ACTIVE)
            .isPresent();
        if (propertyAlreadyOnNegotiation) {
            throw new ResponseStatusException(CONFLICT,
                "This property already has an active reservation");
        }

        String reference = "RSV-" + UUID.randomUUID().toString().replace("-", "").toUpperCase();

        Map<String, Object> meta = Map.of(
            "propertyId", propertyId,
            "customerId", customerId,
            "type", "RESERVATION_FEE"
        );

        ReservationPaystackClient.InitResult initResult =
            paystackClient.initializeReservation(buyerEmail, reservationFee, reference, meta);

        Reservation reservation = Reservation.builder()
            .propertyId(propertyId)
            .customerId(customerId)
            .paymentReference(reference)
            .authorizationUrl(initResult.authorizationUrl())
            .status(Reservation.ReservationStatus.PENDING_PAYMENT)
            .build();
        reservationRepository.save(Objects.requireNonNull(reservation));

        log.info("Reservation initiated for property {} by customer {}, ref={}", propertyId, customerId, reference);

        return ReservationInitResponse.builder()
            .reservationId(reservation.getId())
            .propertyId(propertyId)
            .paymentReference(reference)
            .authorizationUrl(initResult.authorizationUrl())
            .reservationFee(reservationFee)
            .status(reservation.getStatus().name())
            .build();
    }

    /**
     * Called from the Paystack webhook handler when a RESERVATION_FEE payment succeeds.
     * Activates the reservation and transitions the property to ON_NEGOTIATION.
     */
    @Transactional
    public void activateReservation(String reference) {
        Reservation reservation = reservationRepository.findByPaymentReference(reference)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Reservation not found for reference: " + reference));

        if (reservation.getStatus() != Reservation.ReservationStatus.PENDING_PAYMENT) {
            log.warn("Reservation {} already in status {}; skipping activation", reference, reservation.getStatus());
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        reservation.setStatus(Reservation.ReservationStatus.ACTIVE);
        reservation.setPaidAt(now);
        reservation.setExpiresAt(now.plusDays(negotiationDays));
        reservationRepository.save(reservation);

        // Move property to ON_NEGOTIATION
        propertyRepository.findById(Objects.requireNonNull(reservation.getPropertyId())).ifPresent(p -> {
            p.setStatus(Property.PropertyStatus.ON_NEGOTIATION);
            propertyRepository.save(p);
        });

        // Publish event so notification-service can email the customer with full property details
        try {
            rabbitTemplate.convertAndSend("corecity.exchange", "notification.reservation_activated",
                Map.of(
                    "reservationId", reservation.getId(),
                    "propertyId", reservation.getPropertyId(),
                    "customerId", reservation.getCustomerId(),
                    "expiresAt", reservation.getExpiresAt().toString()
                ));
        } catch (Exception e) {
            log.warn("Could not publish reservation activation notification", e);
        }

        log.info("Reservation {} activated – property {} is now ON_NEGOTIATION until {}",
            reference, reservation.getPropertyId(), reservation.getExpiresAt());
    }

    /** Get all reservations made by the currently authenticated customer. */
    @Transactional(readOnly = true)
    public List<ReservationResponse> getMyReservations(Long customerId) {
        return reservationRepository.findByCustomerIdOrderByCreatedAtDesc(customerId)
            .stream().map(this::toResponse).toList();
    }

    /** Get the active reservation for a property (for admin / owner to view). */
    @Transactional(readOnly = true)
    public ReservationResponse getActiveReservation(Long propertyId, Long requesterId, String role) {
        boolean isAdmin = "ADMIN".equalsIgnoreCase(role);
        Property property = propertyRepository.findById(Objects.requireNonNull(propertyId))
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Property not found"));

        if (!isAdmin && !property.getOwnerId().equals(requesterId)) {
            throw new ResponseStatusException(FORBIDDEN, "Access denied");
        }

        return reservationRepository.findByPropertyIdAndStatus(propertyId, Reservation.ReservationStatus.ACTIVE)
            .map(this::toResponse)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "No active reservation for this property"));
    }

    /**
     * Returns true if the given user holds an ACTIVE reservation on the property.
     * Used by PropertyService to decide whether to mask address/agentId.
     */
    public boolean hasActiveReservation(Long propertyId, Long userId) {
        if (userId == null) return false;
        return reservationRepository.existsByPropertyIdAndCustomerIdAndStatusIn(
            propertyId, userId, List.of(Reservation.ReservationStatus.ACTIVE));
    }

    /**
     * Scheduled task: expire ACTIVE reservations whose 5-day window has passed and
     * revert the property to ACTIVE status.  Runs every hour.
     */
    @Scheduled(fixedDelay = 3_600_000)
    @Transactional
    public void expireStaleReservations() {
        List<Reservation> expired = reservationRepository.findExpiredActive(LocalDateTime.now());
        if (expired.isEmpty()) return;

        log.info("Expiring {} stale reservation(s)", expired.size());
        for (Reservation r : expired) {
            r.setStatus(Reservation.ReservationStatus.EXPIRED);
            reservationRepository.save(r);

            propertyRepository.findById(Objects.requireNonNull(r.getPropertyId())).ifPresent(p -> {
                if (p.getStatus() == Property.PropertyStatus.ON_NEGOTIATION) {
                    p.setStatus(Property.PropertyStatus.ACTIVE);
                    propertyRepository.save(p);
                }
            });

            try {
                rabbitTemplate.convertAndSend("corecity.exchange", "notification.reservation_expired",
                    Map.of(
                        "reservationId", r.getId(),
                        "propertyId", r.getPropertyId(),
                        "customerId", r.getCustomerId()
                    ));
            } catch (Exception e) {
                log.warn("Could not publish reservation expiry notification for reservation {}", r.getId());
            }
        }
    }

    private ReservationResponse toResponse(Reservation r) {
        return ReservationResponse.builder()
            .id(r.getId())
            .propertyId(r.getPropertyId())
            .customerId(r.getCustomerId())
            .paymentReference(r.getPaymentReference())
            .status(r.getStatus().name())
            .paidAt(r.getPaidAt())
            .expiresAt(r.getExpiresAt())
            .createdAt(r.getCreatedAt())
            .build();
    }
}
