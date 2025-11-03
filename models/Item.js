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
    
    warranty_duration_months: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Durasi garansi dalam bulan (misal: 3, 6, 12)'
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
    image_public_id: {
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