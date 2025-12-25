const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

/**
 * Follow a story
 * @param {number} userId - User ID from JWT
 * @param {number} storyId - Story ID from URL
 * @returns {Promise<Object>} Follow record
 * @throws {Error} If story not found
 */

async function followStory(userId, storyId) {

    // Kiểm tra xem truyện có tồn tại không
    const story = await prisma.story.findUnique({
        where: { story_id: storyId },
    });

    if (!story) {
        throw new Error('Story not found');
    }

    const follow = await prisma.followedStories.upsert({
        where: {
            user_id_story_id: {
                user_id: userId,
                story_id: storyId
            }
        },
        update: {
            followed_at: new Date(),
        },
        create: {
            user_id: userId,
            story_id: storyId,
        },
    });
    return follow;
}

/**
 * TODO: Viết function unfollowStory
 * Gợi ý:
 * - Input: userId, storyId
 * - Process: 
 *   1. Xóa record trong bảng FollowedStories bằng prisma.followedStories.delete()
 *   2. Sử dụng where với user_id_story_id composite key
 * - Error handling: Nếu record không tồn tại (Prisma error code 'P2025'), throw error "Bạn chưa theo dõi truyện này"
 * - Return: deleted record hoặc success message
 */
async function unfollowStory(userId, storyId) {
    try {
        return await prisma.followedStories.delete({
            where: {
                user_id_story_id: {
                    user_id: userId,
                    story_id: storyId
                },
            },
        })
    } catch (error) {
        if (error.code === 'P2025') {
            throw new Error('Bạn chưa theo dõi truyện này');
        }
        throw error;
    }
}

/**
 * TODO: Viết function getFollowedStories
 * Gợi ý:
 * - Input: userId
 * - Process:
 *   1. Query prisma.followedStories.findMany() với where: { user_id: userId }
 *   2. Include story details bằng: include: { story: { include: { storyGenres: { include: { genre: true } } } } }
 *   3. Sort theo followed_at DESC (mới nhất trước)
 *   4. Transform data để trả về array of stories với format đẹp
 * - Return: Array of story objects với fields: id, title, author, cover, genres, followed_at
 */
async function getFollowedStories(userId) {
    const followedStories = await prisma.followedStories.findMany({
        where: { user_id: userId },
        include: {
            story: {
                include: {
                    storyGenres: {
                        include: {
                            genre: true,
                        },
                    },
                },
            },
        },
        orderBy: {followed_at: 'desc',},
    })

    return followedStories.map(item => ({
        id: item.story.story_id,
        title: item.story.title,
        author: item.story.author,
        description: item.story.description,
        cover: item.story.cover,
        chapter_count: item.story.chapter_count,
        hot: item.story.hot,
        genres: item.story.storyGenres.map(sg => sg.genre.genre_name),
        followed_at: item.followed_at,
    }))
}

/**
 * TODO: Viết function getFollowedStoryIds (lighter version)
 * Gợi ý:
 * - Input: userId
 * - Process:
 *   1. Query prisma.followedStories.findMany()
 *   2. Chỉ select story_id: { select: { story_id: true } }
 *   3. Map để trả về array of IDs
 * - Return: [1, 5, 10, 23] (array of numbers)
 * - Use case: Dùng để sync với localStorage khi login
 */
async function getFollowedStoryIds(userId) {
    const followedStories = await prisma.followedStories.findMany({
        where: {user_id: userId},
        select: {story_id: true},
    })

    return followedStories.map(item => item.story_id);
}

/**
 * TODO: Viết function checkFollowing (check status)
 * Gợi ý:
 * - Input: userId, storyId
 * - Process:
 *   1. Query prisma.followedStories.findUnique()
 *   2. Check xem record có tồn tại không
 * - Return: true/false (boolean)
 * - Use case: StoryDetailPage cần biết có đang follow không để hiển thị button đúng
 */
async function checkFollowing(userId, storyId) {
    const story = await prisma.followedStories.findUnique({
        where: {
            user_id_story_id: {
                user_id: userId,
                story_id: storyId
            },
        },
    })

    if (!story) {
        return false;
    }

    return true;
}

module.exports = {
    followStory,
    unfollowStory,
    getFollowedStories,
    getFollowedStoryIds,
    checkFollowing,
};