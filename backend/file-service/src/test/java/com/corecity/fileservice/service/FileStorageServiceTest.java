package com.corecity.fileservice.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectResponse;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FileStorageServiceTest {

    @Mock
    S3Client s3Client;

    FileStorageService service;
    private static final String PUBLIC_BASE_URL = "https://pub-test.r2.dev";

    @BeforeEach
    void setUp() {
        service = new FileStorageService(s3Client);
        ReflectionTestUtils.setField(service, "bucket", "corecity-test");
        ReflectionTestUtils.setField(service, "publicBaseUrl", PUBLIC_BASE_URL);

        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
            .thenReturn(PutObjectResponse.builder().build());
        when(s3Client.deleteObject(any(DeleteObjectRequest.class)))
            .thenReturn(DeleteObjectResponse.builder().build());
    }

    @Test
    void uploadFile_validPdf_returnsS3Url() throws Exception {
        var pdf = new MockMultipartFile(
            "file", "deed.pdf", "application/pdf", "PDF content".getBytes());

        var result = service.uploadFile(pdf, 42L, "documents");

        assertThat(result.fileUrl()).startsWith(PUBLIC_BASE_URL + "/properties/42/documents/");
        assertThat(result.fileType()).isEqualTo("application/pdf");
        assertThat(result.sizeBytes()).isGreaterThan(0);
        verify(s3Client, atLeastOnce()).putObject(any(PutObjectRequest.class), any(RequestBody.class));
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
    void deleteFile_validUrl_callsS3Delete() {
        String fileUrl = PUBLIC_BASE_URL + "/properties/1/images/abc.jpg";

        service.deleteFile(fileUrl);

        verify(s3Client).deleteObject(any(DeleteObjectRequest.class));
    }

    @Test
    void deleteFile_wrongBaseUrl_throwsSecurityException() {
        assertThatExceptionOfType(SecurityException.class)
            .isThrownBy(() -> service.deleteFile("http://evil.com/hack"));
    }
}