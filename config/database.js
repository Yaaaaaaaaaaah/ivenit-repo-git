require('dotenv').config();
const { Sequelize } = require('sequelize');

let sequelize;

if (process.env.NODE_ENV === 'production') {
  // --- KONFIGURASI PRODUCTION (RAILWAY - MySQL) ---
  // Ini sekarang menggunakan variabel MySQL dari Railway
  
  if (!process.env.MYSQL_HOST) {
    throw new Error('Variabel database (MYSQL_HOST, dll) belum di-set di environment production.');
  }

  sequelize = new Sequelize(
    process.env.MYSQL_DATABASE, // Nama DB dari Railway
    process.env.MYSQL_USER,     // User dari Railway
    process.env.MYSQL_PASSWORD, // Password dari Railway
    {
      host: process.env.MYSQL_HOST, // Host dari Railway
      port: process.env.MYSQL_PORT, // Port dari Railway
      dialect: 'mysql', // Dialeknya tetap mysql
      logging: false,
      dialectOptions: {
        // Opsi SSL mungkin diperlukan oleh Railway untuk MySQL
        ssl: {
          require: true,
          rejectUnauthorized: false 
        }
      }
    }
  );

} else {
  // --- KONFIGURASI DEVELOPMENT (LOCALHOST - MySQL) ---
  // Ini tetap sama, pakai MySQL lokal Anda
  sequelize = new Sequelize(
    process.env.DB_NAME_LOCAL || 'ivenit_db', 
    process.env.DB_USER_LOCAL || 'root',      
    process.env.DB_PASSWORD_LOCAL || '',      
    {
      host: process.env.DB_HOST_LOCAL || 'localhost',
      dialect: 'mysql',
      logging: false 
    }
  );
}

module.exports = sequelize;