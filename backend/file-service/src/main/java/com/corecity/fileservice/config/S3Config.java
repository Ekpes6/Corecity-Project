package com.corecity.fileservice.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;

import java.net.URI;

@Configuration
public class S3Config {

    @Value("${cloud.aws.credentials.access-key}")
    private String accessKey;

    @Value("${cloud.aws.credentials.secret-key}")
    private String secretKey;

    @Value("${cloud.aws.s3.region:auto}")
    private String region;

    /**
     * Optional custom endpoint — leave blank for AWS S3.
     * Set to your Cloudflare R2 endpoint:
     *   https://{ACCOUNT_ID}.r2.cloudflarestorage.com
     */
    @Value("${cloud.aws.s3.endpoint:}")
    private String endpoint;

    @Bean
    public S3Client s3Client() {
        var credentials = StaticCredentialsProvider.create(
            AwsBasicCredentials.create(accessKey, secretKey));

        var builder = S3Client.builder()
            .region(Region.of(region))
            .credentialsProvider(credentials);

        if (!endpoint.isBlank()) {
            // Path-style is required for Cloudflare R2 and most S3-compatible providers
            builder.endpointOverride(URI.create(endpoint))
                   .serviceConfiguration(S3Configuration.builder()
                       .pathStyleAccessEnabled(true)
                       .build());
        }

        return builder.build();
    }
}
