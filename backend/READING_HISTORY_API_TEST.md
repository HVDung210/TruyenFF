# 📖 Hướng dẫn test Reading History API trên Postman

## 🔧 Setup

1. **Đăng nhập để lấy token:**
   ```
   POST http://localhost:5000/api/auth/login
   Body: { "email": "...", "password": "..." }
   → Copy accessToken
   ```

2. **Set Authorization header cho tất cả requests:**
   ```
   Headers:
   Authorization: Bearer <your_token>
   ```

---

## 📝 Test Case 1: Lưu lịch sử đọc

### Request
```
Method: POST
URL: http://localhost:5000/api/reading-history
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
Body:
{
  "storyId": 1,
  "chapterId": 1,
  "chapterNumber": 1,
  "readPercentage": 50
}
```

### Response Success (200)
```json
{
  "success": true,
  "message": "Reading history saved",
  "data": {
    "storyId": 1,
    "chapterNumber": 1,
    "lastReadAt": "2025-12-26T10:30:00.000Z"
  }
}
```

### Test scenarios:
- ✅ Lưu lần đầu → Tạo record mới
- ✅ Lưu lại với chapter khác → Update record
- ✅ Lưu với readPercentage khác nhau
- ❌ Missing fields → 400 Bad Request
- ❌ Invalid storyId → 404 Story not found

---

## 📋 Test Case 2: Lấy danh sách lịch sử

### Request
```
Method: GET
URL: http://localhost:5000/api/reading-history?limit=10&offset=0
Headers:
  Authorization: Bearer <token>
```

### Response Success (200)
```json
{
  "success": true,
  "data": {
    "histories": [
      {
        "story_id": 1,
        "title": "Tên truyện",
        "author": "Tác giả",
        "cover": "url...",
        "chapter_count": 100,
        "genres": ["Action", "Adventure"],
        "last_read_chapter": 5,
        "last_read_at": "2025-12-26T10:30:00.000Z",
        "read_percentage": 50
      }
    ],
    "total": 15,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

### Test scenarios:
- ✅ Lấy page 1: ?limit=10&offset=0
- ✅ Lấy page 2: ?limit=10&offset=10
- ✅ Default params: Không truyền query → limit=20, offset=0
- ✅ Empty result: User chưa đọc truyện nào → histories: []

---

## 🔍 Test Case 3: Lấy chapter cuối cùng đã đọc

### Request
```
Method: GET
URL: http://localhost:5000/api/reading-history/1
Headers:
  Authorization: Bearer <token>
```

### Response - Đã đọc (200)
```json
{
  "success": true,
  "data": {
    "storyId": 1,
    "lastReadChapter": 5,
    "readPercentage": 50,
    "lastReadAt": "2025-12-26T10:30:00.000Z"
  }
}
```

### Response - Chưa đọc (200)
```json
{
  "success": true,
  "data": null,
  "message": "No reading history for this story"
}
```

### Test scenarios:
- ✅ Story đã đọc → Return last chapter
- ✅ Story chưa đọc → Return null
- ❌ Invalid storyId → 400 Bad Request

---

## 🗑️ Test Case 4: Xóa lịch sử 1 story

### Request
```
Method: DELETE
URL: http://localhost:5000/api/reading-history/1
Headers:
  Authorization: Bearer <token>
```

### Response Success (200)
```json
{
  "success": true,
  "message": "Reading history deleted"
}
```

### Test scenarios:
- ✅ Xóa story đã đọc → Success
- ❌ Xóa story chưa đọc → 404 Not found
- ✅ Sau khi xóa, GET lại → data: null

---

## 🧹 Test Case 5: Xóa tất cả lịch sử

### Request
```
Method: DELETE
URL: http://localhost:5000/api/reading-history
Headers:
  Authorization: Bearer <token>
```

### Response Success (200)
```json
{
  "success": true,
  "message": "All reading history cleared"
}
```

### Test scenarios:
- ✅ Xóa tất cả → Success
- ✅ Sau khi xóa, GET list → histories: [], total: 0

---

## 🔄 Test Flow hoàn chỉnh

```
1. POST /reading-history (storyId=1, chapterNumber=1)
   → Lưu chapter 1

2. GET /reading-history/1
   → lastReadChapter: 1

3. POST /reading-history (storyId=1, chapterNumber=5)
   → Update lên chapter 5

4. GET /reading-history/1
   → lastReadChapter: 5 (đã update)

5. POST /reading-history (storyId=2, chapterNumber=1)
   → Lưu story mới

6. GET /reading-history
   → histories: [story1, story2], total: 2

7. DELETE /reading-history/1
   → Xóa story 1

8. GET /reading-history
   → histories: [story2], total: 1

9. DELETE /reading-history
   → Xóa tất cả

10. GET /reading-history
    → histories: [], total: 0
```

---

## ⚠️ Common Errors

### 401 Unauthorized
```json
{
  "error": "Access token is required"
}
```
**Fix:** Thêm Authorization header

### 400 Bad Request
```json
{
  "success": false,
  "message": "storyId, chapterId, and chapterNumber are required"
}
```
**Fix:** Check body có đủ fields không

### 404 Not Found
```json
{
  "success": false,
  "message": "Story not found"
}
```
**Fix:** Dùng storyId tồn tại trong database

---

## 📊 So sánh với Follow API

| Feature | Follow API | Reading History API |
|---------|-----------|---------------------|
| Follow story | POST /follow/:storyId | - |
| Unfollow story | POST /unfollow/:storyId | - |
| Save history | - | POST /reading-history |
| Get list | GET /followed-stories | GET /reading-history |
| Get status | GET /follow/:storyId/check | GET /reading-history/:storyId |
| Delete one | POST /unfollow/:storyId | DELETE /reading-history/:storyId |
| Delete all | - | DELETE /reading-history |

**Khác biệt:**
- Follow: Toggle on/off → Cần 2 endpoints riêng
- History: Auto update → Chỉ cần 1 endpoint POST

---

## 🎯 Next Steps

1. ✅ Test tất cả APIs trên Postman
2. ✅ Migrate database: `npx prisma migrate dev --name add_reading_history`
3. ✅ Đăng ký route trong server.js
4. ✅ Implement frontend hooks
5. ✅ Tích hợp vào ChapterPage (auto save)
6. ✅ Tạo HistoryPage để hiển thị
