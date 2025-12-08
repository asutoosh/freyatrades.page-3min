/**
 * Configuration Management
 * 
 * Centralized, validated configuration from environment variables
 * Provides type-safe access to configuration with defaults
 */

import { sanitizeNumber } from './sanitizer'

/**
 * Parse and validate environment variable as number
 */
function getEnvNumber(
  key: string,
  defaultValue: number,
  options?: { min?: number; max?: number }
): number {
  const value = process.env[key]
  if (!value) return defaultValue
  
  return sanitizeNumber(value, {
    min: options?.min,
    max: options?.max,
    defaultValue,
  })
}

/**
 * Parse and validate environment variable as boolean
 */
function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key]
  if (!value) return defaultValue
  
  return value.toLowerCase() === 'true' || value === '1'
}

/**
 * Parse and validate environment variable as string
 */
function getEnvString(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue
}

/**
 * Parse comma-separated list from environment variable
 */
function getEnvList(key: string, defaultValue: string[] = []): string[] {
  const value = process.env[key]
  if (!value) return defaultValue
  
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

/**
 * Application Configuration
 * All configuration loaded from environment variables with validation
 */
export const config = {
  // Environment
  env: getEnvString('NODE_ENV', 'development') as 'development' | 'production' | 'test',
  
  // Security
  security: {
    adminApiKey: getEnvString('ADMIN_API_KEY', ''),
    ingestApiKey: getEnvString('INGEST_API_KEY', ''),
    debugEndpointsEnabled: getEnvBoolean('DEBUG_ENDPOINTS_ENABLED', false),
    rateLimitEnabled: getEnvBoolean('RATE_LIMIT_ENABLED', true),
    allowedOrigins: getEnvList('ALLOWED_ORIGINS', []),
  },
  
  // Database
  database: {
    connectionString: getEnvString('AZURE_COSMOS_CONNECTION_STRING', '') ||
                     getEnvString('AZURE_COSMOS_CONNECTIONSTRING', '') ||
                     getEnvString('MONGODB_URI', ''),
    dbName: getEnvString('AZURE_COSMOS_DB_NAME', 'freyatrades'),
  },
  
  // IP Detection
  ipDetection: {
    apiKeys: getEnvList('IP2LOCATION_API_KEY', []),
    restrictedCountries: getEnvList('RESTRICTED_COUNTRIES', ['IN']),
  },
  
  // Preview Settings
  preview: {
    durationSeconds: getEnvNumber('PREVIEW_DURATION_SECONDS', 180, { min: 60, max: 600 }),
    timeConsumedThreshold: getEnvNumber('TIME_CONSUMED_THRESHOLD', 60, { min: 30, max: 180 }),
  },
  
  // VPN Settings
  vpn: {
    maxRetries: getEnvNumber('VPN_MAX_RETRIES', 5, { min: 1, max: 20 }),
    retryWindowHours: getEnvNumber('VPN_RETRY_WINDOW_HOURS', 2, { min: 1, max: 24 }),
  },
  
  // External Links (client-side accessible)
  externalLinks: {
    telegram: getEnvString('NEXT_PUBLIC_TRIAL_TELEGRAM_URL', 'https://t.me/your_preview_hub'),
    whop: getEnvString('NEXT_PUBLIC_TRIAL_WHOP_URL', 'https://whop.com/your-whop-product'),
    innerCircle: getEnvString('NEXT_PUBLIC_INNER_CIRCLE_URL', 'https://your-inner-circle-link'),
  },
  
  // Rate Limiting
  rateLimit: {
    admin: { requests: 10, windowMs: 60 * 1000 },
    public: { requests: 60, windowMs: 60 * 1000 },
    ingest: { requests: 100, windowMs: 60 * 1000 },
    signals: { requests: 30, windowMs: 60 * 1000 },
  },
}

/**
 * Validate critical configuration
 * Throws error if required configuration is missing in production
 * In development, returns warnings but doesn't fail
 */
export function validateConfig(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Collect validation issues
  const issues: string[] = []
  
  // Database validation
  if (!config.database.connectionString) {
    issues.push('Database connection string required (AZURE_COSMOS_CONNECTION_STRING or MONGODB_URI)')
  }
  
  // API keys validation
  if (!config.security.adminApiKey || config.security.adminApiKey.length < 32) {
    issues.push('ADMIN_API_KEY must be set and at least 32 characters')
  }
  
  if (!config.security.ingestApiKey || config.security.ingestApiKey.length < 32) {
    issues.push('INGEST_API_KEY must be set and at least 32 characters')
  }
  
  // IP detection API keys validation
  if (config.ipDetection.apiKeys.length === 0) {
    issues.push('IP2LOCATION_API_KEY must be set')
  }
  
  // In production, all issues are errors
  // In development, all issues are warnings
  if (config.env === 'production') {
    errors.push(...issues)
  } else {
    warnings.push(...issues)
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Check if configuration is valid
 * Throws in production, warns in development
 */
export function checkConfig(): void {
  const { valid, errors, warnings } = validateConfig()
  
  // Show errors (production only)
  if (errors.length > 0) {
    console.error('❌ Configuration validation failed:')
    errors.forEach(error => console.error(`  - ${error}`))
    throw new Error('Configuration validation failed. See errors above.')
  }
  
  // Show warnings (development only)
  if (warnings.length > 0) {
    console.warn('⚠️  Configuration warnings (development mode):')
    warnings.forEach(warning => console.warn(`  - ${warning}`))
  }
  
  if (valid && warnings.length === 0) {
    console.log('✅ Configuration validated successfully')
  }
}

/**
 * Get configuration summary (safe for logging)
 * Excludes sensitive values
 */
export function getConfigSummary(): Record<string, any> {
  return {
    env: config.env,
    database: {
      configured: !!config.database.connectionString,
      dbName: config.database.dbName,
    },
    security: {
      adminApiKeySet: !!config.security.adminApiKey,
      adminApiKeyLength: config.security.adminApiKey.length,
      ingestApiKeySet: !!config.security.ingestApiKey,
      ingestApiKeyLength: config.security.ingestApiKey.length,
      rateLimitEnabled: config.security.rateLimitEnabled,
      debugEndpointsEnabled: config.security.debugEndpointsEnabled,
      allowedOrigins: config.security.allowedOrigins.length,
    },
    ipDetection: {
      apiKeysConfigured: config.ipDetection.apiKeys.length,
      restrictedCountries: config.ipDetection.restrictedCountries,
    },
    preview: config.preview,
    vpn: config.vpn,
  }
}
