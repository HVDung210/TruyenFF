const express = require('express');
const { postLLmSearch } = require('../controllers/searchController');
const router = express.Router();

router.post('/llm-search', postLLmSearch);

module.exports = router;


