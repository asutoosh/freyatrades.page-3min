/**
 * Structured Logging Utility
 * 
 * Provides consistent, structured logging across the application
 * Prevents sensitive data exposure and enables better log analysis
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, any>
  requestId?: string
}

/**
 * Sensitive field patterns to redact from logs
 */
const SENSITIVE_PATTERNS = [
  /api[_-]?key/i,
  /token/i,
  /password/i,
  /secret/i,
  /auth/i,
  /authorization/i,
  /bearer/i,
  /jwt/i,
  /session/i,
  /cookie/i,
  /credential/i,
  /connection[_-]?string/i,
  /private[_-]?key/i,
  /access[_-]?key/i,
]

/**
 * Redact sensitive information from log context
 */
function redactSensitive(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitive(item))
  }
  
  const redacted: any = {}
  
  for (const [key, value] of Object.entries(obj)) {
    const isSensitive = SENSITIVE_PATTERNS.some(pattern => pattern.test(key))
    
    if (isSensitive) {
      redacted[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitive(value)
    } else {
      redacted[key] = value
    }
  }
  
  return redacted
}

class Logger {
  private requestId?: string
  
  setRequestId(requestId: string) {
    this.requestId = requestId
  }
  
  clearRequestId() {
    this.requestId = undefined
  }
  
  private log(level: LogLevel, message: string, context?: Record<string, any>) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      requestId: this.requestId,
    }
    
    if (context) {
      entry.context = redactSensitive(context)
    }
    
    // In production, output structured JSON logs
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(entry))
    } else {
      // In development, output human-readable logs
      const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`
      const reqId = this.requestId ? ` [${this.requestId}]` : ''
      const ctx = context ? ` ${JSON.stringify(entry.context, null, 2)}` : ''
      
      switch (level) {
        case 'error':
          console.error(`${prefix}${reqId} ${message}${ctx}`)
          break
        case 'warn':
          console.warn(`${prefix}${reqId} ${message}${ctx}`)
          break
        default:
          console.log(`${prefix}${reqId} ${message}${ctx}`)
      }
    }
  }
  
  /**
   * Debug level - detailed information for debugging
   * Only logged in development mode
   */
  debug(message: string, context?: Record<string, any>) {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, context)
    }
  }
  
  /**
   * Info level - general informational messages
   */
  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context)
  }
  
  /**
   * Warn level - warning messages that don't require immediate action
   */
  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context)
  }
  
  /**
   * Error level - error messages that require attention
   */
  error(message: string, context?: Record<string, any>) {
    this.log('error', message, context)
  }
  
  /**
   * Security event logging - for audit trail
   */
  security(event: string, context?: Record<string, any>) {
    this.log('warn', `[SECURITY] ${event}`, context)
  }
  
  /**
   * API request logging
   */
  apiRequest(method: string, path: string, context?: Record<string, any>) {
    this.log('info', `${method} ${path}`, context)
  }
  
  /**
   * API response logging
   */
  apiResponse(method: string, path: string, status: number, duration?: number) {
    const context: Record<string, any> = { status }
    if (duration !== undefined) {
      context.duration = `${duration}ms`
    }
    this.log('info', `${method} ${path} - ${status}`, context)
  }
  
  /**
   * Database operation logging
   */
  dbOperation(operation: string, collection: string, context?: Record<string, any>) {
    this.log('debug', `DB: ${operation} on ${collection}`, context)
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger()

/**
 * Create a child logger with a specific request ID
 * Useful for tracking logs across a single request
 */
export function createRequestLogger(requestId: string): Logger {
  const childLogger = new Logger()
  childLogger.setRequestId(requestId)
  return childLogger
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
