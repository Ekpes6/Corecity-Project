package com.corecity.user.config;

import org.springframework.amqp.core.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {

    public static final String EXCHANGE = "corecity.exchange";
    public static final String NOTIFICATION_QUEUE = "notification.queue";

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
}
