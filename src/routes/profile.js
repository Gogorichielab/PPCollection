const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const users = require('../db/users');

router.get('/', requireAuth, (req, res) => {
  res.render('profile', { error: null, success: null });
});

router.post('/change-password', requireAuth, (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;

  if (!current_password) {
    return res.status(400).render('profile', { 
      error: 'Current password is required.', 
      success: null 
    });
  }

  if (!new_password) {
    return res.status(400).render('profile', { 
      error: 'New password is required.', 
      success: null 
    });
  }

  if (new_password !== confirm_password) {
    return res.status(400).render('profile', { 
      error: 'New passwords do not match.', 
      success: null 
    });
  }

  const user = users.findById(req.session.user.id);
  if (!user) {
    return res.status(404).render('profile', { 
      error: 'User not found.', 
      success: null 
    });
  }

  if (user.password !== current_password) {
    return res.status(401).render('profile', {
      error: 'Current password is incorrect.',
      success: null
    });
  }

  try {
    users.updatePassword(req.session.user.id, new_password);
    res.render('profile', {
      error: null,
      success: 'Password changed successfully!'
    });
  } catch (err) {
    res.status(500).render('profile', { 
      error: 'Failed to update password. Please try again.', 
      success: null 
    });
  }
});

module.exports = router;
