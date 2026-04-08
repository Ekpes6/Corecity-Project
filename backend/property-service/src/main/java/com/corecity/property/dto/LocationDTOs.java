package com.corecity.property.dto;

public class LocationDTOs {

    public record StateOption(Integer id, String name) {}

    public record LgaOption(Integer id, String name, Integer stateId) {}
}