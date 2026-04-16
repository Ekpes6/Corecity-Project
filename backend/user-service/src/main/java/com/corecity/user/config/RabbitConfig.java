package com.corecity.user.config;

import org.springframework.amqp.core.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {

    public static final String EXCHANGE           = "corecity.exchange";
    public static final String NOTIFICATION_QUEUE = "notification.queue";
    public static final String REPUTATION_QUEUE   = "reputation.queue";

    @Bean
    public TopicExchange corecityExchange() {
        return new TopicExchange(EXCHANGE);
    }

    @Bean
    public Queue notificationQueue() {
        return QueueBuilder.durable(NOTIFICATION_QUEUE).build();
    }

    @Bean
    public Binding notificationBinding(Queue notificationQueue, TopicExchange corecityExchange) {
        return BindingBuilder.bind(notificationQueue).to(corecityExchange).with("notification.#");
    }

    /** Separate queue for reputation events; binds to payment_success only. */
    @Bean
    public Queue reputationQueue() {
        return QueueBuilder.durable(REPUTATION_QUEUE).build();
    }

    @Bean
    public Binding reputationBinding(Queue reputationQueue, TopicExchange corecityExchange) {
        return BindingBuilder.bind(reputationQueue).to(corecityExchange).with("notification.payment_success");
    }
}
