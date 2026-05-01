package com.corecity.property.service;

import com.corecity.property.dto.PropertyDTOs.*;
import com.corecity.property.entity.Property;
import com.corecity.property.entity.PropertyLifecycle;
import com.corecity.property.entity.Reservation;
import com.corecity.property.repository.PropertyLifecycleRepository;
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
import java.util.Optional;

import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final PropertyRepository propertyRepository;
    private final PropertyLifecycleRepository lifecycleRepository;
    private final ReservationPaystackClient paystackClient;
    private final RabbitTemplate rabbitTemplate;
    private final UserServiceClient userServiceClient;

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

        // Block if this customer already has a confirmed (ACTIVE) reservation on this property
        boolean alreadyActive = reservationRepository.existsByPropertyIdAndCustomerIdAndStatusIn(
            propertyId, customerId, List.of(Reservation.ReservationStatus.ACTIVE)
        );
        if (alreadyActive) {
            throw new ResponseStatusException(CONFLICT, "You already have an active reservation on this property");
        }

        // If a previous PENDING_PAYMENT exists (i.e. a failed/abandoned attempt), cancel it so the
        // user can retry without being permanently blocked.
        reservationRepository.findByPropertyIdAndCustomerIdAndStatus(
                propertyId, customerId, Reservation.ReservationStatus.PENDING_PAYMENT)
            .ifPresent(old -> {
                old.setStatus(Reservation.ReservationStatus.EXPIRED);
                reservationRepository.save(old);
                log.info("Cancelled stale PENDING_PAYMENT reservation {} to allow retry", old.getId());
            });

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

    /** Admin-only: all reservations across all customers. */
    @Transactional(readOnly = true)
    public List<ReservationResponse> getAllReservations() {
        return reservationRepository.findAllByOrderByCreatedAtDesc()
            .stream().map(this::toEnrichedResponse).toList();
    }

    /** Get all reservations made by the currently authenticated customer, enriched with property snapshot + owner contact. */
    @Transactional(readOnly = true)
    public List<ReservationResponse> getMyReservations(Long customerId) {
        return reservationRepository.findByCustomerIdOrderByCreatedAtDesc(customerId)
            .stream().map(this::toEnrichedResponse).toList();
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
     * Retrieve a reservation by its Paystack reference.  Only the owner of the reservation
     * may call this — used by the payment verification page to determine the outcome.
     */
    @Transactional(readOnly = true)
    public ReservationResponse getByReference(String reference, Long requesterId) {
        Reservation r = reservationRepository.findByPaymentReference(reference)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Reservation not found"));
        if (!r.getCustomerId().equals(requesterId)) {
            throw new ResponseStatusException(FORBIDDEN, "Access denied");
        }
        return toResponse(r);
    }

    /**
     * Scheduled task: expire PENDING_PAYMENT reservations older than 1 hour (abandoned payments).
     * Runs every hour so they never permanently block a property for other users.
     */
    @Scheduled(fixedDelay = 3_600_000)
    @Transactional
    public void expireStalePendingPayments() {
        LocalDateTime cutoff = LocalDateTime.now().minusHours(1);
        List<Reservation> stale = reservationRepository.findStalePendingPayment(cutoff);
        if (stale.isEmpty()) return;
        log.info("Expiring {} stale PENDING_PAYMENT reservation(s)", stale.size());
        for (Reservation r : stale) {
            r.setStatus(Reservation.ReservationStatus.EXPIRED);
            reservationRepository.save(r);
        }
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

    /**
     * Frontend-triggered server-side Paystack verify.
     *
     * Eliminates the race condition between Paystack's asynchronous webhook delivery
     * and the browser redirect: instead of trusting the DB state on the verify page
     * (which may still be PENDING_PAYMENT if the webhook hasn't fired yet), the
     * frontend calls this endpoint which talks to Paystack directly and activates
     * the reservation if payment is confirmed.
     *
     * Safe to call many times — idempotent: if the reservation is already ACTIVE
     * (webhook beat the frontend), it returns immediately.
     */
    @Transactional
    public ReservationResponse verifyAndActivate(String reference, Long requesterId) {
        Objects.requireNonNull(reference, "reference must not be null");
        Reservation r = reservationRepository.findByPaymentReference(reference)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Reservation not found"));
        if (!r.getCustomerId().equals(requesterId))
            throw new ResponseStatusException(FORBIDDEN, "Access denied");

        // Webhook already processed it — nothing to do
        if (r.getStatus() == Reservation.ReservationStatus.ACTIVE) {
            log.debug("verifyAndActivate: reservation {} already ACTIVE, returning immediately", reference);
            return toResponse(r);
        }

        // EXPIRED / COMPLETED — not verifiable
        if (r.getStatus() != Reservation.ReservationStatus.PENDING_PAYMENT) {
            log.debug("verifyAndActivate: reservation {} is {}, not verifiable", reference, r.getStatus());
            return toResponse(r);
        }

        // Actively call Paystack — resolves the webhook-vs-redirect race
        ReservationPaystackClient.VerifyResult result = paystackClient.verifyReservation(reference);
        if (result.success()) {
            log.info("verifyAndActivate: Paystack confirmed payment for {} — activating (PENDING_PAYMENT → ACTIVE)", reference);
            LocalDateTime now = LocalDateTime.now();
            r.setStatus(Reservation.ReservationStatus.ACTIVE);
            r.setPaidAt(now);
            r.setExpiresAt(now.plusDays(negotiationDays));
            reservationRepository.save(r);

            propertyRepository.findById(Objects.requireNonNull(r.getPropertyId())).ifPresent(p -> {
                p.setStatus(Property.PropertyStatus.ON_NEGOTIATION);
                propertyRepository.save(p);
            });

            try {
                rabbitTemplate.convertAndSend("corecity.exchange", "notification.reservation_activated",
                    Map.of(
                        "reservationId", r.getId(),
                        "propertyId",    r.getPropertyId(),
                        "customerId",    r.getCustomerId(),
                        "expiresAt",     r.getExpiresAt().toString()
                    ));
            } catch (Exception e) {
                log.warn("Could not publish reservation activation notification", e);
            }
        } else {
            log.info("verifyAndActivate: Paystack returned status='{}' for {} — payment not confirmed", result.status(), reference);
        }

        return toResponse(r);
    }

    /**
     * Called by the internal endpoint when transaction-service confirms a PURCHASE or RENT
     * payment succeeded.  Marks the reservation COMPLETED, updates property status, and
     * creates a PropertyLifecycle record so the frontend can show the occupancy countdown.
     */
    @Transactional
    public void completeReservation(Long propertyId, Long buyerId, String transactionType, Integer leaseDays) {
        Objects.requireNonNull(propertyId, "propertyId must not be null");
        Objects.requireNonNull(buyerId, "buyerId must not be null");
        Objects.requireNonNull(transactionType, "transactionType must not be null");

        // 1. Mark the ACTIVE reservation as COMPLETED
        reservationRepository.findByPropertyIdAndStatus(propertyId, Reservation.ReservationStatus.ACTIVE)
            .filter(r -> r.getCustomerId().equals(buyerId))
            .ifPresent(r -> {
                r.setStatus(Reservation.ReservationStatus.COMPLETED);
                reservationRepository.save(r);
                log.info("Reservation {} marked COMPLETED (property={} buyer={})", r.getId(), propertyId, buyerId);
            });

        // 2. Determine new property status and lifecycle type from the property's listing type
        Property property = propertyRepository.findById(propertyId).orElse(null);
        if (property == null) {
            log.warn("completeReservation: property {} not found — skipping status update", propertyId);
            return;
        }

        Property.PropertyStatus newStatus;
        String lifecycleType;
        if ("PURCHASE".equalsIgnoreCase(transactionType)) {
            newStatus = Property.PropertyStatus.SOLD;
            lifecycleType = "PURCHASE";
        } else {
            // RENT transaction — actual lifecycle type depends on the listing type
            if (property.getListingType() == Property.ListingType.SHORT_LET) {
                newStatus = Property.PropertyStatus.SHORTLET;
                lifecycleType = "SHORTLET";
            } else {
                newStatus = Property.PropertyStatus.RENTED;
                lifecycleType = "RENT";
            }
        }

        property.setStatus(newStatus);
        propertyRepository.save(property);
        log.info("Property {} status → {}", propertyId, newStatus);

        // 3. Create lifecycle record with appropriate end time
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime endTime = null;
        if ("SHORTLET".equals(lifecycleType)) {
            endTime = now.plusHours(24);
        } else if ("RENT".equals(lifecycleType)) {
            int days = (leaseDays != null && leaseDays > 0) ? leaseDays : 365;
            endTime = now.plusDays(days);
        }
        // PURCHASE: endTime remains null (permanent — no automatic reversion)

        PropertyLifecycle lifecycle = PropertyLifecycle.builder()
            .propertyId(propertyId)
            .userId(buyerId)
            .type(lifecycleType)
            .startTime(now)
            .endTime(endTime)
            .status("ACTIVE")
            .build();
        lifecycleRepository.save(lifecycle);
        log.info("PropertyLifecycle created: type={} property={} endTime={}", lifecycleType, propertyId, endTime);

        // 4. Publish notification event (best-effort)
        try {
            rabbitTemplate.convertAndSend("corecity.exchange", "notification.reservation_completed",
                Map.of("propertyId", propertyId, "buyerId", buyerId, "type", lifecycleType));
        } catch (Exception e) {
            log.warn("Could not publish reservation_completed notification", e);
        }
    }

    /**
     * Scheduled task: expire ACTIVE lifecycle records whose end_time has passed.
     * Reverts RENTED / SHORTLET properties back to ACTIVE so new reservations can be made.
     * Runs every hour, same cadence as the other scheduled tasks.
     */
    @Scheduled(fixedDelay = 3_600_000)
    @Transactional
    public void expireLifecycles() {
        List<PropertyLifecycle> expired = lifecycleRepository.findExpiredActive(LocalDateTime.now());
        if (expired.isEmpty()) return;

        log.info("Expiring {} property lifecycle(s)", expired.size());
        for (PropertyLifecycle lc : expired) {
            lc.setStatus("EXPIRED");
            lifecycleRepository.save(lc);

            // Revert RENTED / SHORTLET → ACTIVE so the property can be reserved again
            propertyRepository.findById(lc.getPropertyId()).ifPresent(p -> {
                if (p.getStatus() == Property.PropertyStatus.RENTED
                        || p.getStatus() == Property.PropertyStatus.SHORTLET) {
                    p.setStatus(Property.PropertyStatus.ACTIVE);
                    propertyRepository.save(p);
                    log.info("Property {} reverted to ACTIVE after lifecycle expiry", p.getId());
                }
            });

            try {
                rabbitTemplate.convertAndSend("corecity.exchange", "notification.lifecycle_expired",
                    Map.of("propertyId", lc.getPropertyId(), "userId", lc.getUserId(), "type", lc.getType()));
            } catch (Exception e) {
                log.warn("Could not publish lifecycle_expired notification for lifecycle {}", lc.getId());
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

    /**
     * Builds a ReservationResponse enriched with property snapshot + owner contact.
     * Used only by getMyReservations (dashboard view). Gracefully degrades if
     * the property or user-service lookup fails.
     */
    private ReservationResponse toEnrichedResponse(Reservation r) {
        ReservationResponse.ReservationResponseBuilder builder = ReservationResponse.builder()
            .id(r.getId())
            .propertyId(r.getPropertyId())
            .customerId(r.getCustomerId())
            .paymentReference(r.getPaymentReference())
            .status(r.getStatus().name())
            .paidAt(r.getPaidAt())
            .expiresAt(r.getExpiresAt())
            .createdAt(r.getCreatedAt());

        propertyRepository.findById(Objects.requireNonNull(r.getPropertyId())).ifPresent(p -> {
            builder.propertyTitle(p.getTitle());
            builder.propertyPrice(p.getPrice());
            builder.propertyListingType(p.getListingType().name());
            builder.propertyStatus(p.getStatus().name());
            // Reservation holder always gets the full address
            builder.propertyAddress(p.getAddress());

            // Location — always shared with the reservation holder
            builder.latitude(p.getLatitude());
            builder.longitude(p.getLongitude());

            // Derive primary image URL from the property's file collection
            List<com.corecity.property.entity.PropertyFile> files =
                Optional.ofNullable(p.getFiles()).orElseGet(List::of);
            String primaryImg = files.stream()
                .filter(f -> Boolean.TRUE.equals(f.getPrimary()))
                .map(f -> f.getFileUrl())
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(files.isEmpty() ? null : files.get(0).getFileUrl());
            builder.primaryImageUrl(primaryImg);

            // Owner contact — only expose for confirmed (ACTIVE) reservations
            if (r.getStatus() == Reservation.ReservationStatus.ACTIVE) {
                UserServiceClient.UserProfile profile = userServiceClient.getUserProfile(p.getOwnerId());
                if (profile != null) {
                    builder.ownerName(profile.fullName());
                    builder.ownerPhone(profile.getPhone());
                }
            }
        });

        // Lifecycle info — only for COMPLETED reservations
        if (r.getStatus() == Reservation.ReservationStatus.COMPLETED) {
            lifecycleRepository
                .findTopByPropertyIdAndUserIdOrderByCreatedAtDesc(r.getPropertyId(), r.getCustomerId())
                .ifPresent(lc -> builder.lifecycle(LifecycleInfo.builder()
                    .type(lc.getType())
                    .startTime(lc.getStartTime())
                    .endTime(lc.getEndTime())
                    .status(lc.getStatus())
                    .build()));
        }

        return builder.build();
    }
}
