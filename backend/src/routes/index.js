const express = require('express');
const router = express.Router();

const storiesRouter = require('./stories');
const searchRouter = require('./search');
const novelRouter = require('./novel');
const comicRouter = require('./comic');
const charactersRouter = require('./characters');
const authRouter = require('./auth');

router.use('/', storiesRouter); // includes root, stories list and story endpoints
router.use('/api', searchRouter);
router.use('/api', novelRouter);
router.use('/api', comicRouter);
router.use('/api', charactersRouter);
router.use('/api/auth', authRouter);

module.exports = router;


