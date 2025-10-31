const Asset = require('../models/Asset');
const qrcode = require('qrcode');

exports.getAllAssets = async (req, res) => {
  try {
    const assets = await Asset.findAll();
    res.render('assets/index', { assets: assets, title: 'Daftar Aset IT' });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.showCreateForm = (req, res) => {
    res.render('assets/create', { title: 'Tambah Aset Baru' });
};

exports.createAsset = async (req, res) => {
    try {
        await Asset.create(req.body);
        res.redirect('/');
    } catch (err) {
        res.status(500).send(err.message);
    }
};

exports.getAssetDetail = async (req, res) => {
    try {
        const asset = await Asset.findByPk(req.params.id);
        if (!asset) return res.status(404).send('Aset tidak ditemukan');

        const assetUrl = `${req.protocol}://${req.get('host')}/items/${asset.id}`;
        const qrCodeDataURL = await qrcode.toDataURL(assetUrl);

        res.render('assets/detail', { asset: asset, qrCodeDataURL: qrCodeDataURL, title: 'Detail Aset' });
    } catch (err) {
        res.status(500).send(err.message);
    }
};