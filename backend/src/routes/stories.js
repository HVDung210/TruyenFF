const express = require('express');
const controller = require('../controllers/storiesController');
const router = express.Router();

router.get('/', controller.getRoot);
router.get('/api/stories', controller.getStories);
router.get('/api/stories/genre/:genreName', controller.getStoriesByGenre);
router.get('/api/stories/:id', controller.getStoryById);
router.get('/api/stories/:id/chapters', controller.getChapters);
router.get('/api/stories/:id/chapters/:chapterNumber', controller.getChapterByNumber);

module.exports = router;


