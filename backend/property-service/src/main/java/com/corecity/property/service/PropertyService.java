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
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PropertyService {

    private final PropertyRepository propertyRepository;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    @Transactional
    public PropertyResponse createProperty(CreatePropertyRequest req, Long ownerId) {
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
            .ownerId(ownerId)
            .negotiable(req.getNegotiable())
            .amenities(amenitiesJson)
            .status(Property.PropertyStatus.PENDING)
            .build();

        property = propertyRepository.save(property);

        // Notify admin of new listing
        rabbitTemplate.convertAndSend("corecity.exchange", "notification.new_listing",
            Map.of("propertyId", property.getId(), "ownerId", ownerId, "title", property.getTitle()));

        return toResponse(property);
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
        Property property = propertyRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Property not found"));
        propertyRepository.incrementViews(id);
        return toResponse(property);
    }

    @Transactional(readOnly = true)
    public List<PropertyResponse> getMyProperties(Long ownerId) {
        return propertyRepository.findByOwnerIdOrderByCreatedAtDesc(ownerId)
            .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public PropertyResponse updateProperty(Long id, CreatePropertyRequest req, Long userId) {
        Property property = propertyRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Property not found"));
        if (!property.getOwnerId().equals(userId))
            throw new RuntimeException("Unauthorized: not the property owner");

        property.setTitle(req.getTitle());
        property.setDescription(req.getDescription());
        property.setPrice(req.getPrice());
        property.setAddress(req.getAddress());
        if (req.getBedrooms() != null) property.setBedrooms(req.getBedrooms());
        if (req.getBathrooms() != null) property.setBathrooms(req.getBathrooms());
        return toResponse(propertyRepository.save(property));
    }

    @Transactional
    public void deleteProperty(Long id, Long userId) {
        Property property = propertyRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Property not found"));
        if (!property.getOwnerId().equals(userId))
            throw new RuntimeException("Unauthorized");
        property.setStatus(Property.PropertyStatus.INACTIVE);
        propertyRepository.save(property);
    }

    public List<PropertyResponse> getFeaturedProperties() {
        return propertyRepository.findFeatured(PageRequest.of(0, 8))
            .stream().map(this::toResponse).collect(Collectors.toList());
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
            .stateId(p.getStateId()).lgaId(p.getLgaId())
            .latitude(p.getLatitude()).longitude(p.getLongitude())
            .ownerId(p.getOwnerId()).status(p.getStatus().name())
            .negotiable(p.getNegotiable()).amenities(amenities)
            .imageUrls(imageUrls).primaryImageUrl(primaryImage)
            .viewsCount(p.getViewsCount()).createdAt(p.getCreatedAt())
            .build();
    }
}
