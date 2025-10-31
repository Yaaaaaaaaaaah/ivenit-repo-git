const { sequelize, Category, Item } = require('../models');
const { Op } = require('sequelize');

async function runDelete() {
    console.log('🚀 Memulai script untuk menghapus data dari kategori baru...');
    try {
        await sequelize.authenticate();
        console.log('✅ Koneksi database berhasil.');

        const categoriesToDelete = ['Jaringan', 'CCTV', 'Peripheral'];

        const categories = await Category.findAll({
            where: {
                name: {
                    [Op.in]: categoriesToDelete
                }
            }
        });

        if (categories.length === 0) {
            console.log('🟡 Tidak ada kategori baru yang ditemukan. Proses selesai.');
            await sequelize.close();
            return;
        }
        const categoryIds = categories.map(cat => cat.id);
        console.log(`- Ditemukan kategori: ${categories.map(c => c.name).join(', ')}`);

        const deletedRows = await Item.destroy({
            where: {
                categoryId: {
                    [Op.in]: categoryIds
                }
            }
        });

        console.log(`✅ Berhasil menghapus ${deletedRows} aset dari database.`);
        console.log('\n🎉🎉🎉 Proses pembersihan selesai!');
        await sequelize.close();

    } catch (error) {
        console.error('❌ Terjadi error fatal saat proses pembersihan:', error);
        process.exit(1);
    }
}

runDelete();