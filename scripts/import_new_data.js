const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { sequelize, Category, Location, Department, Item, ItemSpecification } = require('../models');

const filesToImport = [
    { filename: 'jaringan.csv', categoryName: 'Jaringan', specMapping: { 'fungsi': 'Fungsi', 'ip_address': 'IP Address', 'mac_address': 'MAC Address', 'os_version': 'OS Version' } },
    { filename: 'cctv.csv', categoryName: 'CCTV', specMapping: { 'jenis_perangkat': 'Jenis Perangkat' } },
    { filename: 'peripheral.csv', categoryName: 'Peripheral', specMapping: { 'jenis_perangkat': 'Jenis Perangkat' } }
];

async function runImporter() {
    console.log('🚀 Memulai script impor data baru...');
    await sequelize.authenticate();
    console.log('✅ Koneksi database berhasil.');

    for (const config of filesToImport) {
        console.log(`\n--- Memproses file: ${config.filename} ---`);

        const category = await Category.findOne({ where: { name: config.categoryName } });
        if (!category) {
            console.error(`❌ GAGAL: Kategori "${config.categoryName}" tidak ditemukan.`);
            continue;
        }

        const csvPath = path.join(__dirname, '..', 'seeders', config.filename);
        const results = [];

        await new Promise((resolve, reject) => {
            fs.createReadStream(csvPath).pipe(csv()).on('data', (data) => results.push(data)).on('end', resolve).on('error', reject);
        });

        let successCount = 0;
        for (const row of results) {
            try {
                if (!row.name || !row.name.trim()) {
                    console.warn(`🟡 SKIP: Melewati baris karena nama perangkat kosong.`);
                    continue;
                }
                
                // --- CARA CEPAT: UBAH DATA KOSONG & CEK DUPLIKAT SEBELUM INSERT ---
                const noInventaris = (row.no_inventaris && row.no_inventaris.trim() && row.no_inventaris.trim() !== '-') ? row.no_inventaris.trim() : null;
                const serialNumber = (row.serial_number && row.serial_number.trim() && row.serial_number.trim() !== '-') ? row.serial_number.trim() : null;
                
                if (serialNumber) {
                    const existingItem = await Item.findOne({ where: { serial_number: serialNumber } });
                    if (existingItem) {
                        console.log(`🟡 SKIP: Item dengan serial number "${serialNumber}" sudah ada. Melewati baris untuk "${row.name}".`);
                        continue; // Lanjut ke baris berikutnya
                    }
                }
                if (noInventaris) {
                    const existingItem = await Item.findOne({ where: { no_inventaris: noInventaris } });
                    if (existingItem) {
                        console.log(`🟡 SKIP: Item dengan no. inventaris "${noInventaris}" sudah ada. Melewati baris untuk "${row.name}".`);
                        continue; // Lanjut ke baris berikutnya
                    }
                }
                // --- AKHIR CARA CEPAT ---

                let purchaseDate = new Date();
                if (row.purchase_date && row.purchase_date.trim() !== '-') {
                    const parsedDate = new Date(row.purchase_date.trim());
                    if (!isNaN(parsedDate.getTime())) {
                       purchaseDate = parsedDate;
                    }
                }

                const locationName = (row.location && row.location.trim()) ? row.location.trim() : 'Belum Ditentukan';
                const picName = (row.pic_name && row.pic_name.trim()) ? row.pic_name.trim() : 'Tim IT';
                const condition = (row.condition && row.condition.trim()) ? row.condition.trim() : 'Baik';

                const [location] = await Location.findOrCreate({ where: { name: locationName } });
                const [department] = await Department.findOrCreate({ where: { name: 'IT' } });

                const newItem = await Item.create({
                    name: row.name, model: row.model || null, no_inventaris: noInventaris, serial_number: serialNumber,
                    locationId: location.id, pic_name: picName, condition: condition, purchase_date: purchaseDate,
                    notes: row.notes || null, categoryId: category.id, departmentId: department.id,
                });

                const specificationsToCreate = [];
                for (const [csv_header, db_key] of Object.entries(config.specMapping)) {
                    const value = row[csv_header];
                    if (value && value.trim() !== '' && value.trim() !== '-') {
                        specificationsToCreate.push({ itemId: newItem.id, spec_key: db_key, spec_value: value.trim() });
                    }
                }

                if (specificationsToCreate.length > 0) {
                    await ItemSpecification.bulkCreate(specificationsToCreate);
                }
                successCount++;

            } catch (error) {
                console.error(`❌ Gagal memproses baris untuk "${row.name}". Error: ${error.message}`);
            }
        }
        console.log(`✅ Selesai memproses ${config.filename}. Berhasil mengimpor ${successCount} dari ${results.length} baris.`);
    }

    console.log('\n🎉🎉🎉 Semua file berhasil diimpor!');
    await sequelize.close();
}

runImporter().catch(err => {
    console.error("Terjadi error fatal:", err);
    process.exit(1);
});