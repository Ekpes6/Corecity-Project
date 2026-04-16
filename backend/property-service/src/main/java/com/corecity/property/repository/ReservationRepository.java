package com.corecity.property.repository;

import com.corecity.property.entity.Reservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    Optional<Reservation> findByPaymentReference(String reference);

    List<Reservation> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    Optional<Reservation> findByPropertyIdAndStatus(Long propertyId, Reservation.ReservationStatus status);

    /** Find ACTIVE reservations whose 5-day window has passed – used by the expiry scheduler. */
    @Query("SELECT r FROM Reservation r WHERE r.status = 'ACTIVE' AND r.expiresAt <= :now")
    List<Reservation> findExpiredActive(@Param("now") LocalDateTime now);

    boolean existsByPropertyIdAndCustomerIdAndStatusIn(
            Long propertyId, Long customerId, List<Reservation.ReservationStatus> statuses);
}
