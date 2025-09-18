const { PrismaClient } = require('../generated/prisma');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Mapping từ story title sang filename
const storyFilenameMap = {
  "Cổ Thần Ký": "cothanky_chapter.json",
  "Otis": "otis_chapter.json", 
  "Phong Thần: Nhiệm Vụ Tuyệt Mật": "phongthan_chapter.json",
  "Quỷ Ám": "quyam_chapter.json",
  "Trở Lại Là Sinh Viên": "tro_lai_la_sinh_vien_chapter.json",
  "Đồng Nghiệp Tôi Là Một Quái Vật Tà Dị!": "dong_nghiep_toi_la_mot_quai_vat_ta_di_chapter.json",
  "Idolatry": "idolatry_chapter.json",
  "Vết Sẹo Không Phai": "vet_seo_khong_phai_chapter.json",
  "Kẻ Xâm Nhập Dịu Dàng": "ke_xam_nhap_diu_dang_chapter.json",
  "Ngoại Tôn Thiên Tài Của Nam Cung Thế Gia": "ngoai_ton_thien_tai_cua_nam_cung_the_gia_chapter.json",
  "Đại Quản Gia Là Ma Hoàng": "dai_quan_gia_la_ma_hoang_chapter.json",
  "Vạn Cổ Chí Tôn": "van_co_chi_ton_chapter.json",
  "Đại Phụng Đả Canh Nhân": "dai_phung_da_canh_nhan_chapter.json",
  "Lười Và Lười Hơn Nữa": "luoi_va_luoi_hon_nua_chapter.json",
  "Tình Yêu Muộn Màng": "tinh_yeu_muon_mang_chapter.json",
  "Chiến Dịch Thần Cupid": "chien_dich_than_cupid_chapter.json",
  "Giả Vờ Làm Giới Thượng Lưu": "gia_vo_lam_gioi_thuong_luu_chapter.json",
  "Phủ Thần: Vô Địch Chi Địch": "phu_than_vo_dich_chi_dich_chapter.json",
  "Thần Thám Siêu Linh": "than_tham_sieu_linh_chapter.json",
  "Bất Hạnh Theo Đuổi Cô Gái Xui Xẻo": "bat_hanh_theo_duoi_co_gai_xui_xeo_chapter.json",
  "Người Cha Xác Sống": "nguoi_cha_xac_song_chapter.json",
  "Phá Huyết Giả": "pha_huyet_gia_chapter.json"
};

async function importData() {
  try {
    console.log(' Bắt đầu import dữ liệu...');

    // 1. Đọc stories.json
    const storiesPath = path.join(__dirname, '../stories.json');
    const storiesData = JSON.parse(fs.readFileSync(storiesPath, 'utf8'));
    console.log(` Tìm thấy ${storiesData.length} truyện`);

    // 2. Import genres trước
    console.log('  Importing genres...');
    const allGenres = new Set();
    storiesData.forEach(story => {
      if (story.genres) {
        story.genres.forEach(genre => allGenres.add(genre));
      }
    });

    const genreMap = {};
    for (const genreName of allGenres) {
      const genre = await prisma.genre.upsert({
        where: { genre_name: genreName },
        update: {},
        create: { genre_name: genreName }
      });
      genreMap[genreName] = genre.genre_id;
      console.log(` Genre: ${genreName}`);
    }

    // 3. Import stories
    console.log(' Importing stories...');
    for (const storyData of storiesData) {
      console.log(` Importing: ${storyData.title}`);
      
      const story = await prisma.story.upsert({
        where: { story_id: storyData.id },
        update: {
          title: storyData.title,
          description: storyData.description,
          author: storyData.author || storyData.authors?.[0] || "Đang Cập Nhật",
          cover: storyData.cover,
          status: storyData.status,
          chapter_count: storyData.chapter_count,
          hot: storyData.hot || false,
          time: storyData.time
        },
        create: {
          story_id: storyData.id,
          title: storyData.title,
          description: storyData.description,
          author: storyData.author || storyData.authors?.[0] || "Đang Cập Nhật",
          cover: storyData.cover,
          status: storyData.status,
          chapter_count: storyData.chapter_count,
          hot: storyData.hot || false,
          time: storyData.time
        }
      });

      // 4. Link genres to story
      if (storyData.genres) {
        // Xóa các genre cũ
        await prisma.storyGenres.deleteMany({
          where: { story_id: story.story_id }
        });

        // Thêm genres mới
        for (const genreName of storyData.genres) {
          await prisma.storyGenres.create({
            data: {
              story_id: story.story_id,
              genre_id: genreMap[genreName]
            }
          });
        }
        console.log(`   Linked ${storyData.genres.length} genres`);
      }

      // 5. Import chapters nếu có file chapter
      const chapterFilename = storyFilenameMap[storyData.title];
      if (chapterFilename) {
        const chapterPath = path.join(__dirname, '../../../crawler/story_chapter', chapterFilename);
        
        if (fs.existsSync(chapterPath)) {
          console.log(`  📑 Importing chapters from: ${chapterFilename}`);
          
          const chapterData = JSON.parse(fs.readFileSync(chapterPath, 'utf8'));
          
          // Xóa chapters cũ
          await prisma.chapterImage.deleteMany({
            where: {
              chapter: {
                story_id: story.story_id
              }
            }
          });
          await prisma.chapter.deleteMany({
            where: { story_id: story.story_id }
          });

          // Import chapters mới
          for (let i = 0; i < chapterData.length; i++) {
            const chapterInfo = chapterData[i];
            const chapterNumber = i + 1;
            
            const chapter = await prisma.chapter.create({
              data: {
                story_id: story.story_id,
                chapter_number: chapterNumber,
                chapter_title: chapterInfo.chapter
              }
            });

            // Import chapter images
            if (chapterInfo.images && chapterInfo.images.length > 0) {
              for (let j = 0; j < chapterInfo.images.length; j++) {
                await prisma.chapterImage.create({
                  data: {
                    chapter_id: chapter.chapter_id,
                    image_order: j + 1,
                    image_url: chapterInfo.images[j]
                  }
                });
              }
              console.log(`     Chapter ${chapterNumber}: ${chapterInfo.images.length} images`);
            }
          }
        } else {
          console.log(`   Chapter file not found: ${chapterFilename}`);
        }
      } else {
        console.log(`    No chapter mapping found for: ${storyData.title}`);
      }
    }

    console.log(' Import hoàn thành!');
    
    // 6. Thống kê
    const stats = await prisma.$queryRaw`
      SELECT 
        (SELECT COUNT(*) FROM "Story") as stories_count,
        (SELECT COUNT(*) FROM "Chapter") as chapters_count,
        (SELECT COUNT(*) FROM "ChapterImage") as images_count,
        (SELECT COUNT(*) FROM "Genre") as genres_count
    `;
    
    console.log('\n Thống kê:');
    console.log(` Stories: ${stats[0].stories_count}`);
    console.log(` Chapters: ${stats[0].chapters_count}`);
    console.log(`  Images: ${stats[0].images_count}`);
    console.log(`  Genres: ${stats[0].genres_count}`);

  } catch (error) {
    console.error(' Lỗi khi import:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Chạy import
if (require.main === module) {
  importData()
    .then(() => {
      console.log(' Import thành công!');
      process.exit(0);
    })
    .catch((error) => {
      console.error(' Import thất bại:', error);
      process.exit(1);
    });
}

module.exports = { importData };
