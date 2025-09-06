const storiesService = require('../services/storiesService');

async function getRoot(req, res) {
  res.send('Hello from Express backend!');
}

async function getStories(req, res) {
  try {
    const stories = await storiesService.listStories();
    res.json(stories);
  } catch (e) {
    res.status(500).json({ error: 'Không đọc được dữ liệu truyện' });
  }
}

async function getStoriesByGenre(req, res) {
  try {
    const result = await storiesService.getStoriesByGenre(req.params.genreName);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Không đọc được dữ liệu truyện' });
  }
}

async function getStoryById(req, res) {
  try {
    const story = await storiesService.getStoryById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Không tìm thấy truyện' });
    res.json(story);
  } catch (e) {
    res.status(500).json({ error: 'Không đọc được dữ liệu truyện' });
  }
}

async function getChapters(req, res) {
  try {
    const chapters = await storiesService.listChapters(req.params.id);
    if (!chapters) return res.status(404).json({ error: 'Không tìm thấy truyện' });
    res.json(chapters);
  } catch (e) {
    res.status(500).json({ error: 'Không đọc được dữ liệu chương' });
  }
}

async function getChapterByNumber(req, res) {
  try {
    const chapter = await storiesService.getChapter(req.params.id, req.params.chapterNumber);
    if (!chapter) return res.status(404).json({ error: 'Không tìm thấy chương' });
    res.json(chapter);
  } catch (e) {
    res.status(500).json({ error: 'Không đọc được dữ liệu chương' });
  }
}

module.exports = {
  getRoot,
  getStories,
  getStoriesByGenre,
  getStoryById,
  getChapters,
  getChapterByNumber,
};


