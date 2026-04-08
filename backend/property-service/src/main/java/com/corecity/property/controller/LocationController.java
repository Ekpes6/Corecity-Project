package com.corecity.property.controller;

import com.corecity.property.dto.LocationDTOs.LgaOption;
import com.corecity.property.dto.LocationDTOs.StateOption;
import com.corecity.property.service.LocationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/states")
@RequiredArgsConstructor
public class LocationController {

    private final LocationService locationService;

    @GetMapping
    public ResponseEntity<List<StateOption>> getStates() {
        return ResponseEntity.ok(locationService.getStates());
    }

    @GetMapping("/{stateId}/lgas")
    public ResponseEntity<List<LgaOption>> getLgas(@PathVariable Integer stateId) {
        return ResponseEntity.ok(locationService.getLgas(stateId));
    }
}