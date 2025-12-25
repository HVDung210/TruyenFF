const express = require('express');
const router = express.Router();
const followController = require('../controllers/followController');
const { authenticateToken } = require('../middlewares/authMiddleware');

router.post(
    '/follow/:storyId',
    authenticateToken,
    followController.followStory
)

/**
 * TODO: Thêm route DELETE /follow/:storyId - Bỏ theo dõi truyện
 * Gợi ý:
 * - Method: DELETE
 * - Path: '/follow/:storyId'
 * - Middleware: authenticateToken
 * - Controller: followController.unfollowStory
 */
// router.delete('/follow/:storyId', authenticateToken, followController.unfollowStory);
router.post(
    '/unfollow/:storyId',
    authenticateToken,
    followController.unfollowStory
)

/**
 * TODO: Thêm route GET /followed-stories - Lấy danh sách truyện đang theo dõi
 * Gợi ý:
 * - Method: GET
 * - Path: '/followed-stories'
 * - Middleware: authenticateToken
 * - Controller: followController.getFollowedStories
 */
router.get('/followed-stories', authenticateToken, followController.getFollowedStories);

/**
 * TODO: Thêm route GET /followed-story-ids - Lấy danh sách ID (để sync)
 * Gợi ý:
 * - Method: GET
 * - Path: '/followed-story-ids'
 * - Middleware: authenticateToken
 * - Controller: followController.getFollowedStoryIds
 */
router.get('/followed-story-ids', authenticateToken, followController.getFollowedStoryIds);

/**
 * TODO: Thêm route GET /follow/:storyId/check - Kiểm tra đang theo dõi không
 * Gợi ý:
 * - Method: GET
 * - Path: '/follow/:storyId/check'
 * - Middleware: authenticateToken
 * - Controller: followController.checkFollowing
 */
router.get('/follow/:storyId/check', authenticateToken, followController.checkFollowing);

module.exports = router;