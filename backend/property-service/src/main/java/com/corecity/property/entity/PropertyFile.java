package com.corecity.property.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "property_files")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PropertyFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;

    @Column(name = "file_url", nullable = false)
    private String fileUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "file_type")
    @Builder.Default
    private FileType fileType = FileType.IMAGE;

    @Column(name = "is_primary")
    @Builder.Default
    private Boolean primary = false;

    @Column(name = "uploaded_at")
    @Builder.Default
    private LocalDateTime uploadedAt = LocalDateTime.now();

    public enum FileType { IMAGE, VIDEO, DOCUMENT, VIRTUAL_TOUR }
}
