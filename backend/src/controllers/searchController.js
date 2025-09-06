const { llmSearch } = require('../services/searchService');

async function postLLmSearch(req, res) {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Vui lòng nhập nội dung tìm kiếm' });
    const result = await llmSearch(query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi tìm kiếm truyện', details: error.message });
  }
}

module.exports = { postLLmSearch };


