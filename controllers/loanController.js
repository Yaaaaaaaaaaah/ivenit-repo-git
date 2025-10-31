const { Loan, Item } = require('../models');
const { Op } = require('sequelize');

exports.list = async (req, res) => {
    try {
        const loans = await Loan.findAll({
            include: 'item',
            order: [['createdAt', 'DESC']]
        });
        const availableItems = await Item.findAll({ where: { availability_status: 'Tersedia' } });
        res.render('pages/loans/index', {
            title: 'Manajemen Peminjaman Aset',
            loans,
            availableItems
        });
    } catch (error) {
        res.status(500).send(error.message);
    }
};

exports.create = async (req, res) => {
    try {
        const { itemId, borrower_name, loan_date, notes } = req.body;
        await Loan.create({
            itemId,
            borrower_name,
            loan_date,
            notes,
            status: 'Dipinjam'
        });
        await Item.update({ availability_status: 'Dipinjam' }, { where: { id: itemId } });
        res.redirect('/loans');
    } catch (error) {
        res.status(500).send(error.message);
    }
};

exports.returnItem = async (req, res) => {
    try {
        const { id } = req.params;
        const loan = await Loan.findByPk(id);
        if (loan) {
            loan.status = 'Dikembalikan';
            loan.return_date = new Date();
            await loan.save();
            await Item.update({ availability_status: 'Tersedia' }, { where: { id: loan.itemId } });
        }
        res.redirect('/loans');
    } catch (error) {
        res.status(500).send(error.message);
    }
};