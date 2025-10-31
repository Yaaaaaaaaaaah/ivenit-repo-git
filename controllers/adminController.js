const { User } = require('../models');

exports.listUsers = async (req, res) => {
    try {
        const users = await User.findAll({ order: [['createdAt', 'DESC']] });
        res.render('pages/admin/users', {
            title: 'Manajemen Pengguna',
            users
        });
    } catch (error) {
        res.status(500).send(error.message);
    }
};

exports.approveUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (user) {
            user.status = 'Active';
            await user.save();
        }
        res.redirect('/admin/users');
    } catch (error) {
        res.status(500).send(error.message);
    }
};