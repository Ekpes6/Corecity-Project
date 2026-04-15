package com.corecity.user.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;

/**
 * AES-256-GCM encryption for sensitive PII fields (BVN, NIN).
 * The encryption key must be a Base64-encoded 32-byte (256-bit) secret
 * supplied via the ENCRYPTION_KEY environment variable.
 */
@Component
public class EncryptionService {

    private static final int GCM_IV_LENGTH  = 12;   // 96-bit IV
    private static final int GCM_TAG_LENGTH = 128;  // 128-bit auth tag

    private final SecretKeySpec secretKey;
    private final SecureRandom random = new SecureRandom();

    public EncryptionService(@Value("${encryption.key}") String encodedKey) {
        byte[] keyBytes = Base64.getDecoder().decode(encodedKey);
        if (keyBytes.length != 32) {
            throw new IllegalArgumentException(
                    "ENCRYPTION_KEY must decode to exactly 32 bytes (256-bit AES key).");
        }
        this.secretKey = new SecretKeySpec(keyBytes, "AES");
    }

    /** Encrypts plaintext and returns a Base64-encoded string (IV + ciphertext). */
    public String encrypt(String plaintext) {
        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            random.nextBytes(iv);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

            byte[] combined = new byte[GCM_IV_LENGTH + ciphertext.length];
            System.arraycopy(iv, 0, combined, 0, GCM_IV_LENGTH);
            System.arraycopy(ciphertext, 0, combined, GCM_IV_LENGTH, ciphertext.length);
            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            throw new RuntimeException("Encryption failed", e);
        }
    }

    /** Decrypts a Base64-encoded string (IV + ciphertext) back to plaintext. */
    public String decrypt(String encoded) {
        try {
            byte[] combined = Base64.getDecoder().decode(encoded);
            byte[] iv         = Arrays.copyOfRange(combined, 0, GCM_IV_LENGTH);
            byte[] ciphertext = Arrays.copyOfRange(combined, GCM_IV_LENGTH, combined.length);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("Decryption failed", e);
        }
    }
}
