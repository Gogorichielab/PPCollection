const path = require('path');
const express = require('express');
const session = require('express-session');
const methodOverride = require('method-override');
const helmet = require('helmet');
const morgan = require('morgan');
const { port, sessionSecret } = require('./config');
const { requireAuth } = require('./middleware/auth');

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
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 8 }
  })
);

app.use('/static', express.static(path.join(__dirname, 'public')));

// Expose session user to templates
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Routes
app.use('/', require('./routes/auth'));

app.get('/', requireAuth, (req, res) => res.redirect('/firearms'));
app.use('/firearms', requireAuth, require('./routes/firearms'));

// 404 handler
app.use((req, res) => {
  res.status(404).render('404');
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`PPCollection listening on http://localhost:${port}`);
});

