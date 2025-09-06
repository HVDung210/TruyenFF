const express = require('express');
const controller = require('../controllers/novelController');
const router = express.Router();

router.post('/novel-to-comic/analyze', controller.analyze);
router.post('/novel-to-comic/add-dialogue', controller.addDialogue);
router.post('/novel-to-comic/generate-images', controller.generateImagesController);
router.post('/novel-to-comic/generate-images-consistent', controller.generateImagesConsistentController);
router.post('/novel-to-comic/upload-single-panel-to-gcs', controller.uploadSinglePanelToGcs);
router.post('/novel-to-comic/upload-panel-stream', controller.uploadPanelStream);
router.get('/novel-content/:filename', controller.getNovelContentController);
router.get('/proxy-image', controller.proxyImageController);

module.exports = router;


