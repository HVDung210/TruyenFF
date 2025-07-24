const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const prisma = require('@prisma/client');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello from Express backend!');
});

app.get('/api/stories', (req, res) => {
  const dataPath = path.join(__dirname, 'stories.json');
  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Không đọc được dữ liệu truyện' });
    res.json(JSON.parse(data));
  });
});

const chapterFileMap = {
  1: 'cothanky_chapter.json',
  2: 'otis_chapter.json',
  3: 'phongthan_chapter.json',
  4: 'quyam_chapter.json',
  5: 'tro_lai_la_sinh_vien_chapter.json',
  6: 'dong_nghiep_toi_la_mot_quai_vat_ta_di_chapter.json',
  7: 'idolatry_chapter.json',
  8: 'vet_seo_khong_phai_chapter.json'
};

app.get('/api/stories/:id', (req, res) => {
  const { id } = req.params;
  const dataPath = path.join(__dirname, 'stories.json');
  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Không đọc được dữ liệu truyện' });
    const stories = JSON.parse(data);
    const story = stories.find((s) => s.id === Number(id));
    if (!story) return res.status(404).json({ error: 'Không tìm thấy truyện' });
    res.json(story);
  });
});

app.get('/api/stories/:id/chapters', (req, res) => {
  const { id } = req.params;
  const fileName = chapterFileMap[id];
  if (!fileName) return res.status(404).json({ error: 'Không tìm thấy truyện' });
  const dataPath = path.join(__dirname, '../../crawler/', fileName);
  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Không đọc được dữ liệu chương' });
    res.json(JSON.parse(data));
  });
});

app.get('/api/stories/:id/chapters/:chapterNumber', (req, res) => {
  const { id, chapterNumber } = req.params;
  const fileName = chapterFileMap[id];
  if (!fileName) return res.status(404).json({ error: 'Không tìm thấy truyện' });
  const dataPath = path.join(__dirname, '../../crawler/', fileName);
  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Không đọc được dữ liệu chương' });
    const chapters = JSON.parse(data);
    const chapter = chapters.find(
      (c) => c.chapter.replace('Chương ', '').replace('Chapter ', '') == chapterNumber
    );
    if (!chapter) return res.status(404).json({ error: 'Không tìm thấy chương' });
    res.json(chapter);
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 