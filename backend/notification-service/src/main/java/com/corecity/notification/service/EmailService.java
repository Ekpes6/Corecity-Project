package com.corecity.notification.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import jakarta.mail.internet.MimeMessage;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;

    @Value("${spring.mail.username:noreply@corecity.com.ng}")
    private String fromAddress;

    public void sendTemplatedEmail(String to, String subject, String template, Map<String, Object> vars) {
        try {
            Context ctx = new Context();
            vars.forEach(ctx::setVariable);
            String htmlBody = templateEngine.process(template, ctx);

            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(fromAddress, "corecity Nigeria");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(msg);
            log.info("Email sent → {} subject: {}", to, subject);
        } catch (Exception e) {
            log.error("Email failed → {}: {}", to, e.getMessage());
        }
    }

    public void sendWelcome(String to, String firstName) {
        sendTemplatedEmail(to, "Welcome to corecity Nigeria 🏠", "welcome",
            Map.of("firstName", firstName, "loginUrl", "https://corecity.com.ng/login"));
    }

    public void sendPaymentSuccess(String to, String firstName, String amount, String reference, String propertyTitle) {
        sendTemplatedEmail(to, "Payment Confirmed — corecity", "payment-success",
            Map.of("firstName", firstName, "amount", amount,
                   "reference", reference, "propertyTitle", propertyTitle));
    }

    public void sendNewEnquiry(String to, String agentName, String propertyTitle, String senderName) {
        sendTemplatedEmail(to, "New Enquiry on " + propertyTitle + " — corecity", "new-enquiry",
            Map.of("agentName", agentName, "propertyTitle", propertyTitle, "senderName", senderName));
    }
}
