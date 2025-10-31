const { User } = require('../models');

exports.showLoginForm = (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.render('pages/auth/login', { title: 'Login Administrator' });
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).render('pages/auth/login', { title: 'Login', error: 'Email atau password salah.' });
    }

    if (user.status !== 'Active') {
      return res.status(403).render('pages/auth/login', { title: 'Login', error: 'Akun Anda sedang menunggu persetujuan admin.' });
    }

    req.session.userId = user.id;
    req.session.userName = user.name;
    req.session.userRole = user.role; 
    res.redirect('/');
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
};

exports.showRegisterForm = (req, res) => {
    res.render('pages/auth/register', { title: 'Registrasi Pengguna Baru' });
};

exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.render('pages/auth/register', { title: 'Registrasi', error: 'Email sudah terdaftar.' });
        }

        await User.create({ name, email, password });

        res.render('pages/auth/register-success', { title: 'Registrasi Berhasil' });
    } catch (error) {
        res.status(500).send(error.message);
    }
};