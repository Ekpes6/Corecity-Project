package com.corecity.fileservice.service;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.awt.Graphics2D;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Set;

/**
 * Applies the CoreCity logo watermark to property images before they are stored in R2.
 * Watermark is positioned at bottom-centre at 50% opacity and scaled to 25% of image width.
 *
 * Place the logo at:
 *   backend/file-service/src/main/resources/watermark.png
 *
 * If the file is missing the service silently skips watermarking (safe for local dev).
 */
@Component
@Slf4j
public class WatermarkService {

    /** MIME types that get watermarked. GIF is excluded (animation support is unreliable). */
    private static final Set<String> WATERMARKABLE = Set.of("image/jpeg", "image/png", "image/webp");

    /** Watermark width as a fraction of the property image width. */
    private static final double WATERMARK_WIDTH_RATIO = 0.25;

    /** Bottom padding between watermark and image edge (pixels). */
    private static final int BOTTOM_PADDING = 20;

    private BufferedImage watermarkImage;

    @PostConstruct
    public void init() {
        try (InputStream is = getClass().getResourceAsStream("/watermark.png")) {
            if (is == null) {
                log.warn("watermark.png not found in classpath — watermarking disabled");
                return;
            }
            watermarkImage = ImageIO.read(is);
            log.info("Watermark loaded ({}×{})", watermarkImage.getWidth(), watermarkImage.getHeight());
        } catch (IOException e) {
            log.warn("Could not load watermark.png — watermarking disabled: {}", e.getMessage());
        }
    }

    /**
     * Returns {@code true} if this MIME type can be watermarked.
     */
    public boolean supports(String mimeType) {
        return watermarkImage != null && WATERMARKABLE.contains(mimeType);
    }

    /**
     * Applies the watermark to {@code imageBytes} and returns the new bytes.
     * Falls back to the original bytes on any error.
     */
    public byte[] apply(byte[] imageBytes, String mimeType) {
        if (!supports(mimeType)) return imageBytes;

        try {
            BufferedImage source = ImageIO.read(new ByteArrayInputStream(imageBytes));
            if (source == null) return imageBytes;

            // Scale watermark proportionally to 25% of image width
            int wmWidth  = Math.max((int)(source.getWidth() * WATERMARK_WIDTH_RATIO), 80);
            int wmHeight = (int)((double) wmWidth / watermarkImage.getWidth() * watermarkImage.getHeight());
            BufferedImage scaledWm = Thumbnails.of(watermarkImage)
                .size(wmWidth, wmHeight)
                .asBufferedImage();

            // Create a copy of the source image to draw on
            BufferedImage combined = new BufferedImage(
                source.getWidth(), source.getHeight(),
                source.getType() == 0 ? BufferedImage.TYPE_INT_RGB : source.getType()
            );
            Graphics2D g = combined.createGraphics();
            g.drawImage(source, 0, 0, null);

            // Calculate position: bottom center, offset upward by BOTTOM_PADDING
            int x = (source.getWidth() - wmWidth) / 2;
            int y = source.getHeight() - wmHeight - BOTTOM_PADDING;
            g.setComposite(java.awt.AlphaComposite.getInstance(java.awt.AlphaComposite.SRC_OVER, 0.5f));
            g.drawImage(scaledWm, x, y, null);
            g.dispose();

            // Determine output format
            boolean isPng = "image/png".equals(mimeType);
            String format = isPng ? "png" : "jpeg";

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(combined, format, out);
            return out.toByteArray();

        } catch (Exception e) {
            log.warn("Watermarking failed — uploading original image: {}", e.getMessage());
            return imageBytes;
        }
    }
}
