const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Asset = sequelize.define('Asset', {
  nama_aset: {
    type: DataTypes.STRING,
    allowNull: false
  },
  no_inventaris: {
    type: DataTypes.STRING,
    unique: true
  },
  model_tipe: DataTypes.STRING,
  kategori: DataTypes.STRING,
  lokasi: DataTypes.STRING,
  departemen: DataTypes.STRING,
  // Tambahkan semua field lain yang kamu butuhkan...
}, {
  timestamps: true 
});

module.exports = Asset;