function createAuthService({ adminUser, adminPass }) {
  return {
    validateCredentials(username, password) {
      return username === adminUser && password === adminPass;
    }
  };
}

module.exports = { createAuthService };
