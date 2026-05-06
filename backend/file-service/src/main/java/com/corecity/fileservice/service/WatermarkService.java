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
            BufferedImage loaded = ImageIO.read(is);
            if (loaded == null) {
                log.warn("watermark.png could not be decoded by ImageIO — watermarking disabled");
                return;
            }
            watermarkImage = loaded;
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

            // Build a dark silhouette of the watermark so the white logo is visible on
            // light backgrounds.  Strategy: fill a same-sized ARGB canvas with black, then
            // apply DstIn with the watermark alpha — gives us a pure-black mask with the
            // exact shape of the logo.
            BufferedImage shadow = new BufferedImage(
                scaledWm.getWidth(), scaledWm.getHeight(), BufferedImage.TYPE_INT_ARGB);
            Graphics2D sg = shadow.createGraphics();
            sg.setColor(java.awt.Color.BLACK);
            sg.fillRect(0, 0, shadow.getWidth(), shadow.getHeight());
            sg.setComposite(java.awt.AlphaComposite.DstIn);   // keep dst where src has alpha
            sg.drawImage(scaledWm, 0, 0, null);
            sg.dispose();

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

            // 1. Draw dark shadow slightly offset — creates contrast halo on bright areas
            int shadowOff = Math.max(2, wmWidth / 120);
            g.setComposite(java.awt.AlphaComposite.getInstance(java.awt.AlphaComposite.SRC_OVER, 0.65f));
            g.drawImage(shadow, x + shadowOff, y + shadowOff, null);

            // 2. Draw the white logo on top at high opacity
            g.setComposite(java.awt.AlphaComposite.getInstance(java.awt.AlphaComposite.SRC_OVER, 0.85f));
            g.drawImage(scaledWm, x, y, null);
            g.dispose();

            // Determine output format
            boolean isPng = "image/png".equals(mimeType);
            String format = isPng ? "png" : "jpeg";

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(combined, format, out);
            return out.toByteArray();

        } catch (Throwable e) {
            // Catch Throwable (not just Exception) so that native errors such as
            // UnsatisfiedLinkError thrown by Java2D on misconfigured Docker images
            // never propagate to the HTTP layer — the original image is uploaded instead.
            log.warn("Watermarking failed — uploading original image: {}", e.getMessage());
            return imageBytes;
        }
    }
}
