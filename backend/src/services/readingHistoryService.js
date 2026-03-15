const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

/**
 * ==================== FUNCTION 1: saveReadingHistory ====================
 * 
 * MỤC ĐÍCH: Lưu hoặc cập nhật lịch sử đọc khi user đọc 1 chapter
 * 
 * INPUT:
 * - userId: ID của user (lấy từ JWT token)
 * - storyId: ID của truyện
 * - chapterId: ID của chapter (từ database)
 * - chapterNumber: Số chapter (để hiển thị)
 * - readPercentage: % đọc được trong chapter (0-100, optional)
 * 
 * LOGIC:
 * 1. Validate: Kiểm tra story có tồn tại không?
 * 2. Validate: Kiểm tra chapter có thuộc story này không?
 * 3. Upsert: Nếu đã có history cho story này → UPDATE, chưa có → INSERT
 *    - Dùng upsert vì có unique constraint (user_id, story_id)
 * 4. Return: History record vừa tạo/update
 * 
 * ERROR HANDLING:
 * - Story not found → throw Error
 * - Chapter not found → throw Error
 * 
 * TODO: Bạn hãy viết code theo logic trên
 */
async function saveReadingHistory(userId, storyId, chapterNumber, readPercentage = 0) {
    // TODO 1: Validate story có tồn tại không?
    // Gợi ý: Dùng prisma.story.findUnique({ where: { story_id: storyId } })

    const story = await prisma.story.findUnique({
        where: {
            story_id: storyId,
        }
    })

    if (!story) throw new Error('Story not found');

    // TODO 2: Validate chapter có tồn tại và thuộc story này không?
    // Gợi ý: Dùng prisma.chapter.findFirst() với điều kiện chapter_id VÀ story_id

    const chapter = await prisma.chapter.findFirst({
        where: {
            story_id: storyId,
            chapter_number: chapterNumber,
        }
    })

    if (!chapter) throw new Error('Chapter not found');

    // TODO 3: Upsert history record
    // Gợi ý:
    // - where: Dùng unique constraint user_id_story_id
    // - update: Cập nhật chapter_id, chapter_number, read_at, read_percentage
    // - create: Tạo mới với tất cả fields
    const history = await prisma.readHistory.upsert({
        where: {
            user_id_story_id: {
                user_id: userId,
                story_id: storyId
            }
        },
        update: {
            chapter_id: chapter.chapter_id,
            chapter_number: chapterNumber,
            read_at: new Date(),
            read_percentage: readPercentage,
        },
        create: {
            user_id: userId,
            story_id: storyId,
            chapter_id: chapter.chapter_id,
            chapter_number: chapterNumber,
            read_percentage: readPercentage,
            read_at: new Date()
        }     
    })

    return history;
}

/**
 * ==================== FUNCTION 2: getReadingHistory ====================
 * 
 * MỤC ĐÍCH: Lấy danh sách lịch sử đọc của user (có phân trang)
 * 
 * INPUT:
 * - userId: ID của user
 * - limit: Số lượng records trả về (mặc định 20)
 * - offset: Bỏ qua bao nhiêu records (để phân trang)
 * 
 * LOGIC:
 * 1. Query: Lấy history của user với JOIN story và genres
 * 2. Sort: Theo read_at DESC (mới nhất trước)
 * 3. Pagination: Dùng take (limit) và skip (offset)
 * 4. Transform: Map data sang format đẹp hơn
 * 
 * OUTPUT:
 * Array các object với format:
 * {
 *   story_id, title, author, cover, chapter_count, genres,
 *   last_read_chapter, last_read_at, read_percentage
 * }
 * 
 * TODO: Bạn hãy viết code theo logic trên
 */

async function getReadingHistory(userId, limit = 20, offset = 0) {
    const histories = await prisma.readHistory.findMany({
        where: {
            user_id: userId,
        },
        include: {
            story: {
                include: {
                    storyGenres: {
                        include: {
                            genre: true,
                        }
                    }
                }
            }
        },
        orderBy: {
            read_at: "desc"
        },
        take: limit,
        skip: offset,
    })

    return histories.map(item => ({
        story_id: item.story.story_id,
        title: item.story.title,
        author: item.story.author,
        description: item.story.description,
        cover: item.story.cover,
        chapter_count: item.story.chapter_count,
        hot: item.story.hot,
        genres: item.story.storyGenres.map(sg => sg.genre.genre_name),
        last_read_chapter: item.chapter_number,
        last_read_at: item.read_at,
        read_percentage: item.read_percentage,
    }))
}

/**
 * ==================== FUNCTION 3: getLastReadChapter ====================
 * 
 * MỤC ĐÍCH: Lấy chapter cuối cùng mà user đã đọc của 1 story cụ thể
 * 
 * INPUT:
 * - userId: ID của user
 * - storyId: ID của story
 * 
 * LOGIC:
 * 1. Query: findUnique với unique constraint (user_id, story_id)
 * 2. Select: Chỉ lấy các fields cần thiết (chapter_number, read_percentage, read_at)
 * 
 * OUTPUT:
 * - Object: { chapter_number, read_percentage, read_at }
 * - null: Nếu chưa đọc story này
 * 
 * USE CASE: 
 * - Hiển thị nút "Đọc tiếp Chương X" trong StoryDetailPage
 * - Frontend dùng để navigate đến chapter đúng
 * 
 * TODO: Bạn hãy viết code theo logic trên
 */
async function getLastReadChapter(userId, storyId) {
    // TODO: Query history với findUnique
    // Gợi ý:
    // - where: { user_id_story_id: { user_id: userId, story_id: storyId } }
    // - select: { chapter_number: true, read_percentage: true, read_at: true }
    // - Trả về null nếu chưa đọc
    const lastReadChapter = await prisma.readHistory.findUnique({
        where: {
            user_id_story_id: {
                user_id: userId,
                story_id: storyId,
            }
        },
        select: {
            chapter_number: true,
            read_percentage: true,
            read_at: true,
        }
    })

    return lastReadChapter;
}

/**
 * ==================== FUNCTION 4: deleteReadingHistory ====================
 * 
 * MỤC ĐÍCH: Xóa lịch sử đọc của 1 story
 * 
 * INPUT:
 * - userId: ID của user
 * - storyId: ID của story cần xóa
 * 
 * LOGIC:
 * 1. Delete record với unique constraint (user_id, story_id)
 * 2. Catch error P2025 (record không tồn tại) và throw custom error
 * 
 * ERROR HANDLING:
 * - P2025: Record not found → throw 'Reading history not found'
 * 
 * TODO: Bạn hãy viết code theo logic trên
 */
async function deleteReadingHistory(userId, storyId) {
    try {
        // TODO: Delete với where unique constraint
        // Gợi ý: prisma.readHistory.delete({ where: { user_id_story_id: {...} } })
        await prisma.readHistory.delete({
            where: {
                user_id_story_id: {
                    user_id: userId,
                    story_id: storyId,
                }
            }
        })
    } catch (error) {
        // TODO: Handle Prisma error P2025
        // Gợi ý: Check error.code === 'P2025', throw new Error('Reading history not found')
        if (error.code === 'P2025') {
            throw new Error('Reading history not found');
        }

        throw error;
    }
}

/**
 * ==================== FUNCTION 5: clearAllHistory ====================
 * 
 * MỤC ĐÍCH: Xóa toàn bộ lịch sử đọc của user
 * 
 * INPUT:
 * - userId: ID của user
 * 
 * LOGIC:
 * - Dùng deleteMany để xóa tất cả records có user_id này
 * 
 * USE CASE:
 * - User muốn xóa sạch lịch sử
 * - Cần confirm dialog ở frontend trước khi gọi
 * 
 * TODO: Bạn hãy viết code theo logic trên
 */
async function clearAllHistory(userId) {
    // TODO: Delete tất cả history của user
    // Gợi ý: prisma.readHistory.deleteMany({ where: { user_id: userId } })
    await prisma.readHistory.deleteMany({
        where: {
            user_id: userId,
        }
    })
    
    return;
}

/**
 * ==================== FUNCTION 6: getHistoryCount ====================
 * 
 * MỤC ĐÍCH: Đếm tổng số lịch sử đọc (dùng cho pagination)
 * 
 * INPUT:
 * - userId: ID của user
 * 
 * OUTPUT:
 * - Number: Tổng số records
 * 
 * USE CASE:
 * - Tính toán số trang trong pagination
 * - Hiển thị "Lịch sử đọc (50 truyện)"
 * 
 * TODO: Bạn hãy viết code theo logic trên
 */
async function getHistoryCount(userId) {
    // TODO: Đếm số history records
    // Gợi ý: prisma.readHistory.count({ where: { user_id: userId } })
    const count = await prisma.readHistory.count({
        where: { user_id: userId, }
    })

    return count;
}

// Export tất cả functions
module.exports = {
    saveReadingHistory,
    getReadingHistory,
    getLastReadChapter,
    deleteReadingHistory,
    clearAllHistory,
    getHistoryCount,
};
