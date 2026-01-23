// API Error handling utilities

export class ApiError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly isRetryable: boolean

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isRetryable: boolean = false
  ) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
    this.isRetryable = isRetryable

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, ApiError)
    }
  }

  static notFound(message: string = 'Resource not found'): ApiError {
    return new ApiError(message, 404, 'NOT_FOUND', false)
  }

  static unauthorized(message: string = 'Unauthorized'): ApiError {
    return new ApiError(message, 401, 'UNAUTHORIZED', false)
  }

  static forbidden(message: string = 'Forbidden'): ApiError {
    return new ApiError(message, 403, 'FORBIDDEN', false)
  }

  static badRequest(message: string = 'Bad request'): ApiError {
    return new ApiError(message, 400, 'BAD_REQUEST', false)
  }

  static rateLimited(message: string = 'Too many requests'): ApiError {
    return new ApiError(message, 429, 'RATE_LIMITED', true)
  }

  static serviceUnavailable(message: string = 'Service unavailable'): ApiError {
    return new ApiError(message, 503, 'SERVICE_UNAVAILABLE', true)
  }

  static timeout(message: string = 'Request timeout'): ApiError {
    return new ApiError(message, 504, 'TIMEOUT', true)
  }
}

interface RetryOptions {
  maxAttempts?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
  shouldRetry?: (error: unknown) => boolean
}

const defaultRetryOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  shouldRetry: (error: unknown) => {
    if (error instanceof ApiError) {
      return error.isRetryable
    }
    return false
  },
}

/**
 * Execute an async function with exponential backoff retry
 * @param fn - The async function to execute
 * @param options - Retry options
 * @returns The result of the function
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultRetryOptions, ...options }
  let lastError: unknown

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (attempt === opts.maxAttempts || !opts.shouldRetry(error)) {
        throw error
      }

      const delay = Math.min(
        opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelayMs
      )

      console.warn(
        `Attempt ${attempt} failed, retrying in ${delay}ms...`,
        error instanceof Error ? error.message : error
      )

      await sleep(delay)
    }
  }

  throw lastError
}

/**
 * Sleep for a specified duration
 * @param ms - Duration in milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
