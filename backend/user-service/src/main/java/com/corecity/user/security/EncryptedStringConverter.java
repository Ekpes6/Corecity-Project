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
 *
 * However, Hibernate may also create a second non-Spring-managed instance of this
 * converter during schema validation or lazy-loading. The static reference below
 * ensures that instance also works, since the Spring-managed instance is always
 * constructed first at application startup.
 */
@Component
@Converter
public class EncryptedStringConverter implements AttributeConverter<String, String> {

    // Set once by the Spring-managed instance at startup; used as fallback when
    // Hibernate creates non-Spring instances of this converter.
    private static volatile EncryptionService staticEncryptionService;

    private final EncryptionService encryptionService;

    public EncryptedStringConverter(EncryptionService encryptionService) {
        this.encryptionService = encryptionService;
        staticEncryptionService = encryptionService; // populate static fallback
    }

    private EncryptionService service() {
        EncryptionService svc = this.encryptionService != null
                ? this.encryptionService
                : staticEncryptionService;
        if (svc == null) {
            throw new IllegalStateException(
                "EncryptionService is not initialized — ENCRYPTION_KEY may be missing");
        }
        return svc;
    }

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null || attribute.isBlank()) return attribute;
        return service().encrypt(attribute);
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) return dbData;
        return service().decrypt(dbData);
    }
}
