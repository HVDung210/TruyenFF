# 🚀 Setup Reading History Feature - Backend

## ✅ Checklist

### 1. Database Migration
```bash
# Chạy trong thư mục backend
npx prisma migrate dev --name add_reading_history_fields

# Hoặc nếu gặp lỗi, reset database (CHÚ Ý: Mất hết data)
npx prisma migrate reset
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate
```

### 2. Files đã tạo
- ✅ `prisma/schema.prisma` - Đã sửa model ReadHistory
- ✅ `src/services/readingHistoryService.js` - Business logic
- ✅ `src/controllers/readingHistoryController.js` - HTTP handlers
- ✅ `src/routes/readingHistory.js` - API endpoints
- ✅ `src/routes/index.js` - Đã đăng ký route

### 3. Kiểm tra server chạy
```bash
# Start server
npm start

# Check console có lỗi không
# Nếu có lỗi về Prisma → Chạy lại: npx prisma generate
```

---

## 📝 Thay đổi trong Schema

### Trước:
```prisma
model ReadHistory {
  history_id      Int      @id @default(autoincrement())
  user_id         Int
  story_id        Int
  chapter_id      Int
  last_read_page  Int?
  read_at         DateTime @default(now())
  
  @@index([user_id])
  @@index([story_id])
  @@index([chapter_id])
}
```

### Sau:
```prisma
model ReadHistory {
  history_id       Int      @id @default(autoincrement())
  user_id          Int
  story_id         Int
  chapter_id       Int
  chapter_number   Int      // ✅ THÊM: Để hiển thị "Chương X"
  last_read_page   Int?
  read_percentage  Int?     @default(0) // ✅ THÊM: % đọc
  read_at          DateTime @default(now())
  
  @@index([user_id, read_at]) // ✅ SỬA: Tối ưu query sorted
  @@index([user_id, story_id]) // ✅ THÊM: Check user đã đọc story
  @@index([story_id])
  @@unique([user_id, story_id]) // ✅ THÊM: 1 user = 1 history/story
}
```

**Lý do thay đổi:**
1. `chapter_number`: Để hiển thị "Đọc tiếp Chương 5" (không dùng chapter_id vì là auto-increment)
2. `read_percentage`: Track % đọc trong chapter (nice to have)
3. `@@unique([user_id, story_id])`: Đảm bảo 1 user chỉ có 1 record cho 1 story → Dùng upsert
4. Index tối ưu: Query lịch sử của user, sorted by time

---

## 🧪 Test Backend

### Test 1: Check Prisma Client
```javascript
// Tạo file test.js trong backend/src
const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

async function test() {
  // Test query ReadHistory
  const histories = await prisma.readHistory.findMany({
    take: 5,
  });
  
  console.log('ReadHistory records:', histories);
}

test();
```

### Test 2: Test API với Postman
Xem file: `READING_HISTORY_API_TEST.md`

---

## 🎯 API Endpoints Summary

```
Base URL: /api/reading-history

POST   /                    → Save/Update history
GET    /                    → Get list (pagination)
GET    /:storyId            → Get last read chapter
DELETE /:storyId            → Delete 1 story
DELETE /                    → Clear all
```

**Tất cả đều cần Authentication:**
```
Headers:
  Authorization: Bearer <token>
```

---

## 🔄 Tự học: So sánh với Follow Feature

| Aspect | Follow | Reading History |
|--------|--------|----------------|
| **Schema** | FollowedStories (user_id, story_id, followed_at) | ReadHistory (user_id, story_id, chapter_number, ...) |
| **Unique Constraint** | `@@id([user_id, story_id])` | `@@unique([user_id, story_id])` |
| **Service Logic** | follow/unfollow riêng biệt | Chỉ cần save (upsert tự động) |
| **Routes** | POST /follow, POST /unfollow | POST /reading-history (upsert) |
| **Use Case** | Bookmark truyện yêu thích | Track tiến độ đọc |

---

## 📚 Học từ Code Comments

### Service Layer (readingHistoryService.js)
- **saveReadingHistory**: Upsert pattern, validate story/chapter
- **getReadingHistory**: Pagination, JOIN với story/genres
- **getLastReadChapter**: Query với unique constraint
- **deleteReadingHistory**: Handle Prisma P2025 error
- **clearAllHistory**: DeleteMany pattern

### Controller Layer (readingHistoryController.js)
- Extract userId từ JWT
- Validate input (parseInt, isNaN)
- Call service
- Error handling (400, 404, 500)
- Response format thống nhất

### Route Layer (readingHistory.js)
- Apply authenticateToken middleware
- RESTful naming
- Route ordering (specific → generic)

---

## 🐛 Troubleshooting

### Lỗi: "Cannot find module './generated/prisma'"
```bash
npx prisma generate
```

### Lỗi: "Unique constraint failed"
- Bình thường! Đó là behavior của upsert
- Khi save lần 2 cho cùng story → Update thay vì error

### Lỗi: "Chapter not found"
- Check chapterId có đúng không
- Check chapter có thuộc story này không

### Lỗi: 401 Unauthorized
- Check token có đúng không
- Token có expired không

---

## 📖 Next: Frontend Implementation

Sau khi backend hoàn thành:
1. Tạo utils/readingHistoryStorage.js (localStorage cho guest)
2. Thêm hooks vào useStoriesQuery.js
3. Auto save trong ChapterPage
4. Tạo HistoryPage để hiển thị
5. "Đọc tiếp" button trong StoryDetailPage

Xem tiếp phần Frontend! 🚀
