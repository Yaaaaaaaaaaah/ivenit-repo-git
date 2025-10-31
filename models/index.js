const { Sequelize } = require('sequelize');
const sequelize = require('../config/database');

const ItemModel = require('./Item');
const CategoryModel = require('./Category');
const LocationModel = require('./Location');
const DepartmentModel = require('./Department');
const ItemSpecificationModel = require('./ItemSpecification');
const MaintenanceLogModel = require('./MaintenanceLog');
const LoanModel = require('./Loan');
const UserModel = require('./User'); 

const Item = ItemModel(sequelize);
const Category = CategoryModel(sequelize);
const Location = LocationModel(sequelize);
const Department = DepartmentModel(sequelize);
const ItemSpecification = ItemSpecificationModel(sequelize);
const MaintenanceLog = MaintenanceLogModel(sequelize);
const Loan = LoanModel(sequelize);
const User = UserModel(sequelize);

Item.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
Category.hasMany(Item, { foreignKey: 'categoryId' });

Item.belongsTo(Location, { foreignKey: 'locationId', as: 'location' });
Location.hasMany(Item, { foreignKey: 'locationId' });

Item.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
Department.hasMany(Item, { foreignKey: 'departmentId' });

Item.hasMany(ItemSpecification, { foreignKey: 'itemId', as: 'specifications', onDelete: 'CASCADE' });
ItemSpecification.belongsTo(Item, { foreignKey: 'itemId' });

Item.hasMany(MaintenanceLog, { foreignKey: 'itemId', as: 'logs', onDelete: 'CASCADE' });
MaintenanceLog.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });

Item.hasMany(Loan, { foreignKey: 'itemId', onDelete: 'CASCADE' });
Loan.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });

module.exports = {
  sequelize,
  Item,
  Category,
  Location,
  Department,
  ItemSpecification,
  MaintenanceLog,
  Loan,
  User
};