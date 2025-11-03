const { Item, Department, Location, ItemSpecification, Category } = require('../models');
const { Op } = require('sequelize');
const dayjs = require('dayjs'); 

/**
 * @param {object} item 
 * @returns {object}
 */
function calculateAssetMetrics(item) {
    let umurAset = 'N/A';
    let statusGaransi = 'N/A';
    let statusGaransiBadge = 'secondary'; 
    const today = dayjs();

    if (item.purchase_date) {
        const tglBeli = dayjs(item.purchase_date);
        const years = today.diff(tglBeli, 'year');
        const months = today.diff(tglBeli, 'month') % 12;
        if (years > 0) {
            umurAset = `${years} Tahun, ${months} Bulan`;
        } else if (months > 0) {
            umurAset = `${months} Bulan`;
        } else {
            const days = today.diff(tglBeli, 'day');
            umurAset = `${days} Hari`;
        }
        if (item.warranty_duration_months && item.warranty_duration_months > 0) {
            const tglGaransiHabis = tglBeli.add(item.warranty_duration_months, 'month');
            if (today.isBefore(tglGaransiHabis)) {
                statusGaransi = `Aktif (s/d ${tglGaransiHabis.format('DD MMM YYYY')})`;
                statusGaransiBadge = 'success'; 
            } else {
                statusGaransi = `Tidak Aktif (Habis ${tglGaransiHabis.format('DD MMM YYYY')})`;
                statusGaransiBadge = 'danger';
            }
        } else {
            statusGaransi = 'Tidak Ada Garansi';
            statusGaransiBadge = 'secondary';
        }
    }

    return { umurAset, statusGaransi, statusGaransiBadge };
}

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
                include: [
                    { model: Category, as: 'category' }, 
                    { model: ItemSpecification, as: 'specifications' }
                ],
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
                include: [
                    { model: Category, as: 'category' },
                    { model: ItemSpecification, as: 'specifications' } 
                ], 
                order: [['name', 'ASC']]
            });
        }

        let processedItems = [];
        if (items.length > 0) {
            processedItems = items.map(item => {
                const itemData = item.get({ plain: true });
                const metrics = calculateAssetMetrics(itemData);
                const merkSpec = item.specifications.find(s => s.spec_key.toLowerCase() === 'merk' || s.spec_key.toLowerCase() === 'brand');
                return {
                    ...itemData,
                    category: item.category, 
                    ...metrics,
                    merk: merkSpec ? merkSpec.spec_value : '-' 
                };
            });
        }

        res.render('pages/reports/asset-report', {
            title: 'Laporan Aset',
            departments,
            locations,
            items: processedItems, 
            reportType,
            selectedDepartmentId,
            selectedLocationId,
            reportTitle 
        });
    } catch (error) {
        res.status(500).send(error.message);
    }
};