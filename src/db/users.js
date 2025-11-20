const crypto = require('crypto');
const { db } = require('../db');

const findByIdStmt = db.prepare('SELECT * FROM users WHERE id = ?');
const findByUsernameStmt = db.prepare('SELECT * FROM users WHERE username = ?');
const insertUserStmt = db.prepare(
  'INSERT INTO users (username, password_hash, invited_by) VALUES (@username, @password_hash, @invited_by)'
);
const touchUserStmt = db.prepare("UPDATE users SET updated_at = datetime('now') WHERE id = ?");

const findInviteByTokenStmt = db.prepare(
  `SELECT ui.*, inviter.username AS inviter_username
   FROM user_invites ui
   LEFT JOIN users inviter ON inviter.id = ui.invited_by
   WHERE ui.token = ?`
);
const insertInviteStmt = db.prepare(
  'INSERT INTO user_invites (token, email, invited_by, expires_at) VALUES (@token, @email, @invited_by, @expires_at)'
);
const markInviteAcceptedStmt = db.prepare(
  "UPDATE user_invites SET accepted_at = datetime('now'), accepted_user_id = @user_id WHERE id = @id"
);

function toSafeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    invitedBy: row.invited_by,
    requiresPasswordChange: row.requires_password_change === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function findById(id) {
  const row = findByIdStmt.get(id);
  return row ? { ...row } : null;
}

function findByUsername(username) {
  const row = findByUsernameStmt.get(username);
  return row ? { ...row } : null;
}

function create({ username, passwordHash, invitedBy = null }) {
  const info = insertUserStmt.run({ username, password_hash: passwordHash, invited_by: invitedBy });
  touchUserStmt.run(info.lastInsertRowid);
  return toSafeUser(findByIdStmt.get(info.lastInsertRowid));
}

function createInvite({ email = null, invitedBy = null, expiresAt = null } = {}) {
  const token = crypto.randomBytes(24).toString('hex');
  insertInviteStmt.run({ token, email, invited_by: invitedBy, expires_at: expiresAt });
  return findInviteByToken(token);
}

function findInviteByToken(token) {
  const row = findInviteByTokenStmt.get(token);
  return row ? { ...row } : null;
}

const acceptInvite = db.transaction(({ token, username, passwordHash }) => {
  const invite = findInviteByToken(token);
  if (!invite) throw new Error('Invite not found');
  if (invite.accepted_at) throw new Error('Invite already used');
  if (invite.expires_at) {
    const expiresAt = new Date(invite.expires_at);
    if (!Number.isNaN(expiresAt.getTime()) && expiresAt < new Date()) {
      throw new Error('Invite expired');
    }
  }
  if (findByUsername(username)) throw new Error('Username already taken');

  const safeUser = create({ username, passwordHash, invitedBy: invite.invited_by });
  markInviteAcceptedStmt.run({ id: invite.id, user_id: safeUser.id });
  return {
    user: safeUser,
    invite: { ...invite, accepted_at: new Date().toISOString(), accepted_user_id: safeUser.id }
  };
});

function updatePassword(userId, newPasswordHash) {
  const stmt = db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?");
  stmt.run(newPasswordHash, userId);
}

function updateUsername(userId, newUsername) {
  // Check if username is already taken
  const existing = findByUsername(newUsername);
  if (existing && existing.id !== userId) {
    throw new Error('Username already taken');
  }
  const stmt = db.prepare("UPDATE users SET username = ?, updated_at = datetime('now') WHERE id = ?");
  stmt.run(newUsername, userId);
}

function clearPasswordChangeRequirement(userId) {
  const stmt = db.prepare("UPDATE users SET requires_password_change = 0, updated_at = datetime('now') WHERE id = ?");
  stmt.run(userId);
}

// Password reset token management
const findResetTokenStmt = db.prepare(
  `SELECT prt.*, u.username 
   FROM password_reset_tokens prt
   JOIN users u ON u.id = prt.user_id
   WHERE prt.token = ?`
);
const insertResetTokenStmt = db.prepare(
  'INSERT INTO password_reset_tokens (token, user_id, created_by, expires_at) VALUES (@token, @user_id, @created_by, @expires_at)'
);
const markResetTokenUsedStmt = db.prepare(
  "UPDATE password_reset_tokens SET used_at = datetime('now') WHERE id = ?"
);

function createPasswordResetToken({ userId, createdBy = null, expiresAt = null } = {}) {
  const token = crypto.randomBytes(24).toString('hex');
  insertResetTokenStmt.run({ token, user_id: userId, created_by: createdBy, expires_at: expiresAt });
  return findPasswordResetToken(token);
}

function findPasswordResetToken(token) {
  const row = findResetTokenStmt.get(token);
  return row ? { ...row } : null;
}

const usePasswordResetToken = db.transaction(({ token, newPasswordHash }) => {
  const resetToken = findPasswordResetToken(token);
  if (!resetToken) throw new Error('Reset token not found');
  if (resetToken.used_at) throw new Error('Reset token already used');
  if (resetToken.expires_at) {
    const expiresAt = new Date(resetToken.expires_at);
    if (!Number.isNaN(expiresAt.getTime()) && expiresAt < new Date()) {
      throw new Error('Reset token expired');
    }
  }

  updatePassword(resetToken.user_id, newPasswordHash);
  markResetTokenUsedStmt.run(resetToken.id);
  return {
    user: toSafeUser(findById(resetToken.user_id)),
    resetToken: { ...resetToken, used_at: new Date().toISOString() }
  };
});

module.exports = {
  db,
  findById,
  findByUsername,
  create,
  toSafeUser,
  updatePassword,
  updateUsername,
  clearPasswordChangeRequirement,
  invites: {
    create: createInvite,
    findByToken: findInviteByToken,
    accept: acceptInvite
  },
  passwordReset: {
    create: createPasswordResetToken,
    findByToken: findPasswordResetToken,
    use: usePasswordResetToken
  }
};
