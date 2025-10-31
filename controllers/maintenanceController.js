const { MaintenanceLog, Item } = require('../models');
const { Op, fn, col, literal } = require('sequelize');

exports.addLog = async (req, res) => {
    try {
        const { activity_date, description, technician_name } = req.body;
        await MaintenanceLog.create({
            itemId: req.params.id,
            activity_date,
            description,
            technician_name: technician_name || req.session.userName || 'Tim IT' 
        });
        res.redirect(`/items/${req.params.id}`);
    } catch (error) {
        res.status(500).send(error.message);
    }
};

exports.showMaintenanceReport = async (req, res) => {
    try {
        const selectedMonth = req.query.month; 
        let logs = null; 

        if (selectedMonth) {
            const [year, month] = selectedMonth.split('-');

            const startDate = new Date(year, month - 1, 1); 
            const endDate = new Date(year, month, 0); 

            logs = await MaintenanceLog.findAll({
                where: {
                    activity_date: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                include: [{ model: Item, as: 'item' }],
                order: [['activity_date', 'ASC']]
            });
        }

        res.render('pages/reports/maintenance-report', {
            title: 'Laporan Maintenance Bulanan',
            selectedMonth: selectedMonth || '', 
            logs: logs 
        });
    } catch (error) {
        res.status(500).send(error.message);
    }
};