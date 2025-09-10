const fs = require('fs');
const path = require('path');

function getStoriesPath() {
  return path.join(__dirname, '..', 'stories.json');
}

async function listStories() {
  const data = await fs.promises.readFile(getStoriesPath(), 'utf8');
  return JSON.parse(data);
}

async function getStoriesByGenre(genreName) {
  const decodedGenre = decodeURIComponent(genreName);
  const stories = await listStories();
  const filtered = stories.filter(story => {
    if (!story.genres) return false;
    if (Array.isArray(story.genres)) {
      return story.genres.some(g => g.toLowerCase().includes(decodedGenre.toLowerCase()));
    }
    return story.genres.toLowerCase().includes(decodedGenre.toLowerCase());
  });
  return { genre: decodedGenre, total: filtered.length, stories: filtered };
}

async function getStoryById(id) {
  const stories = await listStories();
  return stories.find(s => s.id === Number(id));
}

const chapterFileMap = {
  1: 'cothanky_chapter.json',
  2: 'otis_chapter.json',
  3: 'phongthan_chapter.json',
  4: 'quyam_chapter.json',
  5: 'tro_lai_la_sinh_vien_chapter.json',
  6: 'dong_nghiep_toi_la_mot_quai_vat_ta_di_chapter.json',
  7: 'idolatry_chapter.json',
  8: 'vet_seo_khong_phai_chapter.json',
  9: 'cam_heo_chem_bay_van_gioi_chapter.json',
  10: 'ke_xam_nhap_diu_dang_chapter.json',
  11: 'ngoai_ton_thien_tai_cua_nam_cung_the_gia_chapter.json',
  12: 'dai_quan_gia_la_ma_hoang_chapter.json',
  13: 'van_co_chi_ton_chapter.json',
  14: 'dai_phung_da_canh_nhan_chapter.json',
  15: 'luoi_va_luoi_hon_nua_chapter.json',
  16: 'tinh_yeu_muon_mang_chapter.json',
  17: 'chien_dich_than_cupid_chapter.json',
  18: 'gia_vo_lam_gioi_thuong_luu_chapter.json',
  19: 'phu_than_vo_dich_chi_dich_chapter.json',
  20: 'than_tham_sieu_linh_chapter.json',
  21: 'bat_hanh_theo_duoi_co_gai_xui_xeo_chapter.json',
  22: 'nguoi_cha_xac_song_chapter.json',
  23: 'pha_huyet_gia_chapter.json',
  24: 'song_con_chapter.json',
  25: 'tinh_yeu_ben_le_chapter.json'
};

async function listChapters(storyId) {
  const fileName = chapterFileMap[storyId];
  if (!fileName) return null;
  const dataPath = path.join(__dirname, '../../../crawler/story_chapter/', fileName);
  const data = await fs.promises.readFile(dataPath, 'utf8');
  return JSON.parse(data);
}

async function getChapter(storyId, chapterNumber) {
  const chapters = await listChapters(storyId);
  if (!chapters) return null;
  return chapters.find(c => c.chapter.replace('Chương ', '').replace('Chapter ', '') == chapterNumber);
}

async function searchStories(query) {
  const stories = await listStories();
  const searchTerm = query.toLowerCase();
  
  const filtered = stories.filter(story => {
    if (story.title && story.title.toLowerCase().includes(searchTerm)) return true;
    return false;
  });
  
  return {
    query: query,
    total: filtered.length,
    stories: filtered
  };
}


module.exports = {
  listStories,
  getStoriesByGenre,
  getStoryById,
  listChapters,
  getChapter,
  searchStories,
};


