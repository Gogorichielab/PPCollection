const express = require('express');
const router = express.Router();
const { adminUser, adminPass } = require('../config');
const { loginLimiter } = require('../middleware/rateLimiter');

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login', { error: null });
});

router.post('/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  if (username === adminUser && password === adminPass) {
    req.session.user = { username };
    return res.redirect('/');
  }
  // Log failed login attempt
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

