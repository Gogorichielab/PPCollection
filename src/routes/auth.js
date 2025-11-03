const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { requireAuth } = require('../middleware/auth');
const users = require('../db/users');
const { loginLimiter } = require('../middleware/rateLimiter');

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login', { error: null });
});

router.post('/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  const user = users.findByUsername(username);
  if (user && bcrypt.compareSync(password, user.password_hash)) {
    req.session.user = users.toSafeUser(user);
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

router.get('/invite', requireAuth, (req, res) => {
  res.render('auth/invite', { error: null, invite: null, inviteLink: null, values: {} });
});

router.post('/invite', requireAuth, (req, res) => {
  const { email, expires_in_days: expiresInDaysRaw } = req.body;
  const values = { email: email || '', expires_in_days: expiresInDaysRaw };

  let invite = null;
  try {
    let expiresAt = null;
    if (expiresInDaysRaw) {
      const expiresInDays = Number(expiresInDaysRaw);
      if (Number.isNaN(expiresInDays) || expiresInDays <= 0) {
        throw new Error('Expiration must be a positive number of days.');
      }
      expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();
    }
    invite = users.invites.create({ email: email || null, invitedBy: req.session.user.id, expiresAt });
    const inviteLink = `${req.protocol}://${req.get('host')}/register?token=${invite.token}`;
    res.render('auth/invite', { error: null, invite, inviteLink, values: {} });
  } catch (err) {
    res.status(400).render('auth/invite', { error: err.message, invite, inviteLink: null, values });
  }
});

function renderRegister(res, options = {}) {
  const defaults = { error: null, invite: null, token: '', values: {} };
  res.render('auth/register', { ...defaults, ...options });
}

router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/');
  const { token } = req.query;
  if (!token) {
    return res.status(400).render('auth/register', {
      error: 'An invite token is required to register.',
      invite: null,
      token: '',
      values: {}
    });
  }

  const invite = users.invites.findByToken(token);
  if (!invite) {
    return res.status(404).render('auth/register', {
      error: 'Invite not found. Please request a new invitation.',
      invite: null,
      token,
      values: {}
    });
  }

  if (invite.accepted_at) {
    return res.status(410).render('auth/register', {
      error: 'This invite has already been used.',
      invite,
      token,
      values: {}
    });
  }

  if (invite.expires_at) {
    const expiresAt = new Date(invite.expires_at);
    if (!Number.isNaN(expiresAt.getTime()) && expiresAt < new Date()) {
      return res.status(410).render('auth/register', {
        error: 'This invite has expired. Please request a new one.',
        invite,
        token,
        values: {}
      });
    }
  }

  renderRegister(res, { invite, token });
});

router.post('/register', loginLimiter, (req, res) => {
  if (req.session.user) return res.redirect('/');

  const { token, username, password, confirm_password: confirmPassword } = req.body;
  const values = { username: username || '' };

  if (!token) {
    return res.status(400).render('auth/register', {
      error: 'Invite token is required.',
      invite: null,
      token: '',
      values
    });
  }

  const invite = users.invites.findByToken(token);
  if (!invite) {
    return res.status(404).render('auth/register', {
      error: 'Invite not found. Please request a new invitation.',
      invite: null,
      token,
      values
    });
  }

  if (invite.accepted_at) {
    return res.status(410).render('auth/register', {
      error: 'This invite has already been used.',
      invite,
      token,
      values
    });
  }

  if (invite.expires_at) {
    const expiresAt = new Date(invite.expires_at);
    if (!Number.isNaN(expiresAt.getTime()) && expiresAt < new Date()) {
      return res.status(410).render('auth/register', {
        error: 'This invite has expired. Please request a new one.',
        invite,
        token,
        values
      });
    }
  }

  if (!username) {
    return res.status(400).render('auth/register', {
      error: 'Username is required.',
      invite,
      token,
      values
    });
  }

  if (!password) {
    return res.status(400).render('auth/register', {
      error: 'Password is required.',
      invite,
      token,
      values
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).render('auth/register', {
      error: 'Passwords do not match.',
      invite,
      token,
      values
    });
  }

  try {
    const passwordHash = bcrypt.hashSync(password, 12);
    const { user } = users.invites.accept({ token, username, passwordHash });
    req.session.user = user;
    return res.redirect('/');
  } catch (err) {
    return res.status(400).render('auth/register', {
      error: err.message,
      invite,
      token,
      values
    });
  }
});

module.exports = router;

