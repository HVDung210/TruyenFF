const express = require('express');
const textDetectionController = require('../controllers/textDetectionController');

const router = express.Router();

/**
 * POST /api/text-detection/detect
 * Upload comic image và detect text trong các panels
 * 
 * Body (multipart/form-data):
 * - comicImage: File ảnh comic
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "panelCount": 3,
 *     "panels": [...],
 *     "annotatedImageBase64": "...",
 *     "totalTextDetected": 2,
 *     "allText": "...",
 *     "summary": {...}
 *   }
 * }
 */
router.post('/detect', textDetectionController.detectTextInComic);

/**
 * ROUTE MỚI
 * POST /api/text-detection/detect-multiple
 * Upload nhiều comic images và detect text
 */
router.post('/detect-multiple', textDetectionController.detectTextInComicMultiple);

/**
 * ROUTE MỚI
 * POST /api/text-detection/detect-from-data
 * Upload nhiều comic images và panel data
 */
router.post('/detect-from-data', textDetectionController.detectTextFromData);

/**
 * POST /api/text-detection/detect-url
 * Detect text trong comic image từ URL
 * 
 * Body:
 * {
 *   "imageUrl": "https://example.com/comic.jpg"
 * }
 */
router.post('/detect-url', textDetectionController.detectTextFromUrl);

/**
 * POST /api/text-detection/detect-panel
 * Detect text trong một panel cụ thể
 * 
 * Body:
 * {
 *   "imageUrl": "https://example.com/comic.jpg",
 *   "panel": {
 *     "x": 100,
 *     "y": 200,
 *     "w": 300,
 *     "h": 400
 *   }
 * }
 */
router.post('/detect-panel', textDetectionController.detectTextInPanel);

/**
 * POST /api/text-detection/batch-detect
 * Batch detect text trong nhiều images
 * 
 * Body:
 * {
 *   "imageUrls": [
 *     "https://example.com/comic1.jpg",
 *     "https://example.com/comic2.jpg"
 *   ]
 * }
 */
router.post('/batch-detect', textDetectionController.batchDetectText);

/**
 * GET /api/text-detection/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Text Detection Service is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

module.exports = router;
