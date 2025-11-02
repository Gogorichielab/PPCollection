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

module.exports = { loginLimiter };
