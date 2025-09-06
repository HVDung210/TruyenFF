const express = require('express');
const { createCharacterRefsHandler } = require('../controllers/characterController');
const router = express.Router();

router.post('/novel-to-comic/create-character-refs', ...createCharacterRefsHandler);

module.exports = router;


