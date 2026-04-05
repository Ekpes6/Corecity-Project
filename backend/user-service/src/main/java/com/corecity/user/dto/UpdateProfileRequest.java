package com.corecity.user.dto;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class UpdateProfileRequest {
    private String firstName;
    private String lastName;
    private String avatarUrl;
}
