const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Department', {
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    division: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'departments',
    timestamps: true
  });
};