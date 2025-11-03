const { Loan, Item } = require('../models');
const { Op } = require('sequelize');
const dayjs = require('dayjs'); 

exports.list = async (req, res) => {
    try {
        const loans = await Loan.findAll({
            include: 'item',
            order: [['createdAt', 'DESC']]
        });
        const availableItems = await Item.findAll({ where: { availability_status: 'Tersedia' } });

        const today = dayjs().startOf('day'); 
        const processedLoans = loans.map(loan => {
            const loanData = loan.get({ plain: true });
            let isOverdue = false;
            if (loanData.status === 'Dipinjam' && loanData.due_date) {
                const dueDate = dayjs(loanData.due_date);
                if (today.isAfter(dueDate)) {
                    isOverdue = true;
                }
            }
            return { ...loanData, isOverdue }; 
        });

        res.render('pages/loans/index', {
            title: 'Manajemen Peminjaman Aset',
            loans: processedLoans, 
            availableItems
        });
    } catch (error) {
        res.status(500).send(error.message);
    }
};

exports.create = async (req, res) => {
    try {
        const { itemId, borrower_name, borrower_phone, loan_date, due_date, notes } = req.body;
        await Loan.create({
            itemId,
            borrower_name,
            borrower_phone: borrower_phone || null, 
            loan_date,
            due_date, 
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