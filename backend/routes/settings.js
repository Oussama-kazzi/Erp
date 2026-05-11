const router     = require('express').Router();
const auth       = require('../middleware/auth');
const Settings   = require('../models/CompanySettings');
const multer     = require('multer');
const path       = require('path');
const fs         = require('fs');

const FIELDS = ['companyName','companyEmail','companyPhone','companyAddress','companyCity','ice','rc','primaryColor','secondaryColor'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `logo_${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/png','image/jpeg','image/jpg','image/svg+xml','image/webp'];
    ok.includes(file.mimetype) ? cb(null, true) : cb(new Error('PNG, JPG, SVG ou WEBP uniquement'));
  },
});

// GET — public (no auth required so login page can show company info)
router.get('/', async (req, res) => {
  try {
    let s = await Settings.findOne();
    if (!s) s = await Settings.create({});
    res.json(s);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT — update fields + optional logo
router.put('/', auth, upload.single('logo'), async (req, res) => {
  try {
    const updates = {};
    FIELDS.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    if (req.file) {
      // Remove old logo file
      const current = await Settings.findOne();
      if (current?.logoUrl) {
        const old = path.join(__dirname, '..', current.logoUrl);
        if (fs.existsSync(old)) fs.unlinkSync(old);
      }
      updates.logoUrl = `/uploads/${req.file.filename}`;
    }

    const s = await Settings.findOneAndUpdate({}, { $set: updates }, { new: true, upsert: true });
    res.json(s);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// DELETE logo only
router.delete('/logo', auth, async (req, res) => {
  try {
    const current = await Settings.findOne();
    if (current?.logoUrl) {
      const file = path.join(__dirname, '..', current.logoUrl);
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
    const s = await Settings.findOneAndUpdate({}, { $set: { logoUrl: '' } }, { new: true, upsert: true });
    res.json(s);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

module.exports = router;
