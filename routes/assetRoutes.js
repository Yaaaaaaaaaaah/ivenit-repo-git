const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const multer = require('multer');
const uploadLocal = require('../config/multer'); 

const uploadMemory = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 5 } 
});
const isProduction = process.env.NODE_ENV && process.env.NODE_ENV.trim() === 'production';

const uploadMiddleware = (req, res, next) => {
  if (isProduction) {
    uploadMemory.single('image')(req, res, next);
  } else {
    uploadLocal.single('image')(req, res, next);
  }
};

router.get('/', itemController.list);
router.get('/items/create', itemController.showCreateForm);
router.post('/items', uploadMiddleware, itemController.create);
router.get('/items/:id', itemController.show);
router.get('/items/:id/edit', itemController.showEditForm);
router.post('/items/:id', uploadMiddleware, itemController.update);
router.post('/items/:id/delete', itemController.delete);
router.get('/items/:id/qrcode', itemController.qrCode);

module.exports = router;