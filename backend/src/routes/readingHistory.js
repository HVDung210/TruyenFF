const express = require('express');
const router = express.Router();
const readingHistoryController = require('../controllers/readingHistoryController');
const { authenticateToken } = require('../middlewares/authMiddleware');

/**
 * ==================== READING HISTORY ROUTES ====================
 * 
 * Base URL: /api/reading-history
 * 
 * TẤT CẢ routes đều cần authentication middleware vì:
 * - Lịch sử đọc là data riêng tư của user
 * - Cần userId từ JWT để xác định user nào
 * - Không cho phép guest access (guest sẽ dùng localStorage)
 */

// Apply authentication middleware cho TẤT CẢ routes
router.use(authenticateToken);

/**
 * TODO 1: Route để LƯU/CẬP NHẬT lịch sử đọc
 * 
 * Endpoint: POST /api/reading-history
 * 
 * Body: 
 * {
 *   storyId: number,
 *   chapterId: number,
 *   chapterNumber: number,
 *   readPercentage?: number
 * }
 * 
 * Khi nào gọi:
 * - User mở chapter → Sau 3s tự động save
 * - User scroll đến cuối chapter → Update readPercentage = 100
 * 
 * Gợi ý: router.post('/', controller.saveReadingHistory)
 */
router.post(
    '/',
    readingHistoryController.saveReadingHistory
);

/**
 * TODO 2: Route để LẤY DANH SÁCH lịch sử đọc (có pagination)
 * 
 * Endpoint: GET /api/reading-history?limit=20&offset=0
 * 
 * Query params:
 * - limit: Số lượng records (default 20)
 * - offset: Bỏ qua bao nhiêu records (pagination)
 * 
 * Khi nào gọi:
 * - User vào trang "Lịch sử đọc"
 * - Load more khi scroll đến cuối trang
 * 
 * Gợi ý: router.get('/', controller.getReadingHistory)
 */
router.get(
    '/',
    readingHistoryController.getReadingHistory
);

/**
 * TODO 3: Route để LẤY CHAPTER CUỐI CÙNG đã đọc của 1 story
 * 
 * Endpoint: GET /api/reading-history/:storyId
 * 
 * Params:
 * - storyId: ID của story
 * 
 * Khi nào gọi:
 * - User vào StoryDetailPage → Hiển thị "Đọc tiếp Chương X"
 * - Click "Đọc tiếp" → Navigate đến chapter đúng
 * 
 * Gợi ý: router.get('/:storyId', controller.getLastReadChapter)
 */
router.get(
    '/:storyId',
    readingHistoryController.getLastReadChapter
);

/**
 * TODO 4: Route để XÓA lịch sử của 1 story
 * 
 * Endpoint: DELETE /api/reading-history/:storyId
 * 
 * Params:
 * - storyId: ID của story cần xóa
 * 
 * Khi nào gọi:
 * - User click nút "Xóa" trong trang Lịch sử đọc
 * - Swipe to delete trên mobile
 * 
 * Gợi ý: router.delete('/:storyId', controller.deleteReadingHistory)
 */
router.delete(
    '/:storyId',
    readingHistoryController.deleteReadingHistory
);

/**
 * TODO 5: Route để XÓA TẤT CẢ lịch sử
 * 
 * Endpoint: DELETE /api/reading-history
 * 
 * Body: Không cần (userId lấy từ JWT)
 * 
 * Khi nào gọi:
 * - User click "Xóa tất cả lịch sử"
 * - CẦN confirm dialog ở frontend trước khi gọi
 * 
 * Gợi ý: router.delete('/', controller.clearAllHistory)
 * 
 * LƯU Ý: Route này phải để CUỐI CÙNG vì:
 * - DELETE / sẽ match trước DELETE /:storyId nếu đặt trước
 * - Express router match theo thứ tự từ trên xuống
 */
router.delete(
    '/',
    readingHistoryController.clearAllHistory
);

/**
 * TỔNG KẾT ROUTES:
 * 
 * POST   /api/reading-history              → Save/Update history
 * GET    /api/reading-history              → Get list (pagination)
 * GET    /api/reading-history/:storyId     → Get last read chapter
 * DELETE /api/reading-history/:storyId     → Delete 1 story history
 * DELETE /api/reading-history              → Delete all history
 * 
 * Pattern nhất quán:
 * - Tất cả đều có authenticateToken
 * - Tất cả đều return JSON với format { success, message, data }
 * - Error handling thống nhất (400, 404, 500)
 */

module.exports = router;
