require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);

const db = require('./models'); 
const routes = require('./routes');

const app = express();
// ===== PERUBAHAN DI SINI =====
// const port = 3000; // <- Baris ini diganti
const port = process.env.PORT || 3000; // <- Menjadi baris ini
// =============================

const sessionStore = new SequelizeStore({
  db: db.sequelize, 
});

app.use(session({
  secret: process.env.SESSION_SECRET || '4dm1n1str4tor!', // Baca secret dari .env
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 
  }
}));

app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

app.use(express.urlencoded({ extended: true }));

app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/', routes);

db.sequelize.sync({ alter: true }) 
  .then(() => {
    // Pastikan app.listen menggunakan variabel 'port' yang sudah diubah
    app.listen(port, () => { 
      console.log(`Server berjalan di port: ${port}`); // Pesan log diubah
    });
  })
  .catch(err => {
    console.error('Woy! Gagal sinkronisasi database:', err);
  });