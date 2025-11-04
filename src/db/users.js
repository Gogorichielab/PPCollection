const crypto = require('crypto');
const { db } = require('../db');

const findByIdStmt = db.prepare('SELECT * FROM users WHERE id = ?');
const findByUsernameStmt = db.prepare('SELECT * FROM users WHERE username = ?');
const insertUserStmt = db.prepare(
  'INSERT INTO users (username, password_hash, invited_by) VALUES (@username, @password_hash, @invited_by)'
);
const touchUserStmt = db.prepare("UPDATE users SET updated_at = datetime('now') WHERE id = ?");
const updatePasswordStmt = db.prepare(
  "UPDATE users SET password_hash = @password_hash, updated_at = datetime('now') WHERE id = @id"
);

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

function updatePassword(userId, passwordHash) {
  updatePasswordStmt.run({ id: userId, password_hash: passwordHash });
}

module.exports = {
  findById,
  findByUsername,
  create,
  toSafeUser,
  updatePassword,
  invites: {
    create: createInvite,
    findByToken: findInviteByToken,
    accept: acceptInvite
  }
};
