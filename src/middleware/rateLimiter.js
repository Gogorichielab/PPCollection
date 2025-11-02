const rateLimit = require('express-rate-limit');

// Rate limiter for login attempts to prevent brute-force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  message: 'Too many login attempts from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip successful requests (only count failed login attempts)
  skipSuccessfulRequests: true,
  // Use a custom handler to render the login page with an error message
  handler: (req, res) => {
    res.status(429).render('login', { 
      error: 'Too many login attempts. Please try again after 15 minutes.' 
    });
  }
});

module.exports = { loginLimiter };
