const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const uploadCloud = require('../config/cloudinary'); 
const uploadLocal = require('../config/multer'); 

const uploadMiddleware = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    uploadCloud.single('image')(req, res, next);
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

module.exports = router;