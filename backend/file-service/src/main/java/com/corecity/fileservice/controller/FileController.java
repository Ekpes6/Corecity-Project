package com.corecity.fileservice.controller;

import com.corecity.fileservice.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;

@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
public class FileController {

    private final FileStorageService fileStorageService;

    /** Upload single file for a property */
    @PostMapping("/upload/property/{propertyId}")
    public ResponseEntity<Map<String, Object>> uploadPropertyFile(
            @PathVariable Long propertyId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "images") String category,
            @RequestHeader("X-User-Id") Long userId) {

        try {
            FileStorageService.UploadResult result = fileStorageService.uploadFile(file, propertyId, category);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "fileUrl", result.fileUrl(),
                "fileName", result.fileName(),
                "fileType", result.fileType(),
                "sizeBytes", result.sizeBytes()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("success", false, "error", "Upload failed"));
        }
    }

    /** Upload multiple files at once */
    @PostMapping("/upload/property/{propertyId}/batch")
    public ResponseEntity<Map<String, Object>> uploadBatch(
            @PathVariable Long propertyId,
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam(defaultValue = "images") String category,
            @RequestHeader("X-User-Id") Long userId) {

        List<Map<String, Object>> results = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        for (MultipartFile file : files) {
            try {
                FileStorageService.UploadResult result = fileStorageService.uploadFile(file, propertyId, category);
                results.add(Map.of("fileUrl", result.fileUrl(), "fileName", result.fileName()));
            } catch (Exception e) {
                errors.add(file.getOriginalFilename() + ": " + e.getMessage());
            }
        }

        return ResponseEntity.ok(Map.of(
            "uploaded", results,
            "errors", errors,
            "totalUploaded", results.size()
        ));
    }

    /** Delete a file by its S3 public URL */
    @DeleteMapping
    public ResponseEntity<Map<String, Object>> deleteFile(
            @RequestParam String fileUrl,
            @RequestHeader("X-User-Id") Long userId) {
        try {
            fileStorageService.deleteFile(fileUrl);
            return ResponseEntity.ok(Map.of("success", true, "message", "File deleted"));
        } catch (SecurityException e) {
            return ResponseEntity.badRequest()
                .body(Map.of("success", false, "error", e.getMessage()));
        }
    }
}

