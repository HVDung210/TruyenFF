const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const controller = require('../controllers/comicController');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'tmp');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    // Thêm random để tránh trùng tên file khi upload cùng lúc
    const uniqueId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    cb(null, `upload_${uniqueId}${ext}`);
  }
});

const upload = multer({ storage });

router.post('/comic-to-video/detect', upload.single('file'), controller.detectPanels);
router.post('/comic-to-video/detect-multiple', upload.array('files', 10), controller.detectPanelsMultiple);
router.post('/comic/crop-panels-multiple', upload.array('files', 10), controller.cropPanelsMultiple);
router.post('/comic/crop-from-data', upload.array('files', 10), controller.cropFromData);


module.exports = router;


