const followService = require('../services/followService');

async function followStory(req, res) {
    try {
        const userId = req.user.userId;
        const storyId = req.params.storyId;

        const storyIdNum = parseInt(storyId);
        if (isNaN(storyIdNum)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid story ID',
            });
        }
        
        const result = await followService.followStory(userId, storyIdNum);

        return res.status(200).json({
            success: true,
            message: 'Followed successfully',
            data: {
                storyId: storyIdNum,
                followedAt: result.followed_at,
            }
        });
    } catch (error) {
        console.error('Error in followStory controller:', error);

        let statusCode = 500;
        let errorMessage = 'Server error';

        if (error.message === 'Story not found') {
            statusCode = 404;
            errorMessage = 'Story not found';
        }

        return res.status(statusCode).json({
            success: false,
            message: errorMessage,
        });
    }
}

/**
 * TODO: Viết controller unfollowStory
 * Gợi ý:
 * - Extract: userId từ req.user.userId, storyId từ req.params.storyId
 * - Validate: Check storyId có phải số không?
 * - Call service: await followService.unfollowStory(userId, storyIdNum)
 * - Success response: { success: true, message: "Đã bỏ theo dõi" }
 * - Error handling: 
 *   - "Bạn chưa theo dõi truyện này" → 404
 *   - Other errors → 500
 */
async function unfollowStory(req, res) {
    try {
        let userId = req.user.userId;
        let storyId = req.params.storyId;

        let storyIdNum = parseInt(storyId);
        if (isNaN(storyIdNum)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid story ID',
            });
        }

        await followService.unfollowStory(userId, storyIdNum);

        return res.status(200).json({
            success: true,
            message: 'Unfollowed successfully',
        });

    } catch (error) {
        console.error('Error in unfollowStory controller:', error);

        let statusCode = 500;
        let errorMessage = 'Server error';

        if (error.message === 'Bạn chưa theo dõi truyện này') {
            statusCode = 404;
            errorMessage = 'Bạn chưa theo dõi truyện này';
        }

        return res.status(statusCode).json({
            success: false,
            message: errorMessage,
        });
    }
}


/**
 * TODO: Viết controller getFollowedStories
 * Gợi ý:
 * - Extract: userId từ req.user.userId
 * - Call service: const stories = await followService.getFollowedStories(userId)
 * - Success response: { success: true, count: stories.length, stories }
 * - Error handling: catch và return 500
 * - No validation needed (userId đã verify qua middleware)
 */
async function getFollowedStories(req, res) {
    try {
        let userId = req.user.userId;

        const stories = await followService.getFollowedStories(userId);
        return res.status(200).json({
            success: true,
            count: stories.length,
            stories: stories,
        })
    } catch (error) {
        console.log('Error in getFollowedStories controller: ', error);

        return res.status(500).json({
            success: false,
            message: 'Server error',
        })
    }
}

/**
 * TODO: Viết controller getFollowedStoryIds
 * Gợi ý:
 * - Giống getFollowedStories nhưng response format khác
 * - Response: { success: true, storyIds: [1,5,10] }
 */
async function getFollowedStoryIds(req, res) {
    try {
        let userId = req.user.userId;

        const stories = await followService.getFollowedStoryIds(userId);
        return res.status(200).json({
            success: true,
            storyIds: stories,
        })
    } catch (error) {
        console.log('Error in getFollowedStoryIds:', error);

        return res.status(500).json({
            success: false,
            message: 'Server error',
        })
    }
}
/**
 * TODO: Viết controller checkFollowing
 * Gợi ý:
 * - Extract: userId từ req.user.userId, storyId từ req.params.storyId
 * - Validate: storyId
 * - Call service: const checkFollowing = await followService.checkFollowing(userId, storyIdNum)
 * - Response: { success: true, checkFollowing: true/false, storyId }
 */
async function checkFollowing(req, res) {
    // TODO: Viết code ở đây
    try {
        let userId = req.user.userId;
        let storyId = req.params.storyId;

        const storyIdNum = parseInt(storyId);
        if (isNaN(storyIdNum)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid story ID',
            });
        }

        const checkFollowing = await followService.checkFollowing(userId, storyIdNum);
        return res.status(200).json({
            success: true,
            checkFollowing: checkFollowing,
            storyId: storyIdNum
        })
    } catch (error) {
        console.log('Error in checkFollowing: ', error);

        return res.status(500).json({
            success: false,
            message: 'Server error',
        })
    }
}

module.exports = {
    followStory,
    unfollowStory,
    getFollowedStories,
    getFollowedStoryIds,
    checkFollowing,
}