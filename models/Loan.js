const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Loan', {
    borrower_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    loan_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    return_date: {
      type: DataTypes.DATEONLY,
      allowNull: true 
    },
    status: {
      type: DataTypes.ENUM('Dipinjam', 'Dikembalikan'),
      defaultValue: 'Dipinjam'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'loans',
    timestamps: true
  });
};