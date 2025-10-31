require('dotenv').config(); // Panggil di paling atas
const { Sequelize } = require('sequelize');

let sequelize;

// Cek apakah kita sedang 'online' (di Render)
if (process.env.NODE_ENV === 'production') {
  // === KONFIGURASI PRODUKSI (ONLINE) ===
  // (Data ini akan dibaca dari Environment Variables di Render)
  sequelize = new Sequelize(
    process.env.DB_NAME,    // Nama database dari Railway
    process.env.DB_USER,    // User dari Railway
    process.env.DB_PASSWORD, // Password dari Railway
    {
      host: process.env.DB_HOST,   // Host dari Railway
      port: process.env.DB_PORT,   // Port dari Railway
      dialect: 'mysql',
      dialectOptions: {
        // Opsi SSL/TLS wajib untuk database cloud seperti Railway/PlanetScale
        ssl: {
          require: true,
          rejectUnauthorized: false // (Setting umum untuk Railway)
        }
      },
      logging: false // Matikan log SQL di produksi
    }
  );
} else {
  // === KONFIGURASI DEVELOPMENT (LOKAL) ===
  // (Data ini yang Anda pakai di XAMPP)
  sequelize = new Sequelize(
    process.env.DB_NAME_LOCAL || 'ivenit_db', // Nama DB lokal
    process.env.DB_USER_LOCAL || 'root',      // User XAMPP
    process.env.DB_PASSWORD_LOCAL || '',      // Password XAMPP (biasanya kosong)
    {
      host: process.env.DB_HOST_LOCAL || 'localhost',
      dialect: 'mysql'
    }
  );
}

module.exports = sequelize;