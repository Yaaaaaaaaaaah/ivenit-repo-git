const { sequelize, User } = require('../models');

async function promoteAdmin() {
    const email = process.argv[2];
    if (!email) {
        console.error('EROR: Harap sertakan email admin yang akan dipromosikan.');
        console.log('Contoh: npm run promote -- admin@email.com');
        return;
    }

    console.log(`Mencari pengguna dengan email: ${email}...`);

    try {
        await sequelize.authenticate();

        const user = await User.findOne({ where: { email } });

        if (!user) {
            console.error(`GAGAL: Pengguna dengan email "${email}" tidak ditemukan.`);
            return;
        }

        user.role = 'Admin';
        user.status = 'Active';
        await user.save();

        console.log(`OK! BERHASIL: Pengguna "${user.name}" (${user.email}) telah dipromosikan menjadi Admin dan statusnya sekarang Aktif.`);
        console.log('Silakan coba login kembali.');

    } catch (error) {
        console.error('ERROR! Terjadi error saat mempromosikan admin:', error);
    } finally {
        await sequelize.close();
    }
}

promoteAdmin();