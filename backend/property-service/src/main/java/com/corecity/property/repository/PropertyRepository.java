package com.corecity.property.repository;

import com.corecity.property.entity.Property;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface PropertyRepository extends JpaRepository<Property, Long> {

    Page<Property> findByStatus(Property.PropertyStatus status, Pageable pageable);

    @Query("""
        SELECT p FROM Property p
        WHERE p.status = 'ACTIVE'
        AND (:listingType IS NULL OR p.listingType = :listingType)
        AND (:propertyType IS NULL OR p.propertyType = :propertyType)
        AND (:stateId IS NULL OR p.stateId = :stateId)
        AND (:lgaId IS NULL OR p.lgaId = :lgaId)
        AND (:minPrice IS NULL OR p.price >= :minPrice)
        AND (:maxPrice IS NULL OR p.price <= :maxPrice)
        AND (:bedrooms IS NULL OR p.bedrooms >= :bedrooms)
        AND (:keyword IS NULL OR LOWER(p.title) LIKE LOWER(CONCAT('%',:keyword,'%'))
             OR LOWER(p.address) LIKE LOWER(CONCAT('%',:keyword,'%')))
        """)
    Page<Property> search(
        @Param("listingType") Property.ListingType listingType,
        @Param("propertyType") Property.PropertyType propertyType,
        @Param("stateId") Integer stateId,
        @Param("lgaId") Integer lgaId,
        @Param("minPrice") BigDecimal minPrice,
        @Param("maxPrice") BigDecimal maxPrice,
        @Param("bedrooms") Integer bedrooms,
        @Param("keyword") String keyword,
        Pageable pageable
    );

    List<Property> findByOwnerIdOrderByCreatedAtDesc(Long ownerId);

    @Modifying
    @Query("UPDATE Property p SET p.viewsCount = p.viewsCount + 1 WHERE p.id = :id")
    void incrementViews(@Param("id") Long id);

    @Query("SELECT p FROM Property p WHERE p.status = 'ACTIVE' ORDER BY p.createdAt DESC")
    List<Property> findFeatured(Pageable pageable);
}
