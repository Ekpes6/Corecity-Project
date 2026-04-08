package com.corecity.property.service;

import com.corecity.property.dto.LocationDTOs.LgaOption;
import com.corecity.property.dto.LocationDTOs.StateOption;
import com.corecity.property.exception.InvalidLocationException;
import com.corecity.property.repository.LocationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class LocationService {

    private final LocationRepository locationRepository;

    public List<StateOption> getStates() {
        return locationRepository.findStates();
    }

    public List<LgaOption> getLgas(Integer stateId) {
        validateState(stateId);
        return locationRepository.findLgasByStateId(stateId);
    }

    public void validateLocation(Integer stateId, Integer lgaId) {
        if (stateId == null && lgaId == null) {
            return;
        }

        if (stateId == null) {
            throw new InvalidLocationException("Select a state before choosing an LGA.");
        }

        validateState(stateId);

        if (lgaId != null && !locationRepository.lgaExistsForState(lgaId, stateId)) {
            throw new InvalidLocationException("Selected LGA does not belong to the chosen state.");
        }
    }

    private void validateState(Integer stateId) {
        if (!locationRepository.stateExists(stateId)) {
            throw new InvalidLocationException("Selected state is invalid.");
        }
    }

    public Optional<String> getStateName(Integer stateId) {
        return locationRepository.findStateName(stateId);
    }

    public Optional<String> getLgaName(Integer lgaId) {
        return locationRepository.findLgaName(lgaId);
    }
}