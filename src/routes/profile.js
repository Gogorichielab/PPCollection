const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const users = require('../db/users');

// Profile page
router.get('/', (req, res) => {
  res.render('profile/index', { error: null, success: null });
});

// Change password
router.post('/change-password', (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;
  
  // Validate inputs
  if (!current_password || !new_password || !confirm_password) {
    return res.status(400).render('profile/index', {
      error: 'All fields are required.',
      success: null
    });
  }
  
  if (new_password !== confirm_password) {
    return res.status(400).render('profile/index', {
      error: 'New passwords do not match.',
      success: null
    });
  }
  
  if (new_password.length < 6) {
    return res.status(400).render('profile/index', {
      error: 'New password must be at least 6 characters long.',
      success: null
    });
  }
  
  // Get current user from database
  const user = users.findById(req.session.user.id);
  if (!user) {
    return res.status(404).render('profile/index', {
      error: 'User not found.',
      success: null
    });
  }
  
  // Verify current password
  if (!bcrypt.compareSync(current_password, user.password_hash)) {
    return res.status(401).render('profile/index', {
      error: 'Current password is incorrect.',
      success: null
    });
  }
  
  // Update password
  try {
    const newPasswordHash = bcrypt.hashSync(new_password, 12);
    users.updatePassword(user.id, newPasswordHash);
    
    res.render('profile/index', {
      error: null,
      success: 'Password changed successfully!'
    });
  } catch (err) {
    res.status(500).render('profile/index', {
      error: 'Failed to update password. Please try again.',
      success: null
    });
  }
});

module.exports = router;
