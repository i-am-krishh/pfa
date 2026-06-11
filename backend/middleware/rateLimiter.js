/**
 * Custom In-Memory Rate Limiter Middleware
 * @param {Object} options - Configuration options
 * @param {number} options.windowMs - Time window in milliseconds (default: 15 minutes)
 * @param {number} options.max - Max number of requests allowed in windowMs (default: 100)
 * @param {string} options.message - Error message to return when rate limit is exceeded
 */
export const rateLimiter = (options = {}) => {
    const rateLimiters = new Map();
    const { 
        windowMs = 15 * 60 * 1000, 
        max = 100, 
        message = 'Too many requests from this IP, please try again later.' 
    } = options;
    
    return (req, res, next) => {
        // Retrieve client IP address
        const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
        const now = Date.now();
        
        if (!rateLimiters.has(ip)) {
            rateLimiters.set(ip, { count: 1, resetTime: now + windowMs });
            return next();
        }
        
        const clientLimiter = rateLimiters.get(ip);
        
        // If the window has expired, reset the client's rate limit count and resetTime
        if (now > clientLimiter.resetTime) {
            clientLimiter.count = 1;
            clientLimiter.resetTime = now + windowMs;
            return next();
        }
        
        clientLimiter.count += 1;
        
        // Check if count exceeds max
        if (clientLimiter.count > max) {
            // Set rate limit headers
            res.setHeader('Retry-After', Math.ceil((clientLimiter.resetTime - now) / 1000));
            return res.status(429).json({ 
                success: false, 
                message 
            });
        }
        
        next();
    };
};
