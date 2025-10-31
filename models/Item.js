const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Item', {
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    no_inventaris: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    serial_number: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    model: {
      type: DataTypes.STRING,
      allowNull: true
    },
    host_pc_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    purchase_date: {
      type: DataTypes.DATEONLY, 
      allowNull: true
    },
    condition: {
      type: DataTypes.STRING,
      allowNull: false
    },
    pic_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    image_url: { 
      type: DataTypes.STRING,
      allowNull: true
    },
    availability_status: {
        type: DataTypes.ENUM('Tersedia', 'Dipinjam', 'Perbaikan'),
        defaultValue: 'Tersedia'
    }
  }, {
    tableName: 'items',
    timestamps: true
  });
};