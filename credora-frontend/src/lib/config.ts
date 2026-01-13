/**
 * Environment configuration with validation
 * Validates and exports environment variables for the application
 */

export interface EnvConfig {
  PYTHON_API_URL: string;
  JAVA_ENGINE_URL: string;
  NEXTAUTH_SECRET: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  config: Partial<EnvConfig>;
}

/**
 * Validates a URL string
 * @param url - The URL to validate
 * @returns true if the URL is valid, false otherwise
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== "string") {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validates a secret string
 * @param secret - The secret to validate
 * @returns true if the secret meets minimum requirements
 */
export function isValidSecret(secret: string): boolean {
  if (!secret || typeof secret !== "string") {
    return false;
  }
  // Secret must be at least 16 characters
  return secret.length >= 16;
}

/**
 * Validates environment variables and returns validation result
 * @param env - Object containing environment variables to validate
 * @returns ValidationResult with isValid flag, errors array, and partial config
 */
export function validateEnvConfig(env: Record<string, string | undefined>): ValidationResult {
  const errors: string[] = [];
  const config: Partial<EnvConfig> = {};

  // Validate PYTHON_API_URL
  const pythonApiUrl = env.PYTHON_API_URL;
  if (!pythonApiUrl) {
    errors.push("PYTHON_API_URL is required");
  } else if (!isValidUrl(pythonApiUrl)) {
    errors.push("PYTHON_API_URL must be a valid HTTP or HTTPS URL");
  } else {
    config.PYTHON_API_URL = pythonApiUrl;
  }

  // Validate JAVA_ENGINE_URL
  const javaEngineUrl = env.JAVA_ENGINE_URL;
  if (!javaEngineUrl) {
    errors.push("JAVA_ENGINE_URL is required");
  } else if (!isValidUrl(javaEngineUrl)) {
    errors.push("JAVA_ENGINE_URL must be a valid HTTP or HTTPS URL");
  } else {
    config.JAVA_ENGINE_URL = javaEngineUrl;
  }

  // Validate NEXTAUTH_SECRET
  const nextAuthSecret = env.NEXTAUTH_SECRET;
  if (!nextAuthSecret) {
    errors.push("NEXTAUTH_SECRET is required");
  } else if (!isValidSecret(nextAuthSecret)) {
    errors.push("NEXTAUTH_SECRET must be at least 16 characters");
  } else {
    config.NEXTAUTH_SECRET = nextAuthSecret;
  }

  return {
    isValid: errors.length === 0,
    errors,
    config,
  };
}

/**
 * Gets validated environment configuration
 * Throws an error if validation fails in production
 * @returns The validated environment configuration
 */
export function getEnvConfig(): EnvConfig {
  const result = validateEnvConfig({
    PYTHON_API_URL: process.env.PYTHON_API_URL,
    JAVA_ENGINE_URL: process.env.JAVA_ENGINE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  });

  if (!result.isValid) {
    const errorMessage = `Environment validation failed:\n${result.errors.join("\n")}`;
    
    // In development, log warning but continue with defaults
    if (process.env.NODE_ENV === "development") {
      console.warn(errorMessage);
      return {
        PYTHON_API_URL: process.env.PYTHON_API_URL || "http://localhost:8000",
        JAVA_ENGINE_URL: process.env.JAVA_ENGINE_URL || "http://localhost:8081",
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "development-secret-key",
      };
    }
    
    throw new Error(errorMessage);
  }

  return result.config as EnvConfig;
}

// Export singleton config instance
let configInstance: EnvConfig | null = null;

export function getConfig(): EnvConfig {
  if (!configInstance) {
    configInstance = getEnvConfig();
  }
  return configInstance;
}
