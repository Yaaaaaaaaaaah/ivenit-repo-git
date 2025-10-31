const { sequelize, Category, Location, Department, Item } = require('../models');
const { Op } = require('sequelize');

/**
 * @param {Model} model 
 * @param {string} foreignKey 
 */
async function deduplicateModel(model, foreignKey) {
    console.log(`\n--- Memeriksa duplikat di tabel '${model.name}' ---`);

    const allRecords = await model.findAll();
    const groupedByName = allRecords.reduce((acc, record) => {
        const cleanName = record.name.trim(); 
        if (!acc[cleanName]) {
            acc[cleanName] = [];
        }
        acc[cleanName].push(record);
        return acc;
    }, {});

    let duplicatesFound = 0;

    for (const name in groupedByName) {
        const group = groupedByName[name];
        if (group.length > 1) {
            duplicatesFound++;
            console.log(`  > Ditemukan ${group.length} duplikat untuk "${name}". Memulai penggabungan...`);
            const survivor = group[0];
            const duplicateIds = group.slice(1).map(record => record.id);
            const t = await sequelize.transaction();
            try {
                const [updatedRows] = await Item.update(
                    { [foreignKey]: survivor.id },
                    { where: { [foreignKey]: { [Op.in]: duplicateIds } } },
                    { transaction: t }
                );
                console.log(`    - ${updatedRows} item berhasil dipindahkan ke ID '${survivor.id}'.`);
                const deletedRows = await model.destroy(
                    { where: { id: { [Op.in]: duplicateIds } } },
                    { transaction: t }
                );
                console.log(`    - ${deletedRows} record duplikat berhasil dihapus.`);
                await t.commit();
            } catch (error) {
                await t.rollback();
                console.error(`  ❌ Gagal menggabungkan duplikat untuk "${name}". Error: ${error.message}`);
            }
        }
    }

    if (duplicatesFound === 0) {
        console.log(`  ✅ Tidak ada duplikat yang ditemukan.`);
    }
}

async function runCleanup() {
    console.log('🚀 Memulai script pembersihan data duplikat...');
    try {
        await sequelize.authenticate();
        console.log('✅ Koneksi database berhasil.');

        await deduplicateModel(Location, 'locationId');
        await deduplicateModel(Department, 'departmentId');
        await deduplicateModel(Category, 'categoryId');

        console.log('\n🎉🎉🎉 Proses pembersihan selesai!');
        await sequelize.close();
    } catch (error) {
        console.error('❌ Terjadi error fatal saat proses pembersihan:', error);
        process.exit(1);
    }
}

runCleanup();