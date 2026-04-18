package com.corecity.property.repository;

import com.corecity.property.entity.PropertyFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PropertyFileRepository extends JpaRepository<PropertyFile, Long> {
    List<PropertyFile> findByPropertyIdOrderByUploadedAtAsc(Long propertyId);
}
