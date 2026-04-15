package com.corecity.fileservice.service;

import lombok.RequiredArgsConstructor;
import org.apache.tika.Tika;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileStorageService {

    private static final Set<String> ALLOWED_TYPES = Set.of(
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "application/pdf"
    );
    private static final long MAX_SIZE_BYTES = 10L * 1024 * 1024; // 10 MB

    private final S3Client s3Client;

    @Value("${cloud.aws.s3.bucket}")
    private String bucket;

    @Value("${cloud.aws.s3.public-base-url}")
    private String publicBaseUrl;

    public record UploadResult(String fileUrl, String fileName, String fileType, long sizeBytes) {}

    /**
     * Validates, detects MIME type via magic bytes (Tika), and uploads a file to S3/R2.
     * Key format: {category}/{propertyId}/{uuid}-{sanitised-filename}
     */
    public UploadResult uploadFile(MultipartFile file, Long propertyId, String category) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File must not be empty");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new IllegalArgumentException("File exceeds maximum allowed size of 10 MB");
        }

        byte[] bytes = file.getBytes();

        // Detect actual content type from magic bytes — prevents MIME spoofing
        String detectedType = new Tika().detect(bytes);
        if (!ALLOWED_TYPES.contains(detectedType)) {
            throw new IllegalArgumentException("File type not allowed: " + detectedType);
        }

        String rawName = file.getOriginalFilename();
        String safeName = (rawName != null ? rawName : "file").replaceAll("[^a-zA-Z0-9._-]", "_");
        String key = category + "/" + propertyId + "/" + UUID.randomUUID() + "-" + safeName;

        s3Client.putObject(
            PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(detectedType)
                .contentLength((long) bytes.length)
                .build(),
            RequestBody.fromBytes(bytes)
        );

        String base = publicBaseUrl.endsWith("/")
            ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1)
            : publicBaseUrl;
        String fileUrl = base + "/" + key;

        return new UploadResult(fileUrl, safeName, detectedType, bytes.length);
    }

    /**
     * Deletes a file by its public URL.
     * Validates the URL belongs to this service before issuing the delete.
     */
    public void deleteFile(String fileUrl) {
        String prefix = publicBaseUrl.endsWith("/") ? publicBaseUrl : publicBaseUrl + "/";
        if (!fileUrl.startsWith(prefix)) {
            throw new SecurityException("File URL does not belong to this service");
        }
        String key = fileUrl.substring(prefix.length());

        s3Client.deleteObject(DeleteObjectRequest.builder()
            .bucket(bucket)
            .key(key)
            .build());
    }
}
