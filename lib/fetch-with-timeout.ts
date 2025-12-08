/**
 * Fetch with Timeout Utility
 * 
 * Adds timeout capability to fetch requests to prevent hanging requests
 * Automatically cleans up timers and abort controllers
 */

export class FetchTimeoutError extends Error {
  constructor(message: string = 'Request timeout') {
    super(message)
    this.name = 'FetchTimeoutError'
  }
}

export interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number
}

/**
 * Fetch with automatic timeout
 * @param url - URL to fetch
 * @param options - Fetch options with optional timeout (default: 10000ms)
 * @returns Promise<Response>
 * @throws FetchTimeoutError if request times out
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeout = 10000, ...fetchOptions } = options
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)
    return response
  } catch (error: any) {
    clearTimeout(timeoutId)
    
    // Detect abort/timeout errors
    if (error.name === 'AbortError') {
      throw new FetchTimeoutError(`Request to ${url} timed out after ${timeout}ms`)
    }
    
    throw error
  }
}

/**
 * Fetch JSON with timeout and error handling
 * @param url - URL to fetch
 * @param options - Fetch options with optional timeout
 * @returns Promise<T> parsed JSON response
 */
export async function fetchJSON<T = any>(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<T> {
  const response = await fetchWithTimeout(url, {
    ...options,
    headers: {
      'Accept': 'application/json',
      ...options.headers,
    },
  })
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Retry fetch with exponential backoff
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Promise<Response>
 */
export async function fetchWithRetry(
  url: string,
  options: FetchWithTimeoutOptions = {},
  maxRetries: number = 3
): Promise<Response> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options)
      
      // Don't retry on client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        return response
      }
      
      // Retry on server errors (5xx) or network errors
      if (response.status >= 500 && attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      return response
    } catch (error: any) {
      lastError = error
      
      // Don't retry on timeout if this was the last attempt
      if (attempt === maxRetries) {
        throw error
      }
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError || new Error('Max retries exceeded')
}
