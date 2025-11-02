const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { adminUser, adminPasswordHash } = require('../config');

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login', { error: null });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  // Use bcrypt to compare the password with the stored hash
  if (username === adminUser && bcrypt.compareSync(password, adminPasswordHash)) {
    req.session.user = { username };
    return res.redirect('/');
  }
  return res.status(401).render('login', { error: 'Invalid credentials' });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;

