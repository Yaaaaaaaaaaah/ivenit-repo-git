// ====== itemController.js (versi final gabungan & diperbaiki) ======
const fs = require('fs');
const path = require('path');
const { Item, Category, Location, Department, ItemSpecification, MaintenanceLog, Loan, sequelize } = require('../models');
const { Op } = require('sequelize');
const qrcode = require('qrcode');
const cloudinary = require('cloudinary').v2; // untuk hapus gambar lama di Cloudinary

// ===== FUNGSI LIST (DASHBOARD) =====
exports.list = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const categoryId = req.query.categoryId;
        const search = req.query.search;
        const offset = (page - 1) * limit;

        const whereCondition = {};
        if (categoryId) whereCondition.categoryId = categoryId;
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
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });

        const totalPages = Math.ceil(filteredCount / limit);
        const categories = await Category.findAll({ order: [['name', 'ASC']] });
        const totalItemsAbsolute = await Item.count();

        const statusCountsRaw = await Item.findAll({
            attributes: ['availability_status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
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
            where: { activity_date: { [Op.between]: [startOfMonth, endOfMonth] } },
            order: [['activity_date', 'DESC']],
            limit: 5,
            include: [{ model: Item, as: 'item', attributes: ['id', 'name'] }]
        });

        res.render('pages/items/index', {
            title: 'Dashboard Aset',
            items,
            categories,
            totalItems: filteredCount,
            totalPages,
            currentPage: page,
            limit,
            search: search || '',
            categoryId: categoryId || '',
            offset,
            totalItemsAbsolute,
            stats: { statusCounts, categoryCounts },
            recentMaintenances
        });
    } catch (error) {
        console.error("Error listing items:", error);
        res.status(500).send(`Gagal memuat daftar aset. Detail: ${error.message}`);
    }
};

// ===== FUNGSI SHOW (DETAIL) =====
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
        if (!item) return res.status(404).send('Aset tidak ditemukan');

        res.render('pages/items/detail', {
            title: `Detail Aset: ${item.name}`,
            item
        });
    } catch (error) {
        console.error("Error showing item details:", error);
        res.status(500).send(error.message);
    }
};

// ===== FUNGSI SHOWCREATEFORM (TAMBAH) =====
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

// ===== FUNGSI CREATE (SIMPAN BARU) - Versi CLOUDINARY =====
exports.create = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const {
            name, no_inventaris, serial_number, model, host_pc_name, purchase_date, condition,
            pic_name, notes, categoryId, locationId, departmentId, ...specs
        } = req.body;

        const imageUrl = req.file ? req.file.path : null;

        if (serial_number) {
            const existingSN = await Item.findOne({ where: { serial_number } });
            if (existingSN) throw new Error(`Serial number "${serial_number}" sudah digunakan.`);
        }
        if (no_inventaris) {
            const existingInv = await Item.findOne({ where: { no_inventaris } });
            if (existingInv) throw new Error(`No inventaris "${no_inventaris}" sudah digunakan.`);
        }

        const newItem = await Item.create({
            name,
            no_inventaris: no_inventaris || null,
            serial_number: serial_number || null,
            model: model || null,
            host_pc_name: host_pc_name || null,
            purchase_date: purchase_date || null,
            condition,
            pic_name,
            notes: notes || null,
            categoryId,
            locationId: locationId || null,
            departmentId: departmentId || null,
            image_url: imageUrl
        }, { transaction: t });

        const specificationsToCreate = Object.entries(specs)
            .filter(([_, value]) => value)
            .map(([key, value]) => ({
                itemId: newItem.id,
                spec_key: key.replace(/_/g, ' '),
                spec_value: value
            }));

        if (specificationsToCreate.length)
            await ItemSpecification.bulkCreate(specificationsToCreate, { transaction: t });

        await t.commit();
        res.redirect('/');
    } catch (error) {
        await t.rollback();
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

// ===== FUNGSI SHOWEDITFORM (EDIT) =====
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
            item: { ...item.toJSON(), ...itemSpecs },
            categories,
            locations,
            departments
        });
    } catch (error) {
        res.status(500).send(error.message);
    }
};

// ===== FUNGSI UPDATE (SIMPAN EDIT) - Versi CLOUDINARY =====
exports.update = async (req, res) => {
    const t = await sequelize.transaction();
    const itemId = req.params.id;
    try {
        const itemToUpdate = await Item.findByPk(itemId);
        if (!itemToUpdate) return res.status(404).send('Aset tidak ditemukan');

        const {
            name, no_inventaris, serial_number, model, host_pc_name, purchase_date, condition,
            pic_name, notes, categoryId, locationId, departmentId, ...specs
        } = req.body;

        if (serial_number) {
            const existingSN = await Item.findOne({ where: { serial_number, id: { [Op.ne]: itemId } } });
            if (existingSN) throw new Error(`Serial number "${serial_number}" sudah digunakan.`);
        }
        if (no_inventaris) {
            const existingInv = await Item.findOne({ where: { no_inventaris, id: { [Op.ne]: itemId } } });
            if (existingInv) throw new Error(`No inventaris "${no_inventaris}" sudah digunakan.`);
        }

        let imageUrl = itemToUpdate.image_url;
        if (req.file) {
            imageUrl = req.file.path;
            // Hapus gambar lama dari Cloudinary (jika ada)
            if (itemToUpdate.image_url && itemToUpdate.image_url.includes('cloudinary')) {
                const publicId = itemToUpdate.image_url.split('/').pop().split('.')[0];
                cloudinary.uploader.destroy(`ivenit_uploads/${publicId}`);
            }
        }

        await itemToUpdate.update({
            name,
            no_inventaris: no_inventaris || null,
            serial_number: serial_number || null,
            model: model || null,
            host_pc_name: host_pc_name || null,
            purchase_date: purchase_date || null,
            condition,
            pic_name,
            notes: notes || null,
            categoryId,
            locationId: locationId || null,
            departmentId: departmentId || null,
            image_url: imageUrl
        }, { transaction: t });

        // Hapus spesifikasi lama lalu buat ulang
        await ItemSpecification.destroy({ where: { itemId }, transaction: t });

        const specificationsToCreate = Object.entries(specs)
            .filter(([_, value]) => value)
            .map(([key, value]) => ({
                itemId,
                spec_key: key.replace(/_/g, ' '),
                spec_value: value
            }));

        if (specificationsToCreate.length)
            await ItemSpecification.bulkCreate(specificationsToCreate, { transaction: t });

        await t.commit();
        res.redirect(`/items/${itemId}`);
    } catch (error) {
        await t.rollback();
        const categories = await Category.findAll({ order: [['name', 'ASC']] });
        const locations = await Location.findAll({ order: [['name', 'ASC']] });
        const departments = await Department.findAll({ order: [['name', 'ASC']] });
        req.body.id = itemId;
        res.render('pages/items/form', {
            title: 'Edit Aset',
            item: req.body,
            categories,
            locations,
            departments,
            errorMessage: error.message
        });
    }
};

// ===== FUNGSI DELETE & QR CODE =====
exports.delete = async (req, res) => {
    try {
        const itemToDelete = await Item.findByPk(req.params.id);
        if (itemToDelete && itemToDelete.image_url && itemToDelete.image_url.includes('cloudinary')) {
            const publicId = itemToDelete.image_url.split('/').pop().split('.')[0];
            cloudinary.uploader.destroy(`ivenit_uploads/${publicId}`);
        }
        await Item.destroy({ where: { id: req.params.id } });
        res.redirect('/');
    } catch (error) {
        res.status(500).send(error.message);
    }
};

exports.qrCode = async (req, res) => {
    try {
        const item = await Item.findByPk(req.params.id);
        if (!item) return res.status(404).send('Aset tidak ditemukan');

        const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
        const assetUrl = `${baseUrl}/items/${item.id}`;

        const qrCodeDataUrl = await qrcode.toDataURL(assetUrl, { errorCorrectionLevel: 'H' });
        res.send(`<img src="${qrCodeDataUrl}" alt="QR Code for ${item.name}" class="img-fluid">`);
    } catch (error) {
        console.error("Error generating QR code:", error);
        res.status(500).send('Gagal membuat QR code');
    }
};
