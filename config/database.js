require('dotenv').config();
const { Sequelize } = require('sequelize');

let sequelize;

if (process.env.NODE_ENV === 'production') {
  
  if (!process.env.MYSQL_HOST) {
    throw new Error('Variabel database (MYSQL_HOST, dll) belum di-set di environment production.');
  }

  sequelize = new Sequelize(
    process.env.MYSQL_DB || process.env.MYSQL_DATABASE, 
    process.env.MYSQL_USER,     
    process.env.MYSQL_PASSWORD, 
    {
      host: process.env.MYSQL_HOST, 
      port: process.env.MYSQL_PORT, 
      dialect: 'mysql', 
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false 
        }
      }
    }
  );
} else {
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