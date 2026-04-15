package com.corecity.fileservice.service;

import lombok.extern.slf4j.Slf4j;
import net.coobird.thumbnailator.Thumbnails;
import org.apache.tika.Tika;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.*;
import java.util.*;

@Service
@Slf4j
public class FileStorageService {

    @Value("${cloud.aws.s3.bucket}")
    private String bucket;

    @Value("${cloud.aws.s3.public-base-url}")
    private String publicBaseUrl;

    private final S3Client s3Client;

    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
        "image/jpeg", "image/png", "image/webp", "image/gif"
    );
    private static final Set<String> ALLOWED_DOC_TYPES = Set.of(
        "application/pdf", "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

    private static final Set<String> ALLOWED_CATEGORIES = Set.of(
        "images", "documents", "thumbnails", "videos"
    );

    private final Tika tika = new Tika();

    public FileStorageService(S3Client s3Client) {
        this.s3Client = s3Client;
    }

    public record UploadResult(String fileUrl, String fileName, String fileType, long sizeBytes) {}

    public UploadResult uploadFile(MultipartFile file, Long propertyId, String category) throws IOException {
        validateFile(file);
        String safeCategory = validateCategory(category);

        String originalName = Objects.requireNonNull(file.getOriginalFilename());
        String ext = getExtension(originalName);
        String fileName = UUID.randomUUID() + "." + ext;
        String key = String.format("properties/%d/%s/%s", propertyId, safeCategory, fileName);

        String contentType = file.getContentType();
        byte[] fileBytes;

        if (ALLOWED_IMAGE_TYPES.contains(contentType)) {
            // Resize full image in memory and upload
            ByteArrayOutputStream fullOut = new ByteArrayOutputStream();
            Thumbnails.of(file.getInputStream())
                .size(1280, 960)
                .keepAspectRatio(true)
                .outputFormat(imageFormat(ext))
                .toOutputStream(fullOut);
            fileBytes = fullOut.toByteArray();

            // Generate and upload thumbnail as a sibling key
            ByteArrayOutputStream thumbOut = new ByteArrayOutputStream();
            Thumbnails.of(new ByteArrayInputStream(fileBytes))
                .size(400, 300)
                .outputFormat(imageFormat(ext))
                .toOutputStream(thumbOut);
            String thumbKey = String.format("properties/%d/%s/thumbnails/thumb_%s",
                propertyId, safeCategory, fileName);
            putObject(thumbKey, thumbOut.toByteArray(), contentType);
        } else {
            fileBytes = file.getBytes();
        }

        putObject(key, fileBytes, contentType);
        String fileUrl = resolveUrl(key);
        log.info("File uploaded to S3: {} for property {}", key, propertyId);
        return new UploadResult(fileUrl, fileName, contentType, fileBytes.length);
    }

    public void deleteFile(String fileUrl) {
        String prefix = publicBaseUrl.endsWith("/") ? publicBaseUrl : publicBaseUrl + "/";
        if (!fileUrl.startsWith(prefix)) {
            throw new SecurityException("File URL does not belong to this bucket");
        }
        String key = fileUrl.substring(prefix.length());
        s3Client.deleteObject(b -> b.bucket(bucket).key(key));
        log.info("File deleted from S3: {}", key);
    }

    // --- Private helpers ---

    private void putObject(String key, byte[] bytes, String contentType) {
        s3Client.putObject(
            PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(contentType)
                .contentLength((long) bytes.length)
                .build(),
            RequestBody.fromBytes(bytes)
        );
    }

    private String resolveUrl(String key) {
        return publicBaseUrl.endsWith("/") ? publicBaseUrl + key : publicBaseUrl + "/" + key;
    }

    private static String imageFormat(String ext) {
        return switch (ext.toLowerCase()) {
            case "jpg", "jpeg" -> "jpg";
            case "png" -> "png";
            case "gif" -> "gif";
            default -> "jpg"; // fallback for webp and unknown types
        };
    }

    private void validateFile(MultipartFile file) throws IOException {
        if (file.isEmpty()) throw new IllegalArgumentException("File is empty");
        if (file.getSize() > MAX_FILE_SIZE)
            throw new IllegalArgumentException("File exceeds maximum size of 10MB");

        // Detect real MIME type from magic bytes (ignores client-supplied content-type)
        String detectedType = tika.detect(file.getInputStream());
        if (!ALLOWED_IMAGE_TYPES.contains(detectedType) && !ALLOWED_DOC_TYPES.contains(detectedType))
            throw new IllegalArgumentException("File type not allowed: " + detectedType);
    }

    private String validateCategory(String category) {
        if (category == null || category.isBlank()) return "images";
        String normalised = category.toLowerCase().trim();
        if (!ALLOWED_CATEGORIES.contains(normalised)) {
            throw new IllegalArgumentException(
                "Invalid category '" + category + "'. Allowed: " + ALLOWED_CATEGORIES);
        }
        return normalised;
    }

    private String getExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot + 1).toLowerCase() : "bin";
    }
}