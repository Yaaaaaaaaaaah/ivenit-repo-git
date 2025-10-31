const { Item, Department, Location, ItemSpecification } = require('../models');
const { Op } = require('sequelize');

exports.showAssetReport = async (req, res) => {
    try {
        const departments = await Department.findAll({ order: [['name', 'ASC']] });
        const locations = await Location.findAll({ order: [['name', 'ASC']] });

        let items = [];
        let reportType = null;
        let selectedDepartmentId = req.query.department_id || null;
        let selectedLocationId = req.query.location_id || null;
        let reportTitle = null; 

        if (selectedDepartmentId) {
            reportType = 'department';
            const selectedDepartment = await Department.findByPk(selectedDepartmentId);
            reportTitle = selectedDepartment ? `Departemen ${selectedDepartment.name}` : 'Departemen Dipilih'; 
            items = await Item.findAll({
                where: { departmentId: selectedDepartmentId },
                include: ['category', { model: ItemSpecification, as: 'specifications' }],
                order: [['host_pc_name', 'ASC']]
            });
        } else if (selectedLocationId) {
            reportType = 'location';
            const selectedLocation = await Location.findByPk(selectedLocationId);
            reportTitle = selectedLocation ? `Lokasi ${selectedLocation.name}` : 'Lokasi Dipilih'; 
            items = await Item.findAll({
                where: {
                    locationId: selectedLocationId,
                    '$category.name$': { [Op.ne]: 'Laptop/PC' }
                },
                include: ['category'], 
                order: [['name', 'ASC']]
            });
        }

        res.render('pages/reports/asset-report', {
            title: 'Laporan Aset',
            departments,
            locations,
            items,
            reportType,
            selectedDepartmentId,
            selectedLocationId,
            reportTitle 
        });
    } catch (error) {
        res.status(500).send(error.message);
    }
};