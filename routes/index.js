const express = require('express');
const router = express.Router();

const upload = require('../config/cloudinary');
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware');

const authController = require('../controllers/authController');
const itemController = require('../controllers/itemController');
const reportController = require('../controllers/reportController');
const maintenanceController = require('../controllers/maintenanceController');
const loanController = require('../controllers/loanController');
const adminController = require('../controllers/adminController');
const toolController = require('../controllers/toolController');

router.get('/login', authController.showLoginForm);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.get('/register', authController.showRegisterForm);
router.post('/register', authController.register);

router.get('/', isAuthenticated, itemController.list);

router.get('/items/new', isAuthenticated, itemController.showCreateForm);

router.get('/items/:id/edit', isAuthenticated, itemController.showEditForm);

router.get('/items/:id', isAuthenticated, itemController.show);

router.get('/items/:id/qrcode', isAuthenticated, itemController.qrCode);

router.post('/items', isAuthenticated, upload.single('image'), itemController.create);

router.post('/items/:id/edit', isAuthenticated, upload.single('image'), itemController.update);

router.post('/items/:id/delete', isAuthenticated, itemController.delete);

router.post('/items/:id/logs', isAuthenticated, maintenanceController.addLog);

router.get('/reports', isAuthenticated, reportController.showAssetReport);
router.get('/reports/maintenance', isAuthenticated, maintenanceController.showMaintenanceReport);

router.get('/loans', isAuthenticated, loanController.list);
router.post('/loans', isAuthenticated, loanController.create);
router.post('/loans/:id/return', isAuthenticated, loanController.returnItem);

router.get('/admin/users', isAuthenticated, isAdmin, adminController.listUsers);
router.post('/admin/users/:id/approve', isAuthenticated, isAdmin, adminController.approveUser);

router.get('/tools/depreciation-meter', isAuthenticated, toolController.renderDepreciationMeter);
router.post('/api/calculate-simple-depreciation', isAuthenticated, toolController.calculateSimpleDepreciation);

module.exports = router;