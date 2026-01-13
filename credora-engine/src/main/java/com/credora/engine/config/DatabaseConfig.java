package com.credora.engine.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.transaction.annotation.EnableTransactionManagement;

/**
 * Database configuration for the FP&A Engine.
 * 
 * Requirements: 1.1
 */
@Configuration
@EnableJpaRepositories(basePackages = "com.credora.engine.repositories")
@EnableTransactionManagement
public class DatabaseConfig {
    // Spring Boot auto-configures DataSource from application.yml
}
