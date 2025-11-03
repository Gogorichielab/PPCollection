const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { adminUser, adminPasswordHash } = require('../config');
const { loginLimiter } = require('../middleware/rateLimiter');

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login', { error: null });
});

router.post('/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  // Use bcrypt to compare the password with the stored hash
  if (username === adminUser && bcrypt.compareSync(password, adminPasswordHash)) {
    req.session.user = { username };
    return res.redirect('/');
  }
  // Log failed login attempt
  // Note: Logging username helps identify attack patterns, but be aware this could
  // expose valid usernames in logs. For higher security environments, consider hashing
  // the username or using a generic message.
  // eslint-disable-next-line no-console
  console.warn(`Failed login attempt for username: ${username} from IP: ${req.ip}`);
  return res.status(401).render('login', { error: 'Invalid credentials' });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;

