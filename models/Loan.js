const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Loan', {
    borrower_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    
    borrower_phone: {
      type: DataTypes.STRING,
      allowNull: true, 
      comment: 'No. WhatsApp Peminjam'
    },

    loan_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    
    due_date: {
      type: DataTypes.DATEONLY,
      allowNull: true, 
      comment: 'Tanggal Batas Peminjaman / Jatuh Tempo'
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