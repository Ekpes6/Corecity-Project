package com.corecity.property.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.corecity.property.dto.PropertyDTOs.*;
import com.corecity.property.entity.Property;
import com.corecity.property.entity.PropertyFile;
import com.corecity.property.repository.PropertyFileRepository;
import com.corecity.property.repository.PropertyRepository;
import com.corecity.property.repository.ReservationRepository;
import com.corecity.property.entity.Reservation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
@Slf4j
public class PropertyService {

    private final PropertyRepository propertyRepository;
    private final PropertyFileRepository propertyFileRepository;
    private final LocationService locationService;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;
    private final ReservationRepository reservationRepository;
    private final UserServiceClient userServiceClient;

    @Transactional
    public PropertyResponse createProperty(CreatePropertyRequest req, Long ownerId, String userRole) {
        Long safeOwnerId = Objects.requireNonNull(ownerId, "owner id must not be null");
        log.info("Creating property for owner {} (role: {}) with title '{}'", safeOwnerId, userRole, req.getTitle());

        // ── BUYER role is not allowed to list properties ──────────────────────
        if ("BUYER".equalsIgnoreCase(userRole)) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.FORBIDDEN,
                "Buyers cannot list properties. Upgrade to SELLER or AGENT to list.");
        }

        // ── Subscription/loan gate for AGENT and SELLER ───────────────────────
        if ("AGENT".equalsIgnoreCase(userRole) || "SELLER".equalsIgnoreCase(userRole)) {
            if (!userServiceClient.hasActiveProduct(safeOwnerId)) {
                throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "You must have an active subscription or loan to list a property");
            }
        }

        locationService.validateLocation(req.getStateId(), req.getLgaId());
        String amenitiesJson = null;
        if (req.getAmenities() != null) {
            try { amenitiesJson = objectMapper.writeValueAsString(req.getAmenities()); }
            catch (Exception e) { log.warn("Could not serialize amenities"); }
        }

        Property property = Property.builder()
            .title(req.getTitle())
            .description(req.getDescription())
            .propertyType(req.getPropertyType())
            .listingType(req.getListingType())
            .price(req.getPrice())
            .pricePeriod(req.getPricePeriod() != null ? req.getPricePeriod() : Property.PricePeriod.OUTRIGHT)
            .bedrooms(req.getBedrooms())
            .bathrooms(req.getBathrooms())
            .toilets(req.getToilets())
            .sizeSqm(req.getSizeSqm())
            .address(req.getAddress())
            .stateId(req.getStateId())
            .lgaId(req.getLgaId())
            .latitude(req.getLatitude())
            .longitude(req.getLongitude())
            .ownerId(safeOwnerId)
            .negotiable(req.getNegotiable())
            .amenities(amenitiesJson)
            .status(Property.PropertyStatus.PENDING)
            .build();

        var savedProperty = propertyRepository.save(
            Objects.requireNonNull(property, "property must not be null"));
        log.info("Property {} saved with status {}", savedProperty.getId(), savedProperty.getStatus());

        // Keep listing creation responsive even if RabbitMQ is slow or temporarily unavailable.
        CompletableFuture.runAsync(() -> {
            try {
                rabbitTemplate.convertAndSend("corecity.exchange", "notification.new_listing",
                    Map.of("propertyId", savedProperty.getId(), "ownerId", safeOwnerId, "title", savedProperty.getTitle()));
                log.info("Published new listing notification for property {}", savedProperty.getId());
            } catch (Exception exception) {
                log.warn("Could not publish new listing notification for property {}", savedProperty.getId(), exception);
            }
        });

        var response = toResponse(savedProperty);
        log.info("Returning property create response for property {}", savedProperty.getId());
        return response;
    }

    @Transactional(readOnly = true)
    public Page<PropertyResponse> searchProperties(PropertySearchRequest req) {
        Pageable pageable = buildPageable(req);
        Page<Property> properties = propertyRepository.search(
            req.getListingType(),
            req.getPropertyType(),
            req.getStateId(),
            req.getLgaId(),
            req.getMinPrice(),
            req.getMaxPrice(),
            req.getBedrooms(),
            req.getKeyword(),
            pageable
        );

        return properties.map(this::toResponse);
    }

    @Transactional
    public PropertyResponse getProperty(Long id) {
        return getProperty(id, null, null);
    }

    @Transactional
    public PropertyResponse getProperty(Long id, Long requesterId, String requesterRole) {
        Long safeId = Objects.requireNonNull(id, "property id must not be null");
        Property property = propertyRepository.findById(safeId)
            .orElseThrow(() -> new RuntimeException("Property not found"));
        propertyRepository.incrementViews(safeId);
        property.setViewsCount(property.getViewsCount() + 1);
        return toResponse(property, requesterId, requesterRole);
    }

    @Transactional(readOnly = true)
    public List<PropertyResponse> getMyProperties(Long ownerId) {
        Long safeOwnerId = Objects.requireNonNull(ownerId, "owner id must not be null");
        return propertyRepository.findByOwnerIdOrderByCreatedAtDesc(safeOwnerId)
            .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PropertyResponse> getPendingProperties(String userRole) {
        requireAdmin(userRole);
        return propertyRepository
            .findByStatusOrderByCreatedAtDesc(Property.PropertyStatus.PENDING, PageRequest.of(0, 100))
            .stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PropertyResponse> getRejectedProperties(String userRole) {
        requireAdmin(userRole);
        return propertyRepository
            .findByStatusOrderByCreatedAtDesc(Property.PropertyStatus.REJECTED, PageRequest.of(0, 100))
            .stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    @Transactional
    public PropertyResponse approveProperty(Long id, String userRole) {
        requireAdmin(userRole);
        Long safeId = Objects.requireNonNull(id, "property id must not be null");
        Property property = propertyRepository.findById(safeId)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Property not found"));

        property.setStatus(Property.PropertyStatus.ACTIVE);
        Property savedProperty = propertyRepository.save(property);

        CompletableFuture.runAsync(() -> {
            try {
                rabbitTemplate.convertAndSend("corecity.exchange", "notification.listing_approved",
                    Map.of("propertyId", savedProperty.getId(), "ownerId", savedProperty.getOwnerId(), "title", savedProperty.getTitle()));
                log.info("Published approval notification for property {}", savedProperty.getId());
            } catch (Exception exception) {
                log.warn("Could not publish approval notification for property {}", savedProperty.getId(), exception);
            }
        });

        return toResponse(savedProperty);
    }

    @Transactional
    public PropertyResponse rejectProperty(Long id, String userRole, String reason) {
        requireAdmin(userRole);
        Long safeId = Objects.requireNonNull(id, "property id must not be null");
        Property property = propertyRepository.findById(safeId)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Property not found"));

        property.setStatus(Property.PropertyStatus.REJECTED);
        Property savedProperty = propertyRepository.save(property);

        CompletableFuture.runAsync(() -> {
            try {
                Map<String, Object> payload = new HashMap<>();
                payload.put("propertyId", savedProperty.getId());
                payload.put("ownerId", savedProperty.getOwnerId());
                payload.put("title", savedProperty.getTitle());
                if (reason != null && !reason.isBlank()) payload.put("reason", reason);
                rabbitTemplate.convertAndSend("corecity.exchange", "notification.listing_rejected", payload);
                log.info("Published rejection notification for property {}", savedProperty.getId());
            } catch (Exception exception) {
                log.warn("Could not publish rejection notification for property {}", savedProperty.getId(), exception);
            }
        });

        return toResponse(savedProperty);
    }

    @Transactional
    public PropertyResponse updateProperty(Long id, CreatePropertyRequest req, Long userId) {
        Long safeId = Objects.requireNonNull(id, "property id must not be null");
        Long safeUserId = Objects.requireNonNull(userId, "user id must not be null");
        locationService.validateLocation(req.getStateId(), req.getLgaId());
        Property property = propertyRepository.findById(safeId)
            .orElseThrow(() -> new RuntimeException("Property not found"));
        if (!property.getOwnerId().equals(safeUserId))
            throw new RuntimeException("Unauthorized: not the property owner");

        property.setTitle(req.getTitle());
        property.setDescription(req.getDescription());
        property.setPrice(req.getPrice());
        property.setAddress(req.getAddress());
        property.setStateId(req.getStateId());
        property.setLgaId(req.getLgaId());
        property.setLatitude(req.getLatitude());
        property.setLongitude(req.getLongitude());
        if (req.getBedrooms() != null) property.setBedrooms(req.getBedrooms());
        if (req.getBathrooms() != null) property.setBathrooms(req.getBathrooms());
        var savedProperty = propertyRepository.save(
            Objects.requireNonNull(property, "updated property must not be null"));
        return toResponse(savedProperty);
    }

    @Transactional
    public void deleteProperty(Long id, Long userId) {
        Long safeId = Objects.requireNonNull(id, "property id must not be null");
        Long safeUserId = Objects.requireNonNull(userId, "user id must not be null");
        Property property = propertyRepository.findById(safeId)
            .orElseThrow(() -> new RuntimeException("Property not found"));
        if (!property.getOwnerId().equals(safeUserId))
            throw new RuntimeException("Unauthorized");
        property.setStatus(Property.PropertyStatus.INACTIVE);
        propertyRepository.save(Objects.requireNonNull(property, "property must not be null"));
    }

    @Transactional(readOnly = true)
    public List<PropertyResponse> getFeaturedProperties() {
        return propertyRepository
            .findByStatusOrderByCreatedAtDesc(Property.PropertyStatus.ACTIVE, PageRequest.of(0, 8))
            .stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    private PropertyResponse toResponse(Property p) {
        return toResponse(p, null, null);
    }

    private PropertyResponse toResponse(Property p, Long requesterId, String requesterRole) {
        List<String> amenities = new ArrayList<>();
        if (p.getAmenities() != null) {
            try { amenities = objectMapper.readValue(p.getAmenities(), new TypeReference<>() {}); }
            catch (Exception ignored) {}
        }

        List<String> imageUrls = Optional.ofNullable(p.getFiles())
            .orElseGet(List::of)
            .stream()
            .sorted(Comparator.comparing(file -> !Boolean.TRUE.equals(file.getPrimary())))
            .map(file -> file.getFileUrl())
            .filter(Objects::nonNull)
            .collect(Collectors.toList());

        String primaryImage = Optional.ofNullable(p.getFiles())
            .orElseGet(List::of)
            .stream()
            .filter(file -> Boolean.TRUE.equals(file.getPrimary()))
            .map(file -> file.getFileUrl())
            .filter(Objects::nonNull)
            .findFirst()
            .orElse(imageUrls.isEmpty() ? null : imageUrls.get(0));

        String stateName = locationService.getStateName(p.getStateId()).orElse(null);
        String lgaName = locationService.getLgaName(p.getLgaId()).orElse(null);

        // Masking logic: during ON_NEGOTIATION the exact address and agent ID are hidden
        // unless the requester is the property owner, an admin, or the active reservation holder.
        boolean isOnNegotiation = p.getStatus() == Property.PropertyStatus.ON_NEGOTIATION;
        boolean isOwner = requesterId != null && requesterId.equals(p.getOwnerId());
        boolean isAdmin = "ADMIN".equalsIgnoreCase(requesterRole);
        boolean holdsReservation = isOnNegotiation && requesterId != null
            && reservationRepository.existsByPropertyIdAndCustomerIdAndStatusIn(
                p.getId(), requesterId, List.of(Reservation.ReservationStatus.ACTIVE));

        boolean maskSensitive = isOnNegotiation && !isOwner && !isAdmin && !holdsReservation;
        String address = maskSensitive ? null : p.getAddress();
        Long agentId  = maskSensitive ? null : p.getAgentId();

        return PropertyResponse.builder()
            .id(p.getId()).title(p.getTitle()).description(p.getDescription())
            .propertyType(p.getPropertyType().name())
            .listingType(p.getListingType().name())
            .price(p.getPrice()).pricePeriod(p.getPricePeriod().name())
            .bedrooms(p.getBedrooms()).bathrooms(p.getBathrooms()).toilets(p.getToilets())
            .sizeSqm(p.getSizeSqm()).address(address)
            .stateId(p.getStateId()).stateName(stateName)
            .lgaId(p.getLgaId()).lgaName(lgaName)
            .latitude(p.getLatitude()).longitude(p.getLongitude())
            .ownerId(p.getOwnerId()).agentId(agentId)
            .status(p.getStatus().name())
            .negotiable(p.getNegotiable()).amenities(amenities)
            .imageUrls(imageUrls).primaryImageUrl(primaryImage)
            .viewsCount(p.getViewsCount()).createdAt(p.getCreatedAt())
            .build();
    }

    private Pageable buildPageable(PropertySearchRequest req) {
        String sortField = switch (req.getSortBy()) {
            case "price" -> "price";
            case "viewsCount" -> "viewsCount";
            default -> "createdAt";
        };

        Sort.Direction direction = "asc".equalsIgnoreCase(req.getSortDir())
            ? Sort.Direction.ASC
            : Sort.Direction.DESC;

        return PageRequest.of(req.getPage(), req.getSize(), Sort.by(direction, sortField));
    }

    @Transactional
    public PropertyResponse registerFiles(Long propertyId, List<String> fileUrls, Long requesterId) {
        Long safePropertyId = Objects.requireNonNull(propertyId, "property id must not be null");
        Long safeRequesterId = Objects.requireNonNull(requesterId, "requester id must not be null");
        Property property = propertyRepository.findById(safePropertyId)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Property not found"));

        if (!property.getOwnerId().equals(safeRequesterId)) {
            throw new ResponseStatusException(FORBIDDEN, "You do not own this property");
        }

        boolean firstFile = propertyFileRepository.findByPropertyIdOrderByUploadedAtAsc(safePropertyId).isEmpty();

        for (int i = 0; i < fileUrls.size(); i++) {
            boolean isPrimary = firstFile && i == 0;
            PropertyFile pf = PropertyFile.builder()
                .property(property)
                .fileUrl(fileUrls.get(i))
                .fileType(PropertyFile.FileType.IMAGE)
                .primary(isPrimary)
                .build();
            propertyFileRepository.save(Objects.requireNonNull(pf, "property file must not be null"));
        }

        // Reload so toResponse reads the freshly saved files
        Property refreshed = propertyRepository.findById(safePropertyId).orElseThrow();
        return toResponse(refreshed);
    }

    private void requireAdmin(String userRole) {
        if (!"ADMIN".equalsIgnoreCase(userRole)) {
            throw new ResponseStatusException(FORBIDDEN, "Admin access required");
        }
    }
}
