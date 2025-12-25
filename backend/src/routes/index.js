const express = require('express');
const router = express.Router();

const storiesRouter = require('./stories');
const searchRouter = require('./search');
const novelRouter = require('./novel');
const comicRouter = require('./comic');
const charactersRouter = require('./characters');
const textDetectionRouter = require('./textDetection');
const authRouter = require('./auth');
const followRouter = require('./follow');

router.use('/', storiesRouter); // includes root, stories list and story endpoints
router.use('/api', searchRouter);
router.use('/api', novelRouter);
router.use('/api', comicRouter);
router.use('/api', charactersRouter);
router.use('/api/text-detection', textDetectionRouter);
router.use('/api/auth', authRouter);
router.use('/api', followRouter);

module.exports = router;


