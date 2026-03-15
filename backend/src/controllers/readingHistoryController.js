const readingHistoryService = require('../services/readingHistoryService');

/**
 * ==================== CONTROLLER 1: saveReadingHistory ====================
 * 
 * ROUTE: POST /api/reading-history
 * 
 * REQUEST BODY:
 * {
 *   storyId: number,
 *   chapterNumber: number,
 *   readPercentage?: number (optional, default 0)
 * }
 * 
 * LOGIC:
 * 1. Extract userId từ req.user.userId (từ JWT middleware)
 * 2. Extract body data: storyId, chapterNumber, readPercentage
 * 3. Validate: Check required fields
 * 4. Validate: Parse to integers
 * 5. Call service: saveReadingHistory()
 * 6. Return: Success response
 * 
 * RESPONSE SUCCESS (200):
 * {
 *   success: true,
 *   message: "Reading history saved",
 *   data: { storyId, chapterNumber, lastReadAt }
 * }
 * 
 * RESPONSE ERROR:
 * - 400: Missing/Invalid fields
 * - 404: Story/Chapter not found
 * - 500: Server error
 * 
 * TODO: Bạn hãy viết code theo pattern của followController
 */
async function saveReadingHistory(req, res) {
    try {
        // TODO 1: Extract userId từ req.user
        const userId = req.user.userId;
        
        // TODO 2: Extract body data: storyId, chapterNumber, readPercentage
        const { storyId, chapterNumber, readPercentage } = req.body;
        const storyIdNum = parseInt(storyId);
        const chapterNum = parseInt(chapterNumber);
        const percentage = readPercentage ? parseInt(readPercentage) : 0;

        // TODO 3: Validate required fields
        // Gợi ý: Check storyId, chapterNumber có tồn tại không
        if (!storyId || !chapterNumber) {
            return res.status(400).json({
                success: false,
                message: 'storyId and chapterNumber are required',
            });
        }

        // TODO 4: Parse to integers và validate
        // Gợi ý: Dùng parseInt(), check isNaN()
        if (isNaN(storyIdNum) || isNaN(chapterNum)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid ID or number format',
            });
        }

        // TODO 5: Call service
        // Gợi ý: await readingHistoryService.saveReadingHistory(...)
        const history = await readingHistoryService.saveReadingHistory(userId, storyIdNum, chapterNum, percentage);

        // TODO 6: Return success response với format:
        // { success: true, message: 'Reading history saved', data: {...} }
        return res.status(200).json({
            success: true,
            message: 'Reading history saved',
            data: {
                storyId: storyIdNum,
                chapterNumber: chapterNum,
                readPercentage: percentage,
                read_at: history.read_at,
            }
        })
        
        
    } catch (error) {
        console.error('Error in saveReadingHistory controller:', error);

        // TODO 7: Error handling
        // Gợi ý: Check error.message để trả về status code phù hợp (400, 404, 500)
        let statusCode = 500;
        let errorMessage = 'Server error';

        if (error.message === 'Story not found' || error.message === 'Chapter not found') {
            statusCode = 404;
            errorMessage = error.message; 
        }

        return res.status(statusCode).json({
            success: false,
            message: errorMessage
        })
    }
}

/**
 * ==================== CONTROLLER 2: getReadingHistory ====================
 * 
 * ROUTE: GET /api/reading-history?limit=20&offset=0
 * 
 * QUERY PARAMS:
 * - limit: Số lượng records (default 20)
 * - offset: Bỏ qua bao nhiêu records (default 0)
 * 
 * LOGIC:
 * 1. Extract userId từ JWT
 * 2. Parse query params (limit, offset)
 * 3. Call service: getReadingHistory() và getHistoryCount()
 * 4. Return: histories + pagination info
 * 
 * RESPONSE SUCCESS (200):
 * {
 *   success: true,
 *   data: {
 *     histories: [...],
 *     total: 50,
 *     limit: 20,
 *     offset: 0,
 *     hasMore: true
 *   }
 * }
 * 
 * TODO: Bạn hãy viết code theo logic trên
 */
async function getReadingHistory(req, res) {
    try {
        // TODO 1: Extract userId
        const userId = req.user.userId;

        // TODO 2: Parse query params với default values
        // Gợi ý: parseInt(req.query.limit) || 20
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;


        // TODO 3: Call service để lấy data
        // Gợi ý: Dùng Promise.all() để gọi song song getReadingHistory() và getHistoryCount()
        const [histories, total] = await Promise.all([
            readingHistoryService.getReadingHistory(userId, limit, offset),
            readingHistoryService.getHistoryCount(userId),
        ])

        // TODO 4: Return response với pagination info
        // Gợi ý: hasMore = offset + limit < total
        return res.status(200).json({
            success: true,
            data: {
                histories: histories,
                total: total,
                limit: limit,
                offset: offset,
                hasMore: offset + limit < total
            }
        })
        
    } catch (error) {
        console.error('Error in getReadingHistory controller:', error);
        // TODO: Return 500 error
        return res.status(500).json({
            success: false,
            message: 'Server error',
        })
    }
}

/**
 * ==================== CONTROLLER 3: getLastReadChapter ====================
 * 
 * ROUTE: GET /api/reading-history/:storyId
 * 
 * PARAMS:
 * - storyId: ID của story
 * 
 * LOGIC:
 * 1. Extract userId và storyId
 * 2. Validate storyId
 * 3. Call service: getLastReadChapter()
 * 4. Return: Last read info (hoặc null nếu chưa đọc)
 * 
 * RESPONSE SUCCESS (200):
 * {
 *   success: true,
 *   data: {
 *     storyId: 1,
 *     lastReadChapter: 5,
 *     readPercentage: 80,
 *     lastReadAt: "2025-12-26T..."
 *   }
 * }
 * 
 * HOẶC nếu chưa đọc:
 * {
 *   success: true,
 *   data: null,
 *   message: "No reading history for this story"
 * }
 * 
 * TODO: Bạn hãy viết code theo logic trên
 */
async function getLastReadChapter(req, res) {
    try {
        // TODO 1: Extract userId và storyId
        const userId = req.user.userId;
        const storyId = req.params.storyId;
        // TODO 2: Validate storyId
        const storyIdNum = parseInt(storyId);
        if (isNaN(storyIdNum)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid story ID',
            })
        }
        // TODO 3: Call service getLastReadChapter()

        const history = await readingHistoryService.getLastReadChapter(userId, storyIdNum);
        // TODO 4: Return response
        // Gợi ý: Check nếu history === null thì trả về data: null với message khác
        if (!history) {
            return res.status(200).json({
                success: true,
                data: null,
                message: "No reading history for this story"
            })
        }

        return res.status(200).json({
            success: true,
            data: {
                storyId: storyId,
                lastReadChapter: history.chapter_number,
                readPercentage: history.read_percentage,
                lastReadAt: history.read_at,
            }
        })
        
    } catch (error) {
        console.error('Error in getLastReadChapter controller:', error);
        // TODO: Return 500 error
        return res.status(500).json({
            success: false,
            message: 'Server error',
        })
    }
}

/**
 * ==================== CONTROLLER 4: deleteReadingHistory ====================
 * 
 * ROUTE: DELETE /api/reading-history/:storyId
 * 
 * PARAMS:
 * - storyId: ID của story cần xóa
 * 
 * LOGIC:
 * 1. Extract userId và storyId
 * 2. Validate storyId
 * 3. Call service: deleteReadingHistory()
 * 4. Return: Success message
 * 
 * RESPONSE SUCCESS (200):
 * {
 *   success: true,
 *   message: "Reading history deleted"
 * }
 * 
 * RESPONSE ERROR:
 * - 400: Invalid story ID
 * - 404: Reading history not found
 * - 500: Server error
 * 
 * TODO: Bạn hãy viết code theo pattern trên
 */
async function deleteReadingHistory(req, res) {
    try {
        // TODO: Tự viết theo pattern của getLastReadChapter
        // 1. Extract userId và storyId
        // 2. Validate storyId
        // 3. Call service deleteReadingHistory()
        // 4. Return success response
        const userId = req.user.userId;
        const storyId = req.params.storyId;

        const storyIdNum = parseInt(storyId);
        if (isNaN(storyIdNum)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid story ID',
            })
        }

        await readingHistoryService.deleteReadingHistory(userId, storyIdNum);

        return res.status(200).json({
            success: true,
            message: "Reading history deleted",
        })
    } catch (error) {
        console.error('Error in deleteReadingHistory controller:', error);
        // TODO: Error handling - 404 nếu not found, 500 nếu server error

        let statusCode = 500;
        let errorMessage = 'Server error';

        if (error.message === "Reading history not found") {
            statusCode = 404;
            errorMessage = 'Reading history not found';
        }

        return res.status(statusCode).json({
            success: false,
            message: errorMessage,
        })
    }
}

/**
 * ==================== CONTROLLER 5: clearAllHistory ====================
 * 
 * ROUTE: DELETE /api/reading-history
 * 
 * LOGIC:
 * 1. Extract userId
 * 2. Call service: clearAllHistory()
 * 3. Return: Success message
 * 
 * RESPONSE SUCCESS (200):
 * {
 *   success: true,
 *   message: "All reading history cleared"
 * }
 * 
 * NOTE: Frontend nên có confirm dialog trước khi gọi API này
 * 
 * TODO: Bạn hãy tự viết code theo pattern trên
 */
async function clearAllHistory(req, res) {
    try {
        // TODO: Tự viết - Đơn giản nhất trong tất cả controllers
        // 1. Extract userId
        // 2. Call service clearAllHistory()
        // 3. Return success message
        const userId = req.user.userId;
        await readingHistoryService.clearAllHistory(userId);

        return res.status(200).json({
            success: true,
            message: "All history deleted",
        })
        
    } catch (error) {
        console.error('Error in clearAllHistory controller:', error);
        // TODO: Return 500 error
        return res.status(500).json({
            success: false,
            message: "Server error",
        })
    }
}

// Export tất cả controllers
module.exports = {
    saveReadingHistory,
    getReadingHistory,
    getLastReadChapter,
    deleteReadingHistory,
    clearAllHistory,
};
