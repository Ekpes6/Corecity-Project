package com.corecity.property.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.corecity.property.dto.PropertyDTOs.*;
import com.corecity.property.entity.Property;
import com.corecity.property.entity.PropertyFile;
import com.corecity.property.repository.PropertyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PropertyService {

    private final PropertyRepository propertyRepository;
    private final LocationService locationService;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    @Transactional
    public PropertyResponse createProperty(CreatePropertyRequest req, Long ownerId) {
        Long safeOwnerId = Objects.requireNonNull(ownerId, "owner id must not be null");
        log.info("Creating property for owner {} with title '{}'", safeOwnerId, req.getTitle());
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
        Sort sort = req.getSortDir().equalsIgnoreCase("asc")
            ? Sort.by(req.getSortBy()).ascending()
            : Sort.by(req.getSortBy()).descending();
        Pageable pageable = PageRequest.of(req.getPage(), req.getSize(), sort);

        return propertyRepository.search(
            req.getListingType(), req.getPropertyType(),
            req.getStateId(), req.getLgaId(),
            req.getMinPrice(), req.getMaxPrice(),
            req.getBedrooms(), req.getKeyword(),
            pageable
        ).map(this::toResponse);
    }

    @Transactional
    public PropertyResponse getProperty(Long id) {
        Long safeId = Objects.requireNonNull(id, "property id must not be null");
        Property property = propertyRepository.findById(safeId)
            .orElseThrow(() -> new RuntimeException("Property not found"));
        propertyRepository.incrementViews(safeId);
        return toResponse(property);
    }

    @Transactional(readOnly = true)
    public List<PropertyResponse> getMyProperties(Long ownerId) {
        Long safeOwnerId = Objects.requireNonNull(ownerId, "owner id must not be null");
        return propertyRepository.findByOwnerIdOrderByCreatedAtDesc(safeOwnerId)
            .stream().map(this::toResponse).collect(Collectors.toList());
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
        return propertyRepository.findByStatusOrderByCreatedAtDesc(Property.PropertyStatus.ACTIVE, PageRequest.of(0, 8))
            .getContent()
            .stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    private PropertyResponse toResponse(Property p) {
        List<String> amenities = new ArrayList<>();
        if (p.getAmenities() != null) {
            try { amenities = objectMapper.readValue(p.getAmenities(), new TypeReference<>() {}); }
            catch (Exception ignored) {}
        }

        List<String> imageUrls = new ArrayList<>();
        String primaryImage = null;
        if (p.getFiles() != null) {
            for (PropertyFile f : p.getFiles()) {
                if (f.getFileType() == PropertyFile.FileType.IMAGE) {
                    imageUrls.add(f.getFileUrl());
                    if (Boolean.TRUE.equals(f.getPrimary())) primaryImage = f.getFileUrl();
                }
            }
        }

        return PropertyResponse.builder()
            .id(p.getId()).title(p.getTitle()).description(p.getDescription())
            .propertyType(p.getPropertyType().name())
            .listingType(p.getListingType().name())
            .price(p.getPrice()).pricePeriod(p.getPricePeriod().name())
            .bedrooms(p.getBedrooms()).bathrooms(p.getBathrooms()).toilets(p.getToilets())
            .sizeSqm(p.getSizeSqm()).address(p.getAddress())
            .stateId(p.getStateId()).stateName(null)
            .lgaId(p.getLgaId()).lgaName(null)
            .latitude(p.getLatitude()).longitude(p.getLongitude())
            .ownerId(p.getOwnerId()).status(p.getStatus().name())
            .negotiable(p.getNegotiable()).amenities(amenities)
            .imageUrls(imageUrls).primaryImageUrl(primaryImage)
            .viewsCount(p.getViewsCount()).createdAt(p.getCreatedAt())
            .build();
    }
}
