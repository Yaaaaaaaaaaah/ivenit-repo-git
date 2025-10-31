const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');

router.get('/', assetController.getAllAssets);
router.get('/items/create', assetController.showCreateForm);
router.post('/items', assetController.createAsset);
router.get('/items/:id', assetController.getAssetDetail);
// router.get('/items/:id/edit', assetController.showEditForm);
// router.post('/items/:id/update', assetController.updateAsset);
// router.post('/items/:id/delete', assetController.deleteAsset);

module.exports = router;