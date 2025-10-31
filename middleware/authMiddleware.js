exports.isAuthenticated = (req, res, next) => {
  if (req.session.userId) return next();
  res.redirect('/login');
};

exports.isAdmin = (req, res, next) => {
    if (req.session.userRole === 'Admin') {
        return next(); 
    }
    res.status(403).send('Akses ditolak. Anda bukan Maula.');
};