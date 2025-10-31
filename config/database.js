require('dotenv').config();
const { Sequelize } = require('sequelize');

let sequelize;

if (process.env.NODE_ENV === 'production') {
  sequelize = new Sequelize(
    process.env.DB_NAME,    
    process.env.DB_USER,    
    process.env.DB_PASSWORD, 
    {
      host: process.env.DB_HOST,   
      port: process.env.DB_PORT,   
      dialect: 'mysql',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false 
        }
      },
      logging: false 
    }
  );
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME_LOCAL || 'ivenit_db', 
    process.env.DB_USER_LOCAL || 'root',      
    process.env.DB_PASSWORD_LOCAL || '',      
    {
      host: process.env.DB_HOST_LOCAL || 'localhost',
      dialect: 'mysql'
    }
  );
}

module.exports = sequelize;