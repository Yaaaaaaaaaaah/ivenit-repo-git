const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { sequelize, Category, Location, Department, Item, ItemSpecification, MaintenanceLog } = require('../models');

async function runSeeder() {
    console.log('🚀 Memulai proses seeding database...');

    try {
        await sequelize.sync({ force: true });
        console.log('✅ Semua tabel berhasil dibuat ulang.');

        const csvPath = path.join(__dirname, 'inventaris_lengkap.csv');
        const results = [];

        fs.createReadStream(csvPath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                console.log(`- File CSV berhasil dibaca, ditemukan ${results.length} baris data.`);
                console.log('- Memulai impor data aset...');
                for (const row of results) {
                    try {
                        if (!row.name || !row.purchase_date) {
                            console.error(`⏭️  SKIP: Melewati baris karena nama atau tanggal pembelian kosong.`);
                            continue;
                        }

                        const purchaseDate = new Date(row.purchase_date.trim());
                        if (isNaN(purchaseDate.getTime())) {
                            console.error(`⏭️  SKIP: Melewati baris untuk "${row.name}" karena tanggal pembelian tidak valid: "${row.purchase_date}"`);
                            continue; 
                        }

                        const [category] = await Category.findOrCreate({ where: { name: (row.category || 'Lainnya').trim() } });
                        const [location] = await Location.findOrCreate({ where: { name: (row.location || 'Tidak Diketahui').trim() } });
                        const [department] = await Department.findOrCreate({ where: { name: (row.department || 'Tidak Diketahui').trim() } });

                        const newItem = await Item.create({
                            name: row.name,
                            no_inventaris: row.no_inventaris || null,
                            serial_number: row.serial_number || null,
                            model: row.model || null,
                            host_pc_name: row.host_pc_name || null,
                            purchase_date: purchaseDate, 
                            condition: row.condition,
                            pic_name: row.pic_name,
                            notes: row.notes || null,
                            categoryId: category.id,
                            locationId: location.id,
                            departmentId: department.id,
                        });

                        const spec_mapping = {
                            'mac_address': 'MAC Address', 'ip_address': 'IP Address', 'processor': 'Processor',
                            'ram': 'RAM', 'vga': 'VGA', 'ssd': 'SSD', 'hdd': 'HDD',
                            'operating_system': 'Operating System', 'ms_office': 'Ms. Office', 'anydesk_id': 'AnyDesk ID',
                        };

                        const specificationsToCreate = [];
                        for (const [csv_header, db_key] of Object.entries(spec_mapping)) {
                            const value = row[csv_header];
                            if (value && value.trim() !== '' && value.trim() !== '-') {
                                specificationsToCreate.push({
                                    itemId: newItem.id,
                                    spec_key: db_key,
                                    spec_value: value.trim()
                                });
                            }
                        }

                        if (specificationsToCreate.length > 0) {
                            await ItemSpecification.bulkCreate(specificationsToCreate);
                        }

                    } catch (error) {
                        console.error(`❌ Gagal memproses baris untuk: "${row.name || 'NAMA KOSONG'}". Error: ${error.message}`);
                    }
                }
                
                console.log('✅ Proses impor data aset selesai.');

                console.log('- Membuat data dummy untuk log perawatan...');
                const itemsForLog = await Item.findAll({ limit: 2 });
                if (itemsForLog.length > 0) {
                    await MaintenanceLog.bulkCreate([
                        {
                            itemId: itemsForLog[0].id,
                            activity_date: new Date(),
                            description: 'Pengecekan hardware dan pembersihan virus',
                            technician_name: 'Admin Seeder'
                        },
                        {
                            itemId: itemsForLog[1].id,
                            activity_date: new Date(new Date().setDate(new Date().getDate() - 10)),
                            description: 'Update sistem operasi ke versi terbaru',
                            technician_name: 'Admin Seeder'
                        }
                    ]);
                }
                console.log('✅ Data log perawatan berhasil dibuat.');
                console.log('🎉🎉🎉 Proses seeding selesai dengan sukses! 🎉🎉🎉');
                
                await sequelize.close();
            });

    } catch (error) {
        console.error('❌ Terjadi error fatal saat proses seeding:', error);
        process.exit(1);
    }
}

runSeeder();