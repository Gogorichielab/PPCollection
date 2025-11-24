const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const users = require('../db/users');
const { loginLimiter, passwordResetTokenLimiter } = require('../middleware/rateLimiter');

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login', { error: null });
});

router.post('/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  const user = users.findByUsername(username);
  if (user && user.password === password) {
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

// First-time login credential change
router.get('/change-credentials', requireAuth, (req, res) => {
  if (!req.session.user.requiresPasswordChange) {
    return res.redirect('/');
  }
  res.render('auth/change-credentials', { 
    error: null, 
    currentUsername: req.session.user.username,
    values: { username: req.session.user.username }
  });
});

router.post('/change-credentials', requireAuth, (req, res) => {
  if (!req.session.user.requiresPasswordChange) {
    return res.redirect('/');
  }

  const { username, password, confirm_password: confirmPassword } = req.body;
  const values = { username: username || '' };

  if (!username || username.trim() === '') {
    return res.status(400).render('auth/change-credentials', {
      error: 'Username is required.',
      currentUsername: req.session.user.username,
      values
    });
  }

  if (!password || password.length < 8) {
    return res.status(400).render('auth/change-credentials', {
      error: 'Password must be at least 8 characters long.',
      currentUsername: req.session.user.username,
      values
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).render('auth/change-credentials', {
      error: 'Passwords do not match.',
      currentUsername: req.session.user.username,
      values
    });
  }

  try {
    const userId = req.session.user.id;

    // Update username if changed
    if (username !== req.session.user.username) {
      users.updateUsername(userId, username);
    }

    // Update password
    users.updatePassword(userId, password);

    // Clear the password change requirement
    users.clearPasswordChangeRequirement(userId);

    // Refresh session user data
    const updatedUser = users.findById(userId);
    req.session.user = users.toSafeUser(updatedUser);

    return res.redirect('/library');
  } catch (err) {
    return res.status(400).render('auth/change-credentials', {
      error: err.message,
      currentUsername: req.session.user.username,
      values
    });
  }
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
    const { user } = users.invites.accept({ token, username, password });
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

// Password reset token generation
// Note: Protected with requireAuth. In this self-hosted environment, any authenticated
// user can generate password reset tokens, similar to how any user can create invites.
// For stricter access control in multi-tenant scenarios, consider adding an admin role check.
router.get('/password-reset-token', requireAuth, passwordResetTokenLimiter, (req, res) => {
  const allUsers = users.db.prepare('SELECT id, username FROM users ORDER BY username').all();
  res.render('auth/password-reset-token', { 
    error: null, 
    resetToken: null, 
    resetLink: null, 
    users: allUsers,
    values: {} 
  });
});

router.post('/password-reset-token', requireAuth, passwordResetTokenLimiter, (req, res) => {
  const allUsers = users.db.prepare('SELECT id, username FROM users ORDER BY username').all();
  const { user_id: userIdRaw, expires_in_hours: expiresInHoursRaw } = req.body;
  const values = { user_id: userIdRaw || '', expires_in_hours: expiresInHoursRaw };

  let resetToken = null;
  try {
    const userId = Number(userIdRaw);
    if (!userId || Number.isNaN(userId)) {
      throw new Error('Please select a user.');
    }

    const targetUser = users.findById(userId);
    if (!targetUser) {
      throw new Error('User not found.');
    }

    let expiresAt = null;
    if (expiresInHoursRaw) {
      const expiresInHours = Number(expiresInHoursRaw);
      if (Number.isNaN(expiresInHours) || expiresInHours <= 0) {
        throw new Error('Expiration must be a positive number of hours.');
      }
      expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();
    }

    resetToken = users.passwordReset.create({ 
      userId, 
      createdBy: req.session.user.id, 
      expiresAt 
    });
    const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken.token}`;
    res.render('auth/password-reset-token', { 
      error: null, 
      resetToken, 
      resetLink, 
      users: allUsers,
      values: {} 
    });
  } catch (err) {
    res.status(400).render('auth/password-reset-token', { 
      error: err.message, 
      resetToken, 
      resetLink: null, 
      users: allUsers,
      values 
    });
  }
});

// Password reset (user-facing)
router.get('/reset-password', (req, res) => {
  if (req.session.user) return res.redirect('/');
  const { token } = req.query;
  
  if (!token) {
    return res.status(400).render('auth/reset-password', {
      error: 'A password reset token is required.',
      resetToken: null,
      token: '',
      values: {}
    });
  }

  const resetToken = users.passwordReset.findByToken(token);
  if (!resetToken) {
    return res.status(404).render('auth/reset-password', {
      error: 'Password reset token not found. Please request a new one.',
      resetToken: null,
      token,
      values: {}
    });
  }

  if (resetToken.used_at) {
    return res.status(410).render('auth/reset-password', {
      error: 'This password reset token has already been used.',
      resetToken,
      token,
      values: {}
    });
  }

  if (resetToken.expires_at) {
    const expiresAt = new Date(resetToken.expires_at);
    if (!Number.isNaN(expiresAt.getTime()) && expiresAt < new Date()) {
      return res.status(410).render('auth/reset-password', {
        error: 'This password reset token has expired. Please request a new one.',
        resetToken,
        token,
        values: {}
      });
    }
  }

  res.render('auth/reset-password', { 
    error: null, 
    resetToken, 
    token,
    values: {} 
  });
});

router.post('/reset-password', loginLimiter, (req, res) => {
  if (req.session.user) return res.redirect('/');

  const { token, password, confirm_password: confirmPassword } = req.body;

  if (!token) {
    return res.status(400).render('auth/reset-password', {
      error: 'Password reset token is required.',
      resetToken: null,
      token: '',
      values: {}
    });
  }

  const resetToken = users.passwordReset.findByToken(token);
  if (!resetToken) {
    return res.status(404).render('auth/reset-password', {
      error: 'Password reset token not found. Please request a new one.',
      resetToken: null,
      token,
      values: {}
    });
  }

  if (resetToken.used_at) {
    return res.status(410).render('auth/reset-password', {
      error: 'This password reset token has already been used.',
      resetToken,
      token,
      values: {}
    });
  }

  if (resetToken.expires_at) {
    const expiresAt = new Date(resetToken.expires_at);
    if (!Number.isNaN(expiresAt.getTime()) && expiresAt < new Date()) {
      return res.status(410).render('auth/reset-password', {
        error: 'This password reset token has expired. Please request a new one.',
        resetToken,
        token,
        values: {}
      });
    }
  }

  if (!password) {
    return res.status(400).render('auth/reset-password', {
      error: 'Password is required.',
      resetToken,
      token,
      values: {}
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).render('auth/reset-password', {
      error: 'Passwords do not match.',
      resetToken,
      token,
      values: {}
    });
  }

  try {
    const { user } = users.passwordReset.use({ token, newPassword: password });
    req.session.user = user;
    return res.redirect('/');
  } catch (err) {
    return res.status(400).render('auth/reset-password', {
      error: err.message,
      resetToken,
      token,
      values: {}
    });
  }
});

module.exports = router;

