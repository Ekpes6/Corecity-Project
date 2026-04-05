package com.corecity.fileservice.service;

import lombok.extern.slf4j.Slf4j;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.file.*;
import java.util.*;

@Service
@Slf4j
public class FileStorageService {

    @Value("${file.upload-dir:/uploads}")
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
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    public record UploadResult(String fileUrl, String fileName, String fileType, long sizeBytes) {}

    public UploadResult uploadFile(MultipartFile file, Long propertyId, String category) throws IOException {
        validateFile(file);

        // Build upload path: /uploads/properties/{propertyId}/{category}/
        Path dir = Paths.get(uploadDir, "properties", String.valueOf(propertyId), category);
        Files.createDirectories(dir);

        String originalName = Objects.requireNonNull(file.getOriginalFilename());
        String ext = getExtension(originalName);
        String fileName = UUID.randomUUID() + "." + ext;
        Path filePath = dir.resolve(fileName);

        if (ALLOWED_IMAGE_TYPES.contains(file.getContentType())) {
            // Resize image on upload to save bandwidth
            Thumbnails.of(file.getInputStream())
                .size(1280, 960)
                .keepAspectRatio(true)
                .toFile(filePath.toFile());

            // Also create thumbnail
            Path thumbDir = dir.resolve("thumbnails");
            Files.createDirectories(thumbDir);
            Thumbnails.of(filePath.toFile())
                .size(400, 300)
                .toFile(thumbDir.resolve("thumb_" + fileName).toFile());
        } else {
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
        }

        String relPath = String.format("properties/%d/%s/%s", propertyId, category, fileName);
        String fileUrl = baseUrl + "/" + relPath;

        log.info("File uploaded: {} for property {}", fileName, propertyId);
        return new UploadResult(fileUrl, fileName, file.getContentType(), filePath.toFile().length());
    }

    public void deleteFile(String fileUrl) throws IOException {
        String relPath = fileUrl.replace(baseUrl + "/", "");
        Path filePath = Paths.get(uploadDir, relPath);
        Files.deleteIfExists(filePath);
    }

    public byte[] serveFile(String... pathParts) throws IOException {
        Path filePath = Paths.get(uploadDir, pathParts);
        if (!Files.exists(filePath)) throw new FileNotFoundException("File not found");
        return Files.readAllBytes(filePath);
    }

    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) throw new IllegalArgumentException("File is empty");
        if (file.getSize() > MAX_FILE_SIZE)
            throw new IllegalArgumentException("File exceeds maximum size of 10MB");
        String contentType = file.getContentType();
        if (contentType == null ||
            (!ALLOWED_IMAGE_TYPES.contains(contentType) && !ALLOWED_DOC_TYPES.contains(contentType)))
            throw new IllegalArgumentException("File type not allowed: " + contentType);
    }

    private String getExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot + 1).toLowerCase() : "bin";
    }
}
