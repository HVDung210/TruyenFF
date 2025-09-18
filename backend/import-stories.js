#!/usr/bin/env node

const { importData } = require('./src/scripts/importData');

console.log(' Bắt đầu import dữ liệu truyện...');
console.log(' Đang đọc từ:');
console.log('  - backend/src/stories.json');
console.log('  - crawler/story_chapter/*.json');
console.log('');

importData()
  .then(() => {
    console.log('\n Import hoàn thành!');
    console.log(' Bạn có thể mở Prisma Studio để xem dữ liệu:');
    console.log('   npx prisma studio');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n Import thất bại:', error.message);
    process.exit(1);
  });
