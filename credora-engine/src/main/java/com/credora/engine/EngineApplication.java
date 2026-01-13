package com.credora.engine;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Credora FP&A Engine Application.
 * 
 * Spring Boot entry point for the Java DSA engine that provides
 * financial calculations via REST API.
 * 
 * Requirements: 8.1, 8.4
 */
@SpringBootApplication
public class EngineApplication {

    public static void main(String[] args) {
        SpringApplication.run(EngineApplication.class, args);
    }
}
