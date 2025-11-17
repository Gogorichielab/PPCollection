const path = require('path');
const express = require('express');
const session = require('express-session');
const methodOverride = require('method-override');
const helmet = require('helmet');
const morgan = require('morgan');
const lusca = require('lusca');
const { port, sessionSecret } = require('./config');
const { requireAuth, checkPasswordChangeRequired } = require('./middleware/auth');
const users = require('./db/users');

require('./db');

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(morgan('dev'));
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 60 * 60 * 8,
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true
    }
  })
);

// CSRF protection middleware
app.use(lusca.csrf());

app.use('/static', express.static(path.join(__dirname, 'public')));

// Keep session user data in sync with the database
app.use((req, res, next) => {
  if (typeof req.csrfToken === 'function') {
    res.locals.csrfToken = req.csrfToken();
  } else {
    // Serious configuration issue: CSRF token generation is unavailable
    throw new Error('CSRF token generation is unavailable. Ensure CSRF middleware is properly configured.');
  }

  if (!req.session.user) {
    res.locals.user = null;
    return next();
  }

  const dbUser = users.findById(req.session.user.id);
  if (!dbUser) {
    delete req.session.user;
    res.locals.user = null;
    return next();
  }

  const safeUser = users.toSafeUser(dbUser);
  req.session.user = safeUser;
  res.locals.user = safeUser;
  return next();
});

// Routes
app.use('/', require('./routes/auth'));

app.get('/', requireAuth, checkPasswordChangeRequired, (req, res) => res.redirect('/library'));
app.use('/library', requireAuth, checkPasswordChangeRequired, require('./routes/library'));
app.use('/profile', requireAuth, checkPasswordChangeRequired, require('./routes/profile'));

// 404 handler
app.use((req, res) => {
  res.status(404).render('404');
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`PPCollection listening on http://localhost:${port}`);
});

