package com.corecity.user.security;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.springframework.stereotype.Component;

/**
 * JPA AttributeConverter that transparently encrypts BVN and NIN values
 * before persisting to the database and decrypts them on read.
 *
 * Spring Boot 3 + Hibernate 6 integrates with SpringBeanContainer, so this
 * @Component converter will be instantiated by Spring and have EncryptionService
 * injected via the constructor — no static-field workarounds needed.
 */
@Component
@Converter
public class EncryptedStringConverter implements AttributeConverter<String, String> {

    private final EncryptionService encryptionService;

    public EncryptedStringConverter(EncryptionService encryptionService) {
        this.encryptionService = encryptionService;
    }

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null || attribute.isBlank()) return attribute;
        return encryptionService.encrypt(attribute);
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) return dbData;
        return encryptionService.decrypt(dbData);
    }
}
