const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Location', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    tableName: 'locations',
    timestamps: true
  });
};