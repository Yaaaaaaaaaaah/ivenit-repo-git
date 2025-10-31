const express = require('express');
const router = express.Router();

const itemController = require('../controllers/itemController');
const reportController = require('../controllers/reportController');
const maintenanceController = require('../controllers/maintenanceController');

router.get('/', itemController.list);
router.get('/items/create', itemController.showForm); 
router.post('/items', itemController.save);
router.get('/items/:id', itemController.detail);
router.get('/items/:id/edit', itemController.showForm);
router.post('/items/:id', itemController.save); 
router.post('/items/:id/delete', itemController.delete); 
router.get('/reports', reportController.showAssetReport);
router.get('/reports/maintenance', maintenanceController.showMaintenanceReport);
router.post('/maintenance-logs', maintenanceController.addLog);

module.exports = router;