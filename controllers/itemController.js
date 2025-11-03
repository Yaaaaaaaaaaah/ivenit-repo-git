const fs = require('fs');
const path = require('path');
const { Item, Category, Location, Department, ItemSpecification, MaintenanceLog, Loan, sequelize } = require('../models');
const { Op } = require('sequelize'); 
const qrcode = require('qrcode');
const dayjs = require('dayjs'); 
const cloudinary = require('cloudinary').v2;

// Variabel "pintar"
const isProduction = process.env.NODE_ENV && process.env.NODE_ENV.trim() === 'production';

// ... (FUNGSI calculateAssetMetrics, list, show, showCreateForm TETAP SAMA) ...
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
exports.list = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10; 
        const categoryId = req.query.categoryId;
        const search = req.query.search;
        const offset = (page - 1) * limit;
        const sort = req.query.sort || 'createdAt'; 
        const order = req.query.order || 'DESC'; 
        
        let orderQuery;
        if (sort === 'category') {
            orderQuery = [[{ model: Category, as: 'category' }, 'name', order]];
        } 
        else if (['name', 'pic_name', 'createdAt'].includes(sort)) {
            orderQuery = [[sort, order]];
        } 
        else {
            orderQuery = [['createdAt', 'DESC']];
        }
        const whereCondition = {};
        if (categoryId) {
            whereCondition.categoryId = categoryId;
        }
        if (search) {
            whereCondition[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { host_pc_name: { [Op.like]: `%${search}%` } },
                { no_inventaris: { [Op.like]: `%${search}%` } },
                { serial_number: { [Op.like]: `%${search}%` } }
            ];
        }
        const { count: filteredCount, rows: items } = await Item.findAndCountAll({
            where: whereCondition,
            include: ['category', 'location', 'department'],
            order: orderQuery, 
            limit: limit, 
            offset: offset,
        });
        const totalPages = Math.ceil(filteredCount / limit);
        const categories = await Category.findAll({ order: [['name', 'ASC']] });
        const totalItemsAbsolute = await Item.count();
        const statusCountsRaw = await Item.findAll({
            attributes: ['availability_status', [sequelize.fn('COUNT', 'id'), 'count']],
            group: ['availability_status']
        });
        const statusCounts = statusCountsRaw.reduce((acc, item) => {
            acc[item.availability_status] = item.get('count');
            return acc;
        }, {});
        const categoryCountsRaw = await Item.findAll({
            include: [{ model: Category, as: 'category', attributes: ['name'] }],
            attributes: ['categoryId', [sequelize.fn('COUNT', sequelize.col('Item.id')), 'count']],
            group: ['categoryId', 'category.id', 'category.name'],
            raw: true,
            nest: true
        });
        const categoryCounts = categoryCountsRaw.reduce((acc, item) => {
            if (item.category && item.category.name) {
                acc[item.category.name] = item.count;
            }
            return acc;
        }, {});
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const recentMaintenances = await MaintenanceLog.findAll({
            where: {
                activity_date: {
                    [Op.between]: [startOfMonth, endOfMonth] 
                }
            },
            order: [['activity_date', 'DESC']],
            limit: 5,
            include: [{
                model: Item,
                as: 'item',
                attributes: ['id', 'name']
            }]
        });
        const today = dayjs().startOf('day');
        const overdueLoans = await Loan.findAll({
            where: {
                status: 'Dipinjam',
                due_date: { [Op.lt]: today.toDate() } 
            },
            include: [{
                model: Item,
                as: 'item',
                attributes: ['id', 'name'] 
            }],
            order: [['due_date', 'ASC']] 
        });
        res.render('pages/items/index', {
            title: 'Dashboard Aset',
            items: items,
            categories: categories,
            totalItems: filteredCount,
            totalPages: totalPages,
            currentPage: page,
            limit: limit, 
            search: search || '',
            categoryId: categoryId || '',
            offset: offset,
            totalItemsAbsolute: totalItemsAbsolute,
            stats: {
                statusCounts: statusCounts,
                categoryCounts: categoryCounts
            },
            recentMaintenances: recentMaintenances,
            overdueLoans: overdueLoans, 
            sort: sort, 
            order: order 
        });

    } catch (error) {
        console.error("Error listing items:", error);
        res.status(500).send(`Gagal memuat daftar aset. Detail: ${error.message} ${error.original ? '(' + error.original.message + ')' : ''}`);
    }
};
exports.show = async (req, res) => {
    try {
        const item = await Item.findByPk(req.params.id, {
            include: [
                { model: Category, as: 'category' },
                { model: Location, as: 'location' },
                { model: Department, as: 'department' },
                { model: ItemSpecification, as: 'specifications' }, 
                { model: MaintenanceLog, as: 'logs', order: [['activity_date', 'DESC']] }
            ]
        });
        if (!item) {
            return res.status(404).send('Aset tidak ditemukan');
        }
        const itemData = item.get({ plain: true }); 
        const metrics = calculateAssetMetrics(itemData);
        const itemDetail = {
            ...itemData,
            specifications: item.specifications, 
            logs: item.logs,
            category: item.category,
            location: item.location,
            department: item.department,
            ...metrics 
        };
        res.render('pages/items/detail', {
            title: `Detail Aset: ${item.name}`,
            item: itemDetail 
        });
    } catch (error) {
        console.error("Error showing item details:", error); 
        res.status(500).send(error.message);
    }
};
exports.showCreateForm = async (req, res) => {
    try {
        const categories = await Category.findAll({ order: [['name', 'ASC']] });
        const locations = await Location.findAll({ order: [['name', 'ASC']] });
        const departments = await Department.findAll({ order: [['name', 'ASC']] });
        res.render('pages/items/form', {
            title: 'Tambah Aset Baru',
            item: null,
            categories,
            locations,
            departments
        });
    } catch (error) {
        res.status(500).send(error.message);
    }
};
exports.create = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const {
            name, no_inventaris, serial_number, model, host_pc_name, purchase_date,
            warranty_duration_months,
            condition,
            pic_name, notes, categoryId, locationId, departmentId, ...specs
        } = req.body;

        let imageUrl = null;
        let imagePublicId = null;

        if (req.file) {
            if (isProduction) { 
                imageUrl = req.file.path;
                imagePublicId = req.file.filename;
            } else {
                imageUrl = `/uploads/${req.file.filename}`;
            }
        }
        if (serial_number) {
            const existingSN = await Item.findOne({ where: { serial_number: serial_number } });
            if (existingSN) throw new Error(`Data duplikat. Serial number "${serial_number}" sudah digunakan.`);
        }
        if (no_inventaris) {
            const existingInv = await Item.findOne({ where: { no_inventaris: no_inventaris } });
            if (existingInv) throw new Error(`Data duplikat. No inventaris "${no_inventaris}" sudah digunakan.`);
        }

        const newItem = await Item.create({
            name, no_inventaris: no_inventaris || null, serial_number: serial_number || null, model: model || null,
            host_pc_name: host_pc_name || null,
            purchase_date: purchase_date || null,
            warranty_duration_months: warranty_duration_months || 0,
            condition, pic_name, notes: notes || null,
            categoryId, locationId: locationId || null, departmentId: departmentId || null,
            image_url: imageUrl, 
            image_public_id: imagePublicId 
        }, { transaction: t });

        const specificationsToCreate = [];
        for (const [key, value] of Object.entries(specs)) {
            if (value) { specificationsToCreate.push({ itemId: newItem.id, spec_key: key.replace(/_/g, ' '), spec_value: value }); }
        }
        if (specificationsToCreate.length > 0) {
            await ItemSpecification.bulkCreate(specificationsToCreate, { transaction: t });
        }
        await t.commit();
        res.redirect('/');

    } catch (error) {
        await t.rollback();
        if (req.file) {
            if (isProduction) { 
                try {
                    await cloudinary.uploader.destroy(req.file.filename);
                } catch (cloudinaryError) {
                    console.error("PERINGATAN: Gagal hapus file di Cloudinary saat rollback create:", cloudinaryError.message);
                }
            } else {
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error("Gagal hapus file lokal setelah error:", err);
                });
            }
        }
        
        const categories = await Category.findAll({ order: [['name', 'ASC']] });
        const locations = await Location.findAll({ order: [['name', 'ASC']] });
        const departments = await Department.findAll({ order: [['name', 'ASC']] });
        res.render('pages/items/form', {
            title: 'Tambah Aset Baru',
            item: req.body,
            categories,
            locations,
            departments,
            errorMessage: error.message
        });
    }
};
exports.showEditForm = async (req, res) => {
    try {
        const item = await Item.findByPk(req.params.id, {
            include: [
                { model: Category, as: 'category' }, 
                { model: ItemSpecification, as: 'specifications' }
            ] 
        });
        if (!item) return res.status(404).send('Aset tidak ditemukan');
        const categories = await Category.findAll({ order: [['name', 'ASC']] });
        const locations = await Location.findAll({ order: [['name', 'ASC']] });
        const departments = await Department.findAll({ order: [['name', 'ASC']] });
        const itemSpecs = item.specifications.reduce((acc, spec) => {
            acc[spec.spec_key.replace(/ /g, '_')] = spec.spec_value; 
            return acc;
        }, {});
        res.render('pages/items/form', {
            title: `Edit Aset: ${item.name}`,
            item: { ...item.get(), ...itemSpecs }, 
            categories,
            locations,
            departments
        });
    } catch (error) {
        res.status(500).send(error.message);
    }
};
exports.update = async (req, res) => {
    const t = await sequelize.transaction();
    const itemId = req.params.id;
    let newImageFile = null; 
    try {
        const itemToUpdate = await Item.findByPk(itemId);
        if (!itemToUpdate) return res.status(404).send('Aset tidak ditemukan');

        const {
            name, no_inventaris, serial_number, model, host_pc_name, purchase_date,
            warranty_duration_months,
            condition,
            pic_name, notes, categoryId, locationId, departmentId, ...specs
        } = req.body;

        if (serial_number) {
            const existingSN = await Item.findOne({ where: { serial_number: serial_number, id: { [Op.ne]: itemId } } });
            if (existingSN) throw new Error(`Data duplikat. Serial number "${serial_number}" sudah digunakan.`);
        }
        if (no_inventaris) {
            const existingInv = await Item.findOne({ where: { no_inventaris: no_inventaris, id: { [Op.ne]: itemId } } });
            if (existingInv) throw new Error(`Data duplikat. No inventaris "${no_inventaris}" sudah digunakan.`);
        }

        let imageUrl = itemToUpdate.image_url;
        let imagePublicId = itemToUpdate.image_public_id;
        const oldPublicId = itemToUpdate.image_public_id;
        const oldLocalPath = itemToUpdate.image_url;

        if (req.file) {
            newImageFile = req.file; 
            if (isProduction) { 
                imageUrl = req.file.path;
                imagePublicId = req.file.filename;
            } else {
                imageUrl = `/uploads/${req.file.filename}`;
                imagePublicId = null; 
            }
        }

        await itemToUpdate.update({
            name, no_inventaris: no_inventaris || null, serial_number: serial_number || null, model: model || null,
            host_pc_name: host_pc_name || null,
            purchase_date: purchase_date || null,
            warranty_duration_months: warranty_duration_months || 0,
            condition, pic_name, notes: notes || null,
            categoryId, locationId: locationId || null, departmentId: departmentId || null,
            image_url: imageUrl, 
            image_public_id: imagePublicId
        }, { transaction: t });
        
        if (req.file) {
            if (oldPublicId) {
                try {
                    await cloudinary.uploader.destroy(oldPublicId);
                } catch (cloudinaryError) {
                    console.error("PERINGATAN: Gagal hapus file lama di Cloudinary saat update:", cloudinaryError.message);
                }
            } else if (oldLocalPath) {
                const fullOldPath = path.join(__dirname, '..', 'public', oldLocalPath);
                if (fs.existsSync(fullOldPath)) {
                    fs.unlinkSync(fullOldPath);
                }
            }
        }

        await ItemSpecification.destroy({ where: { itemId: itemId } }, { transaction: t });
        const specificationsToCreate = [];
        for (const [key, value] of Object.entries(specs)) {
            if (value) { specificationsToCreate.push({ itemId: itemId, spec_key: key.replace(/_/g, ' '), spec_value: value }); }
        }
        if (specificationsToCreate.length > 0) {
            await ItemSpecification.bulkCreate(specificationsToCreate, { transaction: t });
        }
        await t.commit();
        res.redirect(`/items/${itemId}`);

    } catch (error) {
        await t.rollback();
        if (newImageFile) {
            if (isProduction) { 
                try {
                    await cloudinary.uploader.destroy(newImageFile.filename);
                } catch (cloudinaryError) {
                    console.error("PERINGATAN: Gagal hapus file baru di Cloudinary saat rollback update:", cloudinaryError.message);
                }
            } else {
                fs.unlink(newImageFile.path, (err) => {
                    if (err) console.error("Gagal hapus file baru setelah error:", err);
                });
            }
        }
        
        const categories = await Category.findAll({ order: [['name', 'ASC']] });
        const locations = await Location.findAll({ order: [['name', 'ASC']] });
        const departments = await Department.findAll({ order: [['name', 'ASC']] });
        req.body.id = itemId;
        res.render('pages/items/form', {
            title: `Edit Aset`,
            item: req.body,
            categories,
            locations,
            departments,
            errorMessage: error.message
        });
    }
};

// --- PERBAIKAN FINAL (HTTP 500 FIX) ---
exports.delete = async (req, res) => {
    try {
        const itemToDelete = await Item.findByPk(req.params.id);
        if (!itemToDelete) {
            return res.status(404).send('Aset tidak ditemukan');
        }

        // 1. Simpan path/ID file sebelum menghapus data
        const imagePublicId = itemToDelete.image_public_id;
        const imageUrl = itemToDelete.image_url;

        // 2. Hapus data dari database DULU
        await Item.destroy({ where: { id: req.params.id } });

        // 3. BARU coba hapus file fisiknya
        if (imagePublicId) {
            // Hapus dari Cloudinary, TAPI JANGAN BIKIN CRASH JIKA GAGAL
            try {
                await cloudinary.uploader.destroy(imagePublicId);
            } catch (cloudinaryError) {
                // Log error-nya ke console, tapi jangan hentikan server
                console.error("PERINGATAN: Gagal hapus file di Cloudinary:", cloudinaryError.message);
                console.error("File Public ID:", imagePublicId);
                // Lanjutkan...
            }
        
        } else if (imageUrl) {
            // Hapus dari Lokal (ini hanya untuk mode development)
            const localPath = path.join(__dirname, '..', 'public', imageUrl);
            if (fs.existsSync(localPath)) { 
                fs.unlinkSync(localPath); 
            }
        }

        // 4. Redirect kembali ke dashboard (PASTI SAMPAI SINI)
        res.redirect('/');
        
    } catch (error) {
        // Ini hanya akan menangkap error jika Item.destroy (database) GAGAL
        console.error("Error Kritis saat menghapus aset dari DB:", error);
        res.status(500).send(error.message);
    }
};
// --- AKHIR PERBAIKAN ---

exports.qrCode = async (req, res) => {
    try {
        const item = await Item.findByPk(req.params.id);
        if (!item) return res.status(404).send('Aset tidak ditemukan');
        const baseUrl = process.env.NGROK_URL || `${req.protocol}://${req.get('host')}`;
        const assetUrl = `${baseUrl}/items/${item.id}`;
        const qrCodeDataUrl = await qrcode.toDataURL(assetUrl, { errorCorrectionLevel: 'H' });
        res.send(`<img src="${qrCodeDataUrl}" alt="QR Code for ${item.name}" class="img-fluid">`);
    } catch (error) {
        console.error("Error generating QR code:", error);
        res.status(500).send('Gagal membuat QR code');
    }
};