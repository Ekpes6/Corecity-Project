package com.corecity.notification.listener;

import com.corecity.notification.service.EmailService;
import com.corecity.notification.service.TermiiSmsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.Locale;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationEventListener {

    private final EmailService emailService;
    private final TermiiSmsService smsService;

    private static final NumberFormat NGN_FORMAT = NumberFormat.getInstance(new Locale("en", "NG"));

    @RabbitListener(queues = "notification.queue", condition = "headers['type'] == 'WELCOME'")
    public void handleWelcomeEvent(Map<String, Object> event) {
        String email     = (String) event.get("email");
        String name      = (String) event.get("name");
        String phone     = (String) event.getOrDefault("phone", "");

        if (email != null) emailService.sendWelcome(email, name);
        if (!phone.isBlank()) {
            smsService.sendSms(phone,
                "Welcome to corecity! Find your dream home or list your property at corecity.com.ng");
        }
    }

    @RabbitListener(queues = "notification.queue", condition = "headers['type'] == 'PAYMENT_SUCCESS'")
    public void handlePaymentSuccessEvent(Map<String, Object> event) {
        String reference     = (String) event.get("reference");
        Object amountObj     = event.get("amount");
        String propertyTitle = (String) event.getOrDefault("propertyTitle", "your property");

        String amountStr = "₦0";
        if (amountObj instanceof BigDecimal bd) {
            amountStr = "₦" + NGN_FORMAT.format(bd);
        } else if (amountObj instanceof Number n) {
            amountStr = "₦" + NGN_FORMAT.format(n.doubleValue());
        }

        // Notify buyer
        String buyerEmail = (String) event.getOrDefault("buyerEmail", "");
        String buyerName  = (String) event.getOrDefault("buyerName", "Customer");
        String buyerPhone = (String) event.getOrDefault("buyerPhone", "");
        if (!buyerEmail.isBlank())
            emailService.sendPaymentSuccess(buyerEmail, buyerName, amountStr, reference, propertyTitle);
        if (!buyerPhone.isBlank())
            smsService.sendSms(buyerPhone,
                String.format("corecity: Payment of %s confirmed. Ref: %s. Thank you!", amountStr, reference));

        // Notify seller
        String sellerEmail = (String) event.getOrDefault("sellerEmail", "");
        String sellerPhone = (String) event.getOrDefault("sellerPhone", "");
        if (!sellerEmail.isBlank())
            emailService.sendPaymentSuccess(sellerEmail, (String) event.getOrDefault("sellerName", "Seller"),
                amountStr, reference, propertyTitle);
        if (!sellerPhone.isBlank())
            smsService.sendSms(sellerPhone,
                String.format("corecity: You received a payment of %s for %s. Ref: %s",
                    amountStr, propertyTitle, reference));
    }

    @RabbitListener(queues = "notification.queue", condition = "headers['type'] == 'NEW_ENQUIRY'")
    public void handleNewEnquiryEvent(Map<String, Object> event) {
        String agentEmail    = (String) event.getOrDefault("agentEmail", "");
        String agentName     = (String) event.getOrDefault("agentName", "Agent");
        String propertyTitle = (String) event.getOrDefault("propertyTitle", "your property");
        String senderName    = (String) event.getOrDefault("senderName", "A buyer");
        String agentPhone    = (String) event.getOrDefault("agentPhone", "");

        if (!agentEmail.isBlank())
            emailService.sendNewEnquiry(agentEmail, agentName, propertyTitle, senderName);
        if (!agentPhone.isBlank())
            smsService.sendSms(agentPhone,
                String.format("corecity: %s sent an enquiry about \"%s\". Login to respond.",
                    senderName, propertyTitle));
    }

    @RabbitListener(queues = "notification.queue", condition = "headers['type'] == 'LISTING_APPROVED'")
    public void handleListingApprovedEvent(Map<String, Object> event) {
        String email = (String) event.getOrDefault("ownerEmail", "");
        String title = (String) event.getOrDefault("propertyTitle", "Your listing");
        String phone = (String) event.getOrDefault("ownerPhone", "");
        if (!email.isBlank())
            emailService.sendTemplatedEmail(email, "Your listing is now live! — corecity", "listing-approved",
                Map.of("propertyTitle", title));
        if (!phone.isBlank())
            smsService.sendSms(phone,
                String.format("corecity: \"%s\" is now live on corecity.com.ng! Share the link.", title));
    }
}
