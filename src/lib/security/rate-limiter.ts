/**
 * 🛡️ Rate Limiter — In-Memory with IP + Phone tracking
 * Protects against brute force, spam, and abuse
 */

interface RateLimitEntry {
  count: number;
  firstRequest: number;
  blockedUntil?: number;
}

// Store rate limits in memory (resets on server restart)
// For production scale: use Redis instead
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 10 minutes
const CLEANUP_INTERVAL = 10 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  
  lastCleanup = now;
  const entries = rateLimitStore.entries();
  for (const [key, entry] of entries) {
    // Remove entries older than 1 hour
    if (now - entry.firstRequest > 60 * 60 * 1000) {
      rateLimitStore.delete(key);
    }
  }
}

interface RateLimitConfig {
  /** Max requests allowed in the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Block duration in seconds after exceeding limit */
  blockDurationSeconds?: number;
  /** Custom identifier (defaults to IP) */
  identifier?: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
  totalRequests: number;
}

/**
 * Check if a request is within rate limits
 */
export function checkRateLimit(config: RateLimitConfig): RateLimitResult {
  cleanup();
  
  const { maxRequests, windowSeconds, blockDurationSeconds = 300, identifier = 'unknown' } = config;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const blockMs = blockDurationSeconds * 1000;
  
  const key = identifier;
  const entry = rateLimitStore.get(key);
  
  // Check if currently blocked
  if (entry?.blockedUntil && now < entry.blockedUntil) {
    const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: retryAfter,
      totalRequests: entry.count,
    };
  }
  
  // Reset if window expired
  if (!entry || now - entry.firstRequest > windowMs) {
    rateLimitStore.set(key, { count: 1, firstRequest: now });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      totalRequests: 1,
    };
  }
  
  // Increment counter
  entry.count++;
  
  // Check if exceeded limit
  if (entry.count > maxRequests) {
    entry.blockedUntil = now + blockMs;
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: blockDurationSeconds,
      totalRequests: entry.count,
    };
  }
  
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    totalRequests: entry.count,
  };
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

// ═══════════════════════════════════════
// 🎯 Pre-configured rate limiters
// ═══════════════════════════════════════

/** Login: 5 attempts per 15 minutes, block for 30 minutes */
export function checkLoginRateLimit(ip: string, phone?: string): RateLimitResult {
  // Check IP limit
  const ipResult = checkRateLimit({
    maxRequests: 10,
    windowSeconds: 15 * 60,
    blockDurationSeconds: 30 * 60,
    identifier: `login:ip:${ip}`,
  });
  
  if (!ipResult.allowed) return ipResult;
  
  // Also check phone limit if provided
  if (phone) {
    const phoneResult = checkRateLimit({
      maxRequests: 5,
      windowSeconds: 15 * 60,
      blockDurationSeconds: 30 * 60,
      identifier: `login:phone:${phone}`,
    });
    if (!phoneResult.allowed) return phoneResult;
  }
  
  return ipResult;
}

/** Registration: 3 accounts per hour per IP */
export function checkRegisterRateLimit(ip: string): RateLimitResult {
  return checkRateLimit({
    maxRequests: 3,
    windowSeconds: 60 * 60,
    blockDurationSeconds: 60 * 60,
    identifier: `register:ip:${ip}`,
  });
}

/** OTP: 5 requests per 10 minutes */
export function checkOTPRateLimit(ip: string, phone?: string): RateLimitResult {
  const ipResult = checkRateLimit({
    maxRequests: 10,
    windowSeconds: 10 * 60,
    blockDurationSeconds: 15 * 60,
    identifier: `otp:ip:${ip}`,
  });
  
  if (!ipResult.allowed) return ipResult;
  
  if (phone) {
    return checkRateLimit({
      maxRequests: 5,
      windowSeconds: 10 * 60,
      blockDurationSeconds: 15 * 60,
      identifier: `otp:phone:${phone}`,
    });
  }
  
  return ipResult;
}

/** Chat API: 60 messages per minute per user */
export function checkChatRateLimit(userId: string): RateLimitResult {
  return checkRateLimit({
    maxRequests: 60,
    windowSeconds: 60,
    blockDurationSeconds: 60,
    identifier: `chat:user:${userId}`,
  });
}

/** General API: 100 requests per minute per IP */
export function checkAPIRateLimit(ip: string): RateLimitResult {
  return checkRateLimit({
    maxRequests: 100,
    windowSeconds: 60,
    blockDurationSeconds: 120,
    identifier: `api:ip:${ip}`,
  });
}

/** Admin API: 200 requests per minute */
export function checkAdminRateLimit(ip: string): RateLimitResult {
  return checkRateLimit({
    maxRequests: 200,
    windowSeconds: 60,
    blockDurationSeconds: 60,
    identifier: `admin:ip:${ip}`,
  });
}

/** Content Generation: 5 requests per hour (expensive AI calls) */
export function checkContentGenRateLimit(ip: string): RateLimitResult {
  return checkRateLimit({
    maxRequests: 5,
    windowSeconds: 60 * 60,
    blockDurationSeconds: 30 * 60,
    identifier: `content:ip:${ip}`,
  });
}

/** Download: 20 downloads per hour */
export function checkDownloadRateLimit(userId: string): RateLimitResult {
  return checkRateLimit({
    maxRequests: 20,
    windowSeconds: 60 * 60,
    blockDurationSeconds: 30 * 60,
    identifier: `download:user:${userId}`,
  });
}
