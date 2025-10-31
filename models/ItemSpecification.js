const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('ItemSpecification', {
    spec_key: {
      type: DataTypes.STRING,
      allowNull: false
    },
    spec_value: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    tableName: 'item_specifications',
    timestamps: true
  });
};