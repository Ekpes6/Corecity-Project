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

    // ─── Private helpers ────────────────────────────────────────────────────

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

    private String uploadDir;

    @Value("${file.base-url:http://localhost:8083/api/v1/files/serve}")
    private String baseUrl;

    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
        "image/jpeg", "image/png", "image/webp", "image/gif"
    );
    private static final Set<String> ALLOWED_DOC_TYPES = Set.of(
        "application/pdf", "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

    private final Tika tika = new Tika();

    /**
     * Whitelist of permitted category values.
     * Prevents path traversal via the category parameter (e.g. "../../etc").
     */
    private static final Set<String> ALLOWED_CATEGORIES = Set.of(
        "images", "documents", "thumbnails", "videos"
    );

    public record UploadResult(String fileUrl, String fileName, String fileType, long sizeBytes) {}

    public UploadResult uploadFile(MultipartFile file, Long propertyId, String category) throws IOException {
        validateFile(file);
        String safeCategory = validateCategory(category);

        // Build upload path: /uploads/properties/{propertyId}/{category}/
        Path baseUploadPath = Paths.get(uploadDir).toRealPath();
        Path dir = baseUploadPath.resolve("properties")
                                 .resolve(String.valueOf(propertyId))
                                 .resolve(safeCategory)
                                 .normalize();

        // Boundary check: resolved dir must still be inside the upload root
        if (!dir.startsWith(baseUploadPath)) {
            throw new SecurityException("Attempted path traversal in upload directory");
        }

        Files.createDirectories(dir);

        String originalName = Objects.requireNonNull(file.getOriginalFilename());
        String ext = getExtension(originalName);
        String fileName = UUID.randomUUID() + "." + ext;
        Path filePath = dir.resolve(fileName).normalize();

        // Second boundary check after resolving the final filename
        if (!filePath.startsWith(dir)) {
            throw new SecurityException("Attempted path traversal in filename");
        }

        if (ALLOWED_IMAGE_TYPES.contains(file.getContentType())) {
            Thumbnails.of(file.getInputStream())
                .size(1280, 960)
                .keepAspectRatio(true)
                .toFile(filePath.toFile());

            Path thumbDir = dir.resolve("thumbnails");
            Files.createDirectories(thumbDir);
            Thumbnails.of(filePath.toFile())
                .size(400, 300)
                .toFile(thumbDir.resolve("thumb_" + fileName).toFile());
        } else {
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
        }

        String relPath = String.format("properties/%d/%s/%s", propertyId, safeCategory, fileName);
        String fileUrl = baseUrl + "/" + relPath;

        log.info("File uploaded: {} for property {}", fileName, propertyId);
        return new UploadResult(fileUrl, fileName, file.getContentType(), filePath.toFile().length());
    }

    public void deleteFile(String fileUrl) throws IOException {
        if (!fileUrl.startsWith(baseUrl)) {
            throw new SecurityException("File URL does not belong to this service");
        }
        String relPath = fileUrl.substring((baseUrl + "/").length());
        Path baseUploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        Path filePath = baseUploadPath.resolve(relPath).normalize();

        // Boundary check before deletion
        if (!filePath.startsWith(baseUploadPath)) {
            throw new SecurityException("Attempted path traversal in delete");
        }
        Files.deleteIfExists(filePath);
    }

    /**
     * Serves a file by its relative path segments.
     *
     * Security: after resolving the final path, we verify it still lives
     * inside the upload root. This prevents path traversal attacks via
     * encoded ".." segments (e.g. path=../../etc/passwd).
     */
    public byte[] serveFile(String... pathParts) throws IOException {
        Path baseUploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        Path filePath = baseUploadPath;
        for (String part : pathParts) {
            filePath = filePath.resolve(part);
        }
        filePath = filePath.normalize();

        // Boundary check — must stay inside the upload directory
        if (!filePath.startsWith(baseUploadPath)) {
            log.warn("Path traversal attempt blocked: {}", filePath);
            throw new FileNotFoundException("File not found");
        }

        if (!Files.exists(filePath)) throw new FileNotFoundException("File not found");
        return Files.readAllBytes(filePath);
    }

    // ─── Private helpers ────────────────────────────────────────────────────

    private void validateFile(MultipartFile file) throws IOException {
        if (file.isEmpty()) throw new IllegalArgumentException("File is empty");
        if (file.getSize() > MAX_FILE_SIZE)
            throw new IllegalArgumentException("File exceeds maximum size of 10MB");

        // Detect the real MIME type from the file's magic bytes (ignores client-supplied content-type)
        String detectedType = tika.detect(file.getInputStream());
        if (!ALLOWED_IMAGE_TYPES.contains(detectedType) && !ALLOWED_DOC_TYPES.contains(detectedType))
            throw new IllegalArgumentException("File type not allowed: " + detectedType);
    }

    /**
     * Validates and returns a safe category string.
     * Only whitelisted category names are permitted — rejects anything
     * containing path separators, dots, or other injection characters.
     */
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