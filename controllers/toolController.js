const { Item, Category, Location, Department } = require('../models');

exports.renderDepreciationMeter = async (req, res) => {
    try {
        const items = await Item.findAll({
            attributes: ['id', 'name', 'host_pc_name', 'no_inventaris', 'pic_name'], 
            include: [
                { model: Category, as: 'category', attributes: ['name'], required: false }, 
                { model: Location, as: 'location', attributes: ['name'], required: false }, 
                { model: Department, as: 'department', attributes: ['name'], required: false } 
            ],
            order: [['name', 'ASC']]
        });

        res.render('pages/tools/depreciation_meter', { 
            title: 'Pengukur Nilai Depresiasi',
            items: items 
        });
    } catch (error) {
        console.error("Error rendering depreciation meter:", error);
        res.status(500).send('Gagal memuat halaman pengukur depresiasi.');
    }
};

exports.calculateSimpleDepreciation = async (req, res) => {
    try {
        const { itemId, purchasePrice } = req.body; 

        if (!itemId || isNaN(parseInt(itemId))) return res.status(400).json({ error: 'Item ID tidak valid.' });
        if (!purchasePrice || isNaN(parseFloat(purchasePrice)) || parseFloat(purchasePrice) <= 0) return res.status(400).json({ error: 'Harga Beli tidak valid.' });

        const price = parseFloat(purchasePrice);

        const item = await Item.findByPk(itemId, {
            include: [{ model: Category, as: 'category', attributes: ['name'], required: false }]
        });

        if (!item) return res.status(404).json({ error: 'Aset tidak ditemukan.' });
        if (!item.category) return res.status(400).json({ error: 'Aset tidak memiliki kategori.' });

        let usefulLife = 0;
        let salvageRate = 0; 
        const categoryName = item.category.name;

        switch (categoryName) {
            case 'Laptop/PC':
                usefulLife = 4;
                salvageRate = 0.10; 
                break;
            case 'Peripheral':
                usefulLife = 4.5;
                salvageRate = 0.10; 
                break;
            case 'CCTV':
                usefulLife = 5;
                salvageRate = 0; 
                break;
            case 'Jaringan':
                usefulLife = 6;
                salvageRate = 0.10; 
                break;
            default:
                return res.status(400).json({ error: `Kategori "${categoryName}" tidak memiliki aturan depresiasi yang ditentukan.` });
        }

        if (usefulLife <= 0) {
             return res.status(400).json({ error: `Usia manfaat untuk kategori "${categoryName}" tidak valid (${usefulLife} tahun).` });
        }

        const salvageValue = price * salvageRate;
        const depreciableBase = price - salvageValue;

        if (depreciableBase < 0) {
             return res.status(400).json({ error: 'Nilai residu tidak boleh lebih besar dari harga beli.' });
        }

        const annualDepreciation = depreciableBase / usefulLife;

        const schedule = [];
        let currentBookValue = price;
        let accumulatedDepreciation = 0;
        const startYear = new Date().getFullYear();

        const loopYears = Math.ceil(usefulLife);

        for (let i = 0; i < loopYears; i++) {
            const year = startYear + i;
            const beginningBookValue = parseFloat(currentBookValue.toFixed(2)); 

             if (beginningBookValue <= salvageValue || Math.abs(beginningBookValue - salvageValue) < 0.01) {
                schedule.push({
                     year: year,
                     beginningBookValue: parseFloat(salvageValue.toFixed(2)),
                     depreciationExpense: 0,
                     accumulatedDepreciation: parseFloat(accumulatedDepreciation.toFixed(2)),
                     endingBookValue: parseFloat(salvageValue.toFixed(2))
                 });
                 continue; 
             }


            let depreciationExpense = annualDepreciation;

            if (i === loopYears - 1 && usefulLife % 1 !== 0) {
                depreciationExpense = annualDepreciation * (usefulLife % 1);
            }

            if (beginningBookValue - depreciationExpense < salvageValue) {
                depreciationExpense = beginningBookValue - salvageValue;
            }
            if (depreciationExpense < 0) depreciationExpense = 0; 

            accumulatedDepreciation += depreciationExpense;
            currentBookValue = beginningBookValue - depreciationExpense;

            if (currentBookValue < salvageValue && Math.abs(currentBookValue - salvageValue) < 0.01) {
                 currentBookValue = salvageValue;
            }


            schedule.push({
                year: year,
                beginningBookValue: beginningBookValue, 
                depreciationExpense: parseFloat(depreciationExpense.toFixed(2)),
                accumulatedDepreciation: parseFloat(accumulatedDepreciation.toFixed(2)),
                endingBookValue: parseFloat(currentBookValue.toFixed(2))
            });
        }

        res.json({ schedule: schedule });

    } catch (error) {
        console.error("Error calculating simple depreciation:", error);
        res.status(500).json({ error: `Gagal menghitung depresiasi. Detail: ${error.message}` });
    }
};