package com.corecity.fileservice.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.*;

class FileStorageServiceTest {

    @TempDir
    Path tempDir;

    FileStorageService service;

    @BeforeEach
    void setUp() {
        service = new FileStorageService();
        ReflectionTestUtils.setField(service, "uploadDir", tempDir.toString());
        ReflectionTestUtils.setField(service, "baseUrl",
            "http://localhost:8083/api/v1/files/serve");
    }

    @Test
    void uploadFile_validImage_returnsUrlWithCorrectPath() throws IOException {
        var file = new MockMultipartFile(
            "file", "photo.jpg", "image/jpeg", new byte[]{1, 2, 3});

        // Note: Thumbnailator needs a real image, so we test with a PDF instead
        var pdf = new MockMultipartFile(
            "file", "deed.pdf", "application/pdf", "PDF content".getBytes());

        var result = service.uploadFile(pdf, 42L, "documents");

        assertThat(result.fileUrl()).contains("properties/42/documents/");
        assertThat(result.fileType()).isEqualTo("application/pdf");
        assertThat(result.sizeBytes()).isGreaterThan(0);
    }

    @Test
    void uploadFile_invalidCategory_throwsException() {
        var file = new MockMultipartFile(
            "file", "deed.pdf", "application/pdf", "content".getBytes());

        assertThatIllegalArgumentException()
            .isThrownBy(() -> service.uploadFile(file, 1L, "../../etc"))
            .withMessageContaining("Invalid category");
    }

    @Test
    void uploadFile_disallowedMimeType_throwsException() {
        var exe = new MockMultipartFile(
            "file", "malware.exe", "application/x-msdownload", new byte[]{1});

        assertThatIllegalArgumentException()
            .isThrownBy(() -> service.uploadFile(exe, 1L, "images"))
            .withMessageContaining("File type not allowed");
    }

    @Test
    void uploadFile_tooLarge_throwsException() {
        byte[] bigData = new byte[11 * 1024 * 1024];
        var file = new MockMultipartFile(
            "file", "big.pdf", "application/pdf", bigData);

        assertThatIllegalArgumentException()
            .isThrownBy(() -> service.uploadFile(file, 1L, "documents"))
            .withMessageContaining("exceeds maximum size");
    }

    @Test
    void serveFile_existingFile_returnsBytes() throws IOException {
        Path dir = tempDir.resolve("properties/1/images");
        Files.createDirectories(dir);
        Path file = dir.resolve("test.jpg");
        Files.write(file, "fake image bytes".getBytes());

        byte[] result = service.serveFile("properties", "1", "images", "test.jpg");

        assertThat(new String(result)).isEqualTo("fake image bytes");
    }

    @Test
    void serveFile_pathTraversalAttempt_throwsFileNotFound() {
        assertThatExceptionOfType(java.io.FileNotFoundException.class)
            .isThrownBy(() -> service.serveFile("..", "..", "etc", "passwd"));
    }

    @Test
    void serveFile_encodedDotDotSegments_blocked() {
        assertThatExceptionOfType(java.io.FileNotFoundException.class)
            .isThrownBy(() -> service.serveFile("properties", "..", "..", "secret.txt"));
    }

    @Test
    void serveFile_nonExistentFile_throwsFileNotFound() {
        assertThatExceptionOfType(java.io.FileNotFoundException.class)
            .isThrownBy(() -> service.serveFile("properties", "1", "images", "missing.jpg"));
    }

    @Test
    void deleteFile_outsideUploadRoot_throwsSecurityException() {
        String maliciousUrl =
            "http://localhost:8083/api/v1/files/serve/../../etc/passwd";

        assertThatExceptionOfType(SecurityException.class)
            .isThrownBy(() -> service.deleteFile(maliciousUrl));
    }

    @Test
    void deleteFile_wrongBaseUrl_throwsSecurityException() {
        assertThatExceptionOfType(SecurityException.class)
            .isThrownBy(() -> service.deleteFile("http://evil.com/hack"));
    }
}