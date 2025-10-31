const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('MaintenanceLog', {
    activity_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    technician_name: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'Tim IT'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    cost: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    }
  }, {
    tableName: 'maintenance_logs',
    timestamps: true
  });
};