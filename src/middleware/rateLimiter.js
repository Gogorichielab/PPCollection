const rateLimit = require('express-rate-limit');

const LOGIN_RATE_LIMIT_MESSAGE = 'Too many login attempts. Please try again after 15 minutes.';

// Rate limiter for login attempts to prevent brute-force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip successful requests (only count failed login attempts)
  skipSuccessfulRequests: true,
  // Use a custom handler to render the login page with an error message
  handler: (req, res) => {
    res.status(429).render('login', { 
      error: LOGIN_RATE_LIMIT_MESSAGE
    });
  }
});

// Rate limiter for password reset token generation to prevent abuse
const passwordResetTokenLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 token generation requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many password reset token requests. Please try again later.'
});

module.exports = { loginLimiter, passwordResetTokenLimiter };
