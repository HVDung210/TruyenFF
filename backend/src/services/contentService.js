const fs = require('fs');
const path = require('path');

async function getNovelContent(filename) {
  const dataPath = path.join(__dirname, '../../../crawler/novel_chapters/', filename);
  const data = await fs.promises.readFile(dataPath, 'utf8');
  try {
    const novelData = JSON.parse(data);
    return { content: novelData[0]?.content || novelData.content || data, filename };
  } catch (e) {
    return { content: data, filename };
  }
}

async function proxyImage(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch image');
  const buffer = await response.buffer();
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  return { buffer, contentType };
}

module.exports = { getNovelContent, proxyImage };


