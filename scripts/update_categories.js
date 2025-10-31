const { sequelize, Category } = require('../models');

async function runUpdate() {
    console.log('🚀 Memulai script untuk memperbarui kategori...');

    try {
        await sequelize.authenticate();
        console.log('✅ Koneksi database berhasil.');
        const oldCategory = await Category.findOne({ where: { name: 'Elektronik' } });
        if (oldCategory) {
            oldCategory.name = 'Laptop/PC';
            await oldCategory.save();
            console.log('✅ Kategori "Elektronik" berhasil diubah menjadi "Laptop/PC".');
        } else {
            console.log('🟡 Kategori "Elektronik" tidak ditemukan, melanjutkan...');
        }

        const newCategories = ['Jaringan', 'CCTV', 'Peripheral'];
        for (const catName of newCategories) {
            const [category, created] = await Category.findOrCreate({
                where: { name: catName }
            });
            if (created) {
                console.log(`✅ Kategori "${catName}" berhasil ditambahkan.`);
            } else {
                console.log(`🟡 Kategori "${catName}" sudah ada.`);
            }
        }

        console.log('🎉🎉🎉 Proses pembaruan kategori selesai!');
        await sequelize.close();

    } catch (error) {
        console.error('❌ Terjadi error saat memperbarui kategori:', error);
        process.exit(1);
    }
}

runUpdate();